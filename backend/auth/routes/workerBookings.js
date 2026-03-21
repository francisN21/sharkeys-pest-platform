const express = require("express");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");
const { broadcastToBookingParticipants } = require("../src/realtime");
const { createNotifications } = require("../src/notifications");
const { sendBookingCompletedCustomerEmail } = require("../src/email/mailer");

const router = express.Router();

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

/**
 * GET /worker/bookings/assigned
 * Bookings currently assigned to this worker.
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
        cu.account_type AS customer_account_type,

        l.public_id AS lead_public_id,
        l.first_name AS lead_first_name,
        l.last_name AS lead_last_name,
        l.email AS lead_email,
        l.phone AS lead_phone,
        l.account_type AS lead_account_type

      FROM bookings b
      JOIN booking_assignments ba ON ba.booking_id = b.id
      JOIN services s ON s.id = b.service_id
      LEFT JOIN users cu ON cu.id = b.customer_user_id
      LEFT JOIN leads l ON l.id = b.lead_id

      WHERE b.status = 'assigned'
        AND ba.worker_user_id = $1

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
 * GET /worker/bookings/history
 * Completed bookings for this worker (permanent).
 */
router.get("/history", requireAuth, requireRole("worker"), async (req, res, next) => {
  try {
    const pageSize = Math.max(1, Math.min(30, Number(req.query.pageSize ?? 30)));
    const page = Math.max(1, Number(req.query.page ?? 1));
    const offset = (page - 1) * pageSize;

    const countRes = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM bookings b
      WHERE b.status = 'completed'
        AND b.completed_worker_user_id = $1
      `,
      [req.user.id]
    );

    const total = countRes.rows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
        cu.account_type AS customer_account_type,

        l.public_id AS lead_public_id,
        l.first_name AS lead_first_name,
        l.last_name AS lead_last_name,
        l.email AS lead_email,
        l.phone AS lead_phone,
        l.account_type AS lead_account_type

      FROM bookings b
      JOIN services s ON s.id = b.service_id
      LEFT JOIN users cu ON cu.id = b.customer_user_id
      LEFT JOIN leads l ON l.id = b.lead_id

      WHERE b.status = 'completed'
        AND b.completed_worker_user_id = $1

      ORDER BY b.completed_at DESC NULLS LAST, b.starts_at DESC
      LIMIT $2
      OFFSET $3
      `,
      [req.user.id, pageSize, offset]
    );

    res.json({
      ok: true,
      bookings: q.rows,
      page,
      pageSize,
      total,
      totalPages,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /worker/bookings/:id/complete
 * Marks an assigned booking as completed by the logged-in worker.
 */
router.patch("/:id/complete", requireAuth, requireRole("worker"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const bookingPublicId = req.params.id;
    const workerId = req.user.id;

    await client.query("BEGIN");

    const b = await client.query(
      `
      SELECT id, status, completed_worker_user_id, customer_user_id
      FROM bookings
      WHERE public_id = $1
      FOR UPDATE
      `,
      [bookingPublicId]
    );

    if (b.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, message: "Booking not found" });
    }

    const booking = b.rows[0];

    if (booking.status === "completed") {
      await client.query("COMMIT");
      return res.json({
        ok: true,
        booking: { public_id: bookingPublicId, status: "completed" },
      });
    }

    if (booking.status !== "assigned") {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Booking must be assigned first" });
    }

    const a = await client.query(
      `SELECT worker_user_id FROM booking_assignments WHERE booking_id = $1 LIMIT 1`,
      [booking.id]
    );
    if (a.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "This booking has no technician assignment" });
    }

    const assignedWorkerId = Number(a.rows[0].worker_user_id);
    if (assignedWorkerId !== Number(workerId)) {
      await client.query("ROLLBACK");
      return res.status(403).json({ ok: false, message: "You are not assigned to this booking" });
    }

    const updated = await client.query(
      `
      UPDATE bookings
      SET status = 'completed',
          completed_at = COALESCE(completed_at, now()),
          completed_worker_user_id = COALESCE(completed_worker_user_id, $2),
          updated_at = now()
      WHERE id = $1
      RETURNING public_id, status, completed_at, completed_worker_user_id
      `,
      [booking.id, workerId]
    );

    await addEvent(client, booking.id, workerId, "completed", {
      completed_worker_user_id: workerId,
    });

    const enrichRes = await client.query(
      `
      SELECT
        u.first_name AS worker_first_name,
        u.last_name AS worker_last_name,
        bp.final_price_cents,
        s.title AS service_title,
        cu.email AS customer_email,
        cu.first_name AS customer_first_name,
        l.email AS lead_email,
        l.first_name AS lead_first_name
      FROM bookings b
      LEFT JOIN users u ON u.id = b.completed_worker_user_id
      LEFT JOIN booking_prices bp ON bp.booking_id = b.id
      LEFT JOIN services s ON s.id = b.service_id
      LEFT JOIN users cu ON cu.id = b.customer_user_id
      LEFT JOIN leads l ON l.id = b.lead_id
      WHERE b.id = $1
      LIMIT 1
      `,
      [booking.id]
    );

    const enrich = enrichRes.rows[0] ?? null;
    const technicianName = enrich
      ? [enrich.worker_first_name, enrich.worker_last_name].filter(Boolean).join(" ").trim() || null
      : null;

    const finalPriceCents =
      enrich?.final_price_cents === null || enrich?.final_price_cents === undefined
        ? undefined
        : Number(enrich.final_price_cents);

    const serviceTitle = enrich?.service_title ?? null;
    const emailTo = enrich?.customer_email || enrich?.lead_email || null;
    const firstNameForEmail = enrich?.customer_first_name || enrich?.lead_first_name || null;

    const adminUserIds = await getAdminAndSuperUserIds(client);

    const priceLabel =
      typeof finalPriceCents === "number"
        ? ` for $${(finalPriceCents / 100).toFixed(2)}`
        : "";

    const notificationRows = adminUserIds.map((adminUserId) => ({
      userId: adminUserId,
      kind: "booking.completed",
      title: "Booking completed",
      body: serviceTitle
        ? `${serviceTitle}${technicianName ? ` completed by ${technicianName}` : " completed"}${priceLabel}.`
        : `Booking completed${technicianName ? ` by ${technicianName}` : ""}${priceLabel}.`,
      bookingId: booking.id,
      bookingPublicId,
      metadata: {
        bookingPublicId,
        serviceTitle,
        completedByUserId: workerId,
        technicianName,
        finalPriceCents,
      },
    }));

    if (booking.customer_user_id) {
      notificationRows.push({
        userId: booking.customer_user_id,
        kind: "booking.completed",
        title: "Your booking is complete",
        body: serviceTitle
          ? `Your ${serviceTitle} has been completed${technicianName ? ` by ${technicianName}` : ""}${priceLabel}.`
          : `Your booking has been completed${technicianName ? ` by ${technicianName}` : ""}${priceLabel}.`,
        bookingId: booking.id,
        bookingPublicId,
        metadata: {
          bookingPublicId,
          serviceTitle,
          completedByUserId: workerId,
          technicianName,
          finalPriceCents,
        },
      });
    }

    await createNotifications(client, notificationRows);

    await client.query("COMMIT");

    await broadcastToBookingParticipants(
      pool,
      booking.id,
      {
        type: "booking.completed",
        bookingId: bookingPublicId,
        bookingName: serviceTitle,
        completedAt: updated.rows[0].completed_at,
        technicianName,
        finalPriceCents,
      },
      {
        includeAdminRoles: true,
        excludeUserIds: [workerId],
      }
    );

    if (emailTo) {
      try {
        await sendBookingCompletedCustomerEmail({
          to: emailTo,
          firstName: firstNameForEmail,
          bookingPublicId,
          serviceTitle,
          completedAt: updated.rows[0].completed_at,
          technicianName,
          finalPriceCents,
        });
      } catch (emailErr) {
        console.error("Booking completion succeeded but customer email failed:", emailErr);
      }
    }

    res.json({ ok: true, booking: updated.rows[0] });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    next(e);
  } finally {
    client.release();
  }
});

module.exports = router;