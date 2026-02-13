const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

async function addEvent(client, bookingId, actorUserId, eventType, metadata = {}) {
  await client.query(
    `INSERT INTO booking_events (booking_id, actor_user_id, event_type, metadata)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [bookingId, actorUserId || null, eventType, JSON.stringify(metadata)]
  );
}

router.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  const status = String(req.query.status || "pending");

  try {
    const q = await pool.query(
      `
      SELECT
        b.public_id,
        b.status,
        b.starts_at,
        b.ends_at,
        b.address,
        b.created_at,
        b.accepted_at,
        b.completed_at,
        b.cancelled_at,
        b.notes,
        s.title AS service_title,
        b.assigned_worker_user_id,

        cu.public_id AS customer_public_id,
        cu.first_name AS customer_first_name,
        cu.last_name AS customer_last_name,
        cu.phone AS customer_phone,
        cu.email AS customer_email,
        cu.address AS customer_address,
        cu.account_type AS customer_account_type
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      JOIN users cu ON cu.id = b.customer_user_id
      WHERE b.status = $1
      ORDER BY b.created_at DESC
      LIMIT 200
      `,
      [status]
    );

    res.json({ ok: true, bookings: q.rows });
  } catch (e) {
    next(e);
  }
});

router.patch("/:publicId/cancel", requireAuth, requireRole("admin"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const lock = await client.query(
      `SELECT id, status FROM bookings WHERE public_id = $1 FOR UPDATE`,
      [req.params.publicId]
    );

    if (lock.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, message: "Booking not found" });
    }

    const b = lock.rows[0];

    // already done?
    if (b.status === "completed") {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Completed bookings cannot be cancelled" });
    }
    if (b.status === "cancelled") {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Booking is already cancelled" });
    }

    const updated = await client.query(
      `
      UPDATE bookings
      SET status = 'cancelled',
          cancelled_at = now(),
          updated_at = now()
      WHERE id = $1
      RETURNING public_id, status, cancelled_at
      `,
      [b.id]
    );

    await addEvent(client, b.id, req.user.id, "cancelled_by_admin", {});
    await client.query("COMMIT");

    return res.json({ ok: true, booking: updated.rows[0] });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    next(e);
  } finally {
    client.release();
  }
});

router.patch("/:publicId/accept", requireAuth, requireRole("admin"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const bookingPublicId = req.params.publicId;
    const adminId = req.user.id;

    await client.query("BEGIN");

    const b = await client.query(
      `SELECT id, status FROM bookings WHERE public_id = $1 FOR UPDATE`,
      [bookingPublicId]
    );
    if (b.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, message: "Booking not found" });
    }

    const booking = b.rows[0];

    if (booking.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Booking is not pending" });
    }

    const updated = await client.query(
      `
      UPDATE bookings
      SET status = 'accepted',
          accepted_at = now(),
          updated_at = now()
      WHERE id = $1
      RETURNING public_id, status, accepted_at
      `,
      [booking.id]
    );

    await addEvent(client, booking.id, adminId, "accepted", {});
    await client.query("COMMIT");

    res.json({ ok: true, booking: updated.rows[0] });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    next(e);
  } finally {
    client.release();
  }
});

const assignSchema = z.object({
  workerUserId: z.number().int().positive(),
});

router.patch("/:publicId/assign", requireAuth, requireRole("admin"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const bookingPublicId = req.params.publicId;
    const adminId = req.user.id;
    const { workerUserId } = assignSchema.parse(req.body);

    await client.query("BEGIN");

    const b = await client.query(
      `SELECT id, status FROM bookings WHERE public_id = $1 FOR UPDATE`,
      [bookingPublicId]
    );

    if (b.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, message: "Booking not found" });
    }

    const booking = b.rows[0];

    if (booking.status !== "accepted" && booking.status !== "assigned") {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Booking must be accepted first" });
    }

    // Confirm worker has worker role (DB role value is 'worker', not 'technician')
    const w = await client.query(
      `SELECT 1 FROM user_roles WHERE role = 'worker' AND user_id = $1`,
      [workerUserId]
    );
    if (w.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "Invalid technician (workerUserId)" });
    }

    // If you're using booking_assignments (recommended), store assignment there
    await client.query(
      `
      INSERT INTO booking_assignments (booking_id, worker_user_id, assigned_by_user_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (booking_id, worker_user_id) DO NOTHING
      `,
      [booking.id, workerUserId, adminId]
    );

    const updated = await client.query(
      `
      UPDATE bookings
      SET status = 'assigned',
          updated_at = now()
      WHERE id = $1
      RETURNING public_id, status
      `,
      [booking.id]
    );

    await addEvent(client, booking.id, adminId, "assigned", { workerUserId });

    await client.query("COMMIT");
    res.json({ ok: true, booking: updated.rows[0] });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    next(e);
  } finally {
    client.release();
  }
});

router.get("/technicians", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const r = await pool.query(
      `
      SELECT
        u.id,
        u.public_id,
        u.first_name,
        u.last_name,
        u.phone,
        u.email
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      WHERE ur.role = 'worker'
      ORDER BY u.last_name ASC, u.first_name ASC
      LIMIT 200
      `
    );

    res.json({ ok: true, technicians: r.rows });
  } catch (e) {
    next(e);
  }
});

module.exports = router;