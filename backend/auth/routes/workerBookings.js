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

router.post("/:id/complete", requireAuth, requireRole("worker"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const bookingPublicId = req.params.id;
    const workerId = req.user.id;

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

    if (booking.status !== "assigned") {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Booking must be assigned first" });
    }

    // Ensure worker is assigned
    const a = await client.query(
      `SELECT 1 FROM booking_assignments WHERE booking_id = $1 AND worker_user_id = $2`,
      [booking.id, workerId]
    );
    if (a.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(403).json({ ok: false, message: "You are not assigned to this booking" });
    }

    const updated = await client.query(
      `UPDATE bookings
       SET status = 'completed', completed_at = now()
       WHERE id = $1
       RETURNING public_id, status, completed_at`,
      [booking.id]
    );

    await addEvent(client, booking.id, workerId, "completed", {});
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