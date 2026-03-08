const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");
const { broadcastToRoles, broadcastToUser } = require("../src/realtime");
const { createNotifications } = require("../src/notifications");

const router = express.Router();

const createBookingSchema = z
  .object({
    servicePublicId: z.string().uuid(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    address: z.string().min(5),
    notes: z.string().max(2000).optional(),
    customerPublicId: z.string().uuid().optional(),
    lead: z
      .object({
        email: z.string().email(),
        first_name: z.string().min(1).optional(),
        last_name: z.string().min(1).optional(),
        phone: z.string().min(5).optional(),
        account_type: z.enum(["residential", "business"]).optional(),
        address: z.string().min(5),
      })
      .optional(),
    addressOverride: z.string().min(5).optional(),
  })
  .superRefine((x, ctx) => {
    if (x.customerPublicId && x.lead) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [],
        message: "Provide either customerPublicId OR lead (not both)",
      });
    }
  });

const updateBookingSchema = z.object({
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

async function addEvent(client, bookingId, actorUserId, eventType, metadata = {}) {
  await client.query(
    `INSERT INTO booking_events (booking_id, actor_user_id, event_type, metadata)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [bookingId, actorUserId || null, eventType, JSON.stringify(metadata)]
  );
}

async function getAdminAndSuperUserIds(client) {
  const r = await client.query(
    `
    SELECT DISTINCT user_id
    FROM user_roles
    WHERE role IN ('admin', 'superuser')
    `
  );

  return r.rows
    .map((row) => Number(row.user_id))
    .filter((x) => Number.isInteger(x) && x > 0);
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
      RETURNING id, public_id, status, starts_at, ends_at, address, notes, created_at
      `,
      [userId, serviceId, startsAt, endsAt, address, notes || null]
    );

    const booking = created.rows[0];

    await addEvent(client, booking.id, userId, "created", {});

    const adminUserIds = await getAdminAndSuperUserIds(client);

    const notificationRows = adminUserIds.map((adminUserId) => ({
      userId: adminUserId,
      kind: "booking.created",
      title: "New booking created",
      body: `Customer created booking ${booking.public_id}.`,
      bookingId: booking.id,
      bookingPublicId: booking.public_id,
      metadata: {
        bookingPublicId: booking.public_id,
        createdByUserId: userId,
      },
    }));

    await createNotifications(client, notificationRows);

    await client.query("COMMIT");

    broadcastToRoles(["admin", "superuser"], {
      type: "booking.created",
      bookingId: booking.public_id,
      startsAt: booking.starts_at,
    });

    return res.status(201).json({
      ok: true,
      booking: {
        id: booking.id,
        public_id: booking.public_id,
        status: booking.status,
        starts_at: booking.starts_at,
        ends_at: booking.ends_at,
        address: booking.address,
        notes: booking.notes ?? null,
        created_at: booking.created_at,
      },
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    if (e && e.code === "23P01") {
      return res.status(409).json({ ok: false, message: "Time slot unavailable" });
    }
    next(e);
  } finally {
    client.release();
  }
});

router.patch("/:publicId", requireAuth, requireRole("customer"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const bookingPublicId = req.params.publicId;
    const userId = req.user.id;
    const payload = updateBookingSchema.parse(req.body);

    await client.query("BEGIN");

    const bRes = await client.query(
      `
      SELECT id, status
      FROM bookings
      WHERE public_id = $1 AND customer_user_id = $2
      FOR UPDATE
      `,
      [bookingPublicId, userId]
    );

    if (bRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, message: "Booking not found" });
    }

    const booking = bRes.rows[0];

    if (!["pending", "accepted"].includes(booking.status)) {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "This booking can no longer be edited" });
    }

    const wantsScheduleChange = payload.starts_at || payload.ends_at;
    if (booking.status === "accepted" && wantsScheduleChange) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        ok: false,
        message: "Schedule cannot be changed after acceptance",
      });
    }

    if (booking.status === "pending" && wantsScheduleChange) {
      if (!payload.starts_at || !payload.ends_at) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          ok: false,
          message: "Both starts_at and ends_at are required to change schedule",
        });
      }

      const startsAt = new Date(payload.starts_at);
      const endsAt = new Date(payload.ends_at);

      if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
        await client.query("ROLLBACK");
        return res.status(400).json({ ok: false, message: "Invalid starts_at/ends_at" });
      }

      if (endsAt <= startsAt) {
        await client.query("ROLLBACK");
        return res.status(400).json({ ok: false, message: "End time must be after start time" });
      }
    }

    const sets = [];
    const params = [];
    let p = 1;

    if (booking.status === "pending" && wantsScheduleChange) {
      sets.push(`starts_at = $${p++}::timestamptz`);
      params.push(payload.starts_at);

      sets.push(`ends_at = $${p++}::timestamptz`);
      params.push(payload.ends_at);
    }

    if ("notes" in payload) {
      sets.push(`notes = $${p++}`);
      params.push(payload.notes ?? null);
    }

    if (sets.length === 0) {
      await client.query("ROLLBACK");
      return res.json({ ok: true });
    }

    sets.push(`updated_at = now()`);
    params.push(booking.id);

    const upd = await client.query(
      `
      UPDATE bookings
      SET ${sets.join(", ")}
      WHERE id = $${p++}
      RETURNING public_id, status, starts_at, ends_at, notes, updated_at
      `,
      params
    );

    const updatedBooking = upd.rows[0];

    await addEvent(client, booking.id, userId, "edited", {
      starts_at: updatedBooking.starts_at,
      ends_at: updatedBooking.ends_at,
      notes: updatedBooking.notes,
    });

    const adminUserIds = await getAdminAndSuperUserIds(client);

    const notificationRows = adminUserIds.map((adminUserId) => ({
      userId: adminUserId,
      kind: "booking.edited",
      title: "Booking updated",
      body: `Customer updated booking ${updatedBooking.public_id}.`,
      bookingId: booking.id,
      bookingPublicId: updatedBooking.public_id,
      metadata: {
        bookingPublicId: updatedBooking.public_id,
        startsAt: updatedBooking.starts_at,
        endsAt: updatedBooking.ends_at,
      },
    }));

    await createNotifications(client, notificationRows);

    await client.query("COMMIT");

    broadcastToRoles(["admin", "superuser"], {
      type: "booking.edited",
      bookingId: updatedBooking.public_id,
      startsAt: updatedBooking.starts_at,
      endsAt: updatedBooking.ends_at,
    });

    return res.json({ ok: true, booking: updatedBooking });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    next(e);
  } finally {
    client.release();
  }
});

