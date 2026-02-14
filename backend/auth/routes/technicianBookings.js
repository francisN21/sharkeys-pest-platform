const express = require("express");
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

/**
 * GET /technician/bookings/assigned
 * Returns bookings assigned to the logged-in worker that are still in 'assigned' status.
 */
router.get("/assigned", requireAuth, requireRole("worker"), async (req, res, next) => {
  try {
    const q = await pool.query(
      `
      SELECT
        b.public_id,
        b.status,
        b.starts_at,
        b.ends_at,
        b.address,
        b.notes,
        b.created_at,
        b.accepted_at,
        b.completed_at,
        b.cancelled_at,
        s.title AS service_title,

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
      WHERE b.status = 'assigned'
        AND EXISTS (
          SELECT 1
          FROM booking_assignments ba
          WHERE ba.booking_id = b.id
            AND ba.worker_user_id = $1
        )
      ORDER BY b.starts_at ASC
      LIMIT 200
      `,
      [req.user.id]
    );

    res.json({ ok: true, bookings: q.rows });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /technician/bookings/history
 * Returns completed bookings for the logged-in worker.
 */
router.get("/history", requireAuth, requireRole("worker"), async (req, res, next) => {
  try {
    const q = await pool.query(
      `
      SELECT
        b.public_id,
        b.status,
        b.starts_at,
        b.ends_at,
        b.address,
        b.notes,
        b.created_at,
        b.accepted_at,
        b.completed_at,
        b.cancelled_at,
        s.title AS service_title,

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
      WHERE b.status = 'completed'
        AND EXISTS (
          SELECT 1
          FROM booking_assignments ba
          WHERE ba.booking_id = b.id
            AND ba.worker_user_id = $1
        )
      ORDER BY b.completed_at DESC NULLS LAST, b.starts_at DESC
      LIMIT 200
      `,
      [req.user.id]
    );

    res.json({ ok: true, bookings: q.rows });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /technician/bookings/:publicId/complete
 * Marks an assigned booking as completed by the logged-in worker.
 */
router.patch("/:publicId/complete", requireAuth, requireRole("worker"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const lock = await client.query(
      `
      SELECT b.id, b.status
      FROM bookings b
      WHERE b.public_id = $1
      FOR UPDATE
      `,
      [req.params.publicId]
    );

    if (lock.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, message: "Booking not found" });
    }

    const booking = lock.rows[0];

    if (booking.status !== "assigned") {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Booking is not assigned" });
    }

    // Must be assigned to THIS worker
    const assigned = await client.query(
      `
      SELECT 1
      FROM booking_assignments ba
      WHERE ba.booking_id = $1
        AND ba.worker_user_id = $2
      `,
      [booking.id, req.user.id]
    );

    if (assigned.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({ ok: false, message: "Not assigned to this technician" });
    }

    const updated = await client.query(
      `
      UPDATE bookings
      SET status = 'completed',
          completed_at = now(),
          updated_at = now()
      WHERE id = $1
      RETURNING public_id, status, completed_at
      `,
      [booking.id]
    );

    await addEvent(client, booking.id, req.user.id, "completed_by_worker", {});
    await client.query("COMMIT");

    res.json({ ok: true, booking: updated.rows[0] });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    next(e);
  } finally {
    client.release();
  }
});

module.exports = router;