const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

const createBookingSchema = z.object({
  servicePublicId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  address: z.string().min(5),
  notes: z.string().max(2000).optional(),
});

async function addEvent(client, bookingId, actorUserId, eventType, metadata = {}) {
  await client.query(
    `INSERT INTO booking_events (booking_id, actor_user_id, event_type, metadata)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [bookingId, actorUserId || null, eventType, JSON.stringify(metadata)]
  );
}

router.post("/", requireAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { servicePublicId, startsAt, endsAt, address, notes } =
      createBookingSchema.parse(req.body);

    const userId = req.user.id;

    await client.query("BEGIN");

    const s = await client.query(
      `SELECT id FROM services WHERE public_id = $1 AND is_active = true`,
      [servicePublicId]
    );
    if (s.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "Invalid service" });
    }

    const serviceId = s.rows[0].id;

    const created = await client.query(
      `
      INSERT INTO bookings (customer_user_id, service_id, starts_at, ends_at, address, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, public_id, status, starts_at, ends_at, address, created_at
      `,
      [userId, serviceId, startsAt, endsAt, address, notes || null]
    );

    const booking = created.rows[0];

    await addEvent(client, booking.id, userId, "created", {});

    await client.query("COMMIT");

    res.status(201).json({ ok: true, booking });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    // DB-level double-booking protection
    if (e && e.code === "23P01") {
      return res.status(409).json({ ok: false, message: "Time slot unavailable" });
    }
    next(e);
  } finally {
    client.release();
  }
});

module.exports = router;