router.patch("/:publicId/cancel", requireAuth, requireRole("customer"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const publicId = req.params.publicId;

    await client.query("BEGIN");

    const b = await client.query(
      `
      SELECT id, status
      FROM bookings
      WHERE public_id = $1 AND customer_user_id = $2
      FOR UPDATE
      `,
      [publicId, userId]
    );

    if (b.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, message: "Booking not found" });
    }

    const booking = b.rows[0];

    if (booking.status === "completed") {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Completed bookings cannot be cancelled" });
    }
    if (booking.status === "cancelled") {
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
      [booking.id]
    );

    await addEvent(client, booking.id, userId, "cancelled", {});

    const participantsRes = await client.query(
      `
      SELECT ba.worker_user_id
      FROM booking_assignments ba
      WHERE ba.booking_id = $1
      LIMIT 1
      `,
      [booking.id]
    );

    const workerUserId = participantsRes.rows[0]?.worker_user_id ?? null;
    const adminUserIds = await getAdminAndSuperUserIds(client);

    const notificationRows = adminUserIds.map((adminUserId) => ({
      userId: adminUserId,
      kind: "booking.cancelled",
      title: "Booking cancelled",
      body: `Customer cancelled booking ${updated.rows[0].public_id}.`,
      bookingId: booking.id,
      bookingPublicId: updated.rows[0].public_id,
      metadata: {
        bookingPublicId: updated.rows[0].public_id,
        cancelledByUserId: userId,
      },
    }));

    if (workerUserId) {
      notificationRows.push({
        userId: workerUserId,
        kind: "booking.cancelled",
        title: "Booking cancelled",
        body: `Booking ${updated.rows[0].public_id} has been cancelled.`,
        bookingId: booking.id,
        bookingPublicId: updated.rows[0].public_id,
        metadata: {
          bookingPublicId: updated.rows[0].public_id,
          cancelledByUserId: userId,
        },
      });
    }

    await createNotifications(client, notificationRows);

    await client.query("COMMIT");

    broadcastToRoles(["admin", "superuser"], {
      type: "booking.cancelled",
      bookingId: updated.rows[0].public_id,
      cancelledAt: updated.rows[0].cancelled_at,
    });

    if (workerUserId) {
      broadcastToUser(workerUserId, {
        type: "booking.cancelled",
        bookingId: updated.rows[0].public_id,
        cancelledAt: updated.rows[0].cancelled_at,
      });
    }

    return res.json({ ok: true, booking: updated.rows[0] });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    next(e);
  } finally {
    client.release();
  }
});

router.get("/availability", requireAuth, async (req, res, next) => {
  try {
    const date = String(req.query.date || "").trim();
    const tzOffsetMinutes = Number(req.query.tzOffsetMinutes ?? NaN);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ ok: false, message: "Invalid date (expected YYYY-MM-DD)" });
    }
    if (!Number.isFinite(tzOffsetMinutes)) {
      return res.status(400).json({ ok: false, message: "Invalid tzOffsetMinutes" });
    }

    const [yStr, mStr, dStr] = date.split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    const d = Number(dStr);

    const startUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0, 0) + tzOffsetMinutes * 60_000;
    const endUtcMs = startUtcMs + 24 * 60 * 60_000;

    const startUtcIso = new Date(startUtcMs).toISOString();
    const endUtcIso = new Date(endUtcMs).toISOString();

    const r = await pool.query(
      `
      SELECT public_id, starts_at, ends_at, status
      FROM bookings
      WHERE status != 'cancelled'
        AND starts_at < $1::timestamptz
        AND ends_at > $2::timestamptz
      ORDER BY starts_at ASC
      `,
      [endUtcIso, startUtcIso]
    );

    return res.json({
      ok: true,
      date,
      startUtc: startUtcIso,
      endUtc: endUtcIso,
      bookings: r.rows,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;