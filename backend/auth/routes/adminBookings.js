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

router.post("/:id/accept", requireAuth, requireRole("admin"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const bookingPublicId = req.params.id;
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
          accepted_at = now()
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
  workerUserIds: z.array(z.number().int().positive()).min(1),
});

router.post("/:id/assign", requireAuth, requireRole("admin"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const bookingPublicId = req.params.id;
    const adminId = req.user.id;
    const { workerUserIds } = assignSchema.parse(req.body);

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

    // Confirm each worker has worker role
    const w = await client.query(
      `SELECT user_id FROM user_roles WHERE role = 'worker' AND user_id = ANY($1::bigint[])`,
      [workerUserIds]
    );
    const okWorkers = new Set(w.rows.map((x) => Number(x.user_id)));
    const invalid = workerUserIds.filter((id) => !okWorkers.has(id));

    if (invalid.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: `Invalid worker id(s): ${invalid.join(", ")}` });
    }

    for (const workerId of workerUserIds) {
      await client.query(
        `
        INSERT INTO booking_assignments (booking_id, worker_user_id, assigned_by_user_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (booking_id, worker_user_id) DO NOTHING
        `,
        [booking.id, workerId, adminId]
      );
    }

    const updated = await client.query(
      `UPDATE bookings SET status = 'assigned' WHERE id = $1 RETURNING public_id, status`,
      [booking.id]
    );

    await addEvent(client, booking.id, adminId, "assigned", { workerUserIds });

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