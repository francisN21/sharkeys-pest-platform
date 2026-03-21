const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");
const { broadcastToRoles, broadcastToUser } = require("../src/realtime");
const { createNotifications } = require("../src/notifications");
const { sendBookingConfirmationEmail } = require("../src/email/mailer");

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

function isSundayFromIso(iso) {
  const d = new Date(iso);
  return d.getDay() === 0;
}

async function hasAvailabilityBlockConflict(client, startsAt, endsAt) {
  const r = await client.query(
    `
    SELECT 1
    FROM availability_blocks
    WHERE starts_at < $1::timestamptz
      AND ends_at > $2::timestamptz
    LIMIT 1
    `,
    [endsAt, startsAt]
  );

  return r.rowCount > 0;
}

async function assertBookingWindowAllowed(client, startsAt, endsAt) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const err = new Error("Invalid startsAt/endsAt");
    err.statusCode = 400;
    throw err;
  }

  if (end <= start) {
    const err = new Error("End time must be after start time");
    err.statusCode = 400;
    throw err;
  }

  if (isSundayFromIso(startsAt)) {
    const err = new Error("Bookings are not available on Sundays");
    err.statusCode = 409;
    throw err;
  }

  const blocked = await hasAvailabilityBlockConflict(client, startsAt, endsAt);
  if (blocked) {
    const err = new Error("Time slot unavailable");
    err.statusCode = 409;
    throw err;
  }
}

router.post("/", requireAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { servicePublicId, startsAt, endsAt, address, notes } =
      createBookingSchema.parse(req.body);

    const userId = req.user.id;

    await client.query("BEGIN");

    await assertBookingWindowAllowed(client, startsAt, endsAt);

    const s = await client.query(
      `SELECT id, title FROM services WHERE public_id = $1 AND is_active = true`,
      [servicePublicId]
    );
    if (s.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "Invalid service" });
    }

    const serviceId = s.rows[0].id;
    const serviceTitle = s.rows[0].title;

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

    const customerRes = await client.query(
      `SELECT email, first_name, last_name FROM users WHERE id = $1 LIMIT 1`,
      [userId]
    );

    const customerEmail = customerRes.rows[0]?.email ?? null;
    const customerFirstName = customerRes.rows[0]?.first_name ?? null;
    const customerName = [customerRes.rows[0]?.first_name, customerRes.rows[0]?.last_name]
      .filter(Boolean).join(" ").trim() || null;

    const adminUserIds = await getAdminAndSuperUserIds(client);

    const notificationRows = adminUserIds.map((adminUserId) => ({
      userId: adminUserId,
      kind: "booking.created",
      title: "New booking created",
      body: serviceTitle
        ? `New ${serviceTitle} booking from ${customerName ?? "a customer"}.`
        : "A new booking was created.",
      bookingId: booking.id,
      bookingPublicId: booking.public_id,
      metadata: { bookingPublicId: booking.public_id, serviceTitle, customerName, createdByUserId: userId },
    }));

    await createNotifications(client, notificationRows);

    await client.query("COMMIT");

    broadcastToRoles(["admin", "superuser"], {
      type: "booking.created",
      bookingId: booking.public_id,
      bookingName: serviceTitle,
      customerName,
      startsAt: booking.starts_at,
    });

    if (customerEmail) {
      await sendBookingConfirmationEmail({
        to: customerEmail,
        firstName: customerFirstName,
        bookingPublicId: booking.public_id,
        serviceTitle,
        startsAt: booking.starts_at,
        endsAt: booking.ends_at,
        address: booking.address,
        notes: booking.notes,
      });
    }

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

    if (e?.message === "Time slot unavailable") {
      return res.status(409).json({ ok: false, message: "Time slot unavailable" });
    }

    if (e?.message === "Bookings are not available on Sundays") {
      return res.status(409).json({ ok: false, message: "Bookings are not available on Sundays" });
    }

    if (e?.statusCode) {
      return res.status(e.statusCode).json({ ok: false, message: e.message });
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
      SELECT b.id, b.status, s.title AS service_title
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      WHERE b.public_id = $1 AND b.customer_user_id = $2
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

      await assertBookingWindowAllowed(client, payload.starts_at, payload.ends_at);
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

    const editServiceTitle = booking.service_title ?? null;

    const notificationRows = adminUserIds.map((adminUserId) => ({
      userId: adminUserId,
      kind: "booking.edited",
      title: "Booking updated",
      body: editServiceTitle
        ? `${editServiceTitle} booking has been updated.`
        : "A booking has been updated.",
      bookingId: booking.id,
      bookingPublicId: updatedBooking.public_id,
      metadata: {
        bookingPublicId: updatedBooking.public_id,
        serviceTitle: editServiceTitle,
        startsAt: updatedBooking.starts_at,
        endsAt: updatedBooking.ends_at,
      },
    }));

    await createNotifications(client, notificationRows);

    await client.query("COMMIT");

    broadcastToRoles(["admin", "superuser"], {
      type: "booking.edited",
      bookingId: updatedBooking.public_id,
      bookingName: editServiceTitle,
      startsAt: updatedBooking.starts_at,
      endsAt: updatedBooking.ends_at,
    });

    return res.json({ ok: true, booking: updatedBooking });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    if (e?.message === "Time slot unavailable") {
      return res.status(409).json({ ok: false, message: "Time slot unavailable" });
    }

    if (e?.message === "Bookings are not available on Sundays") {
      return res.status(409).json({ ok: false, message: "Bookings are not available on Sundays" });
    }

    if (e?.statusCode) {
      return res.status(e.statusCode).json({ ok: false, message: e.message });
    }

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
      SELECT b.id, b.status, s.title AS service_title
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      WHERE b.public_id = $1 AND b.customer_user_id = $2
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

    const cancelServiceTitle = booking.service_title ?? null;
    const cancelPublicId = updated.rows[0].public_id;
    const cancelledAt = updated.rows[0].cancelled_at;

    const notificationRows = adminUserIds.map((adminUserId) => ({
      userId: adminUserId,
      kind: "booking.cancelled",
      title: "Booking cancelled",
      body: cancelServiceTitle
        ? `${cancelServiceTitle} booking has been cancelled by the customer.`
        : "A booking has been cancelled by the customer.",
      bookingId: booking.id,
      bookingPublicId: cancelPublicId,
      metadata: { bookingPublicId: cancelPublicId, serviceTitle: cancelServiceTitle, cancelledByUserId: userId },
    }));

    if (workerUserId) {
      notificationRows.push({
        userId: workerUserId,
        kind: "booking.cancelled",
        title: "Booking cancelled",
        body: cancelServiceTitle
          ? `Your ${cancelServiceTitle} booking has been cancelled.`
          : "A booking has been cancelled.",
        bookingId: booking.id,
        bookingPublicId: cancelPublicId,
        metadata: { bookingPublicId: cancelPublicId, serviceTitle: cancelServiceTitle, cancelledByUserId: userId },
      });
    }

    await createNotifications(client, notificationRows);

    await client.query("COMMIT");

    broadcastToRoles(["admin", "superuser"], {
      type: "booking.cancelled",
      bookingId: cancelPublicId,
      cancelledAt,
      serviceTitle: cancelServiceTitle,
    });

    if (workerUserId) {
      broadcastToUser(workerUserId, {
        type: "booking.cancelled",
        bookingId: cancelPublicId,
        cancelledAt,
        serviceTitle: cancelServiceTitle,
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

router.get("/availability", async (req, res, next) => {
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

    const bookingRes = await pool.query(
      `
      SELECT
        public_id,
        starts_at,
        ends_at,
        status,
        'booking'::text AS source,
        NULL::text AS reason,
        NULL::text AS block_type
      FROM bookings
      WHERE status != 'cancelled'
        AND starts_at < $1::timestamptz
        AND ends_at > $2::timestamptz
      ORDER BY starts_at ASC
      `,
      [endUtcIso, startUtcIso]
    );

    const blockRes = await pool.query(
      `
      SELECT
        public_id,
        starts_at,
        ends_at,
        'blocked'::text AS status,
        'block'::text AS source,
        reason,
        block_type
      FROM availability_blocks
      WHERE starts_at < $1::timestamptz
        AND ends_at > $2::timestamptz
      ORDER BY starts_at ASC
      `,
      [endUtcIso, startUtcIso]
    );

    const localMidday = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0) + tzOffsetMinutes * 60_000);
    const isSunday = localMidday.getUTCDay() === 0;

    const intervals = [
      ...bookingRes.rows,
      ...blockRes.rows,
    ];

    if (isSunday) {
      intervals.push({
        public_id: `closed-${date}`,
        starts_at: startUtcIso,
        ends_at: endUtcIso,
        status: "blocked",
        source: "block",
        reason: "Closed on Sundays",
        block_type: "closed",
      });
    }

    intervals.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

    return res.json({
      ok: true,
      date,
      startUtc: startUtcIso,
      endUtc: endUtcIso,
      bookings: intervals,
      intervals,
      isClosedAllDay: isSunday,
      closedReason: isSunday ? "Closed on Sundays" : null,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;