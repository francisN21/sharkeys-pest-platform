const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { broadcastToRoles } = require("../src/realtime");
const { createNotifications } = require("../src/notifications");

const router = express.Router();

async function addEvent(client, bookingId, actorUserId, eventType, metadata = {}) {
  await client.query(
    `INSERT INTO booking_events (booking_id, actor_user_id, event_type, metadata)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [bookingId, actorUserId || null, eventType, JSON.stringify(metadata)]
  );
}

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}

function normalizePhone(v) {
  return String(v || "").replace(/\D/g, "");
}

const publicCreateBookingSchema = z.object({
  servicePublicId: z.string().uuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  notes: z.string().trim().min(1).max(2000),

  address: z.string().trim().min(5),

  lead: z.object({
    email: z.string().trim().email(),
    first_name: z.string().trim().min(1),
    last_name: z.string().trim().min(1),
    phone: z.string().trim().min(5).optional(),
    account_type: z.enum(["residential", "business"]).optional(),
    address: z.string().trim().min(5),
  }),
});

router.post("/", async (req, res, next) => {
  const client = await pool.connect();

  try {
    const payload = publicCreateBookingSchema.parse(req.body);

    await client.query("BEGIN");

    // Block internal staff from using the public booking route
    if (req.user?.id) {
      const roleRes = await client.query(
        `SELECT role FROM user_roles WHERE user_id = $1`,
        [req.user.id]
      );

      const roles = roleRes.rows.map((r) => String(r.role).trim().toLowerCase());
      const isPrivileged =
        roles.includes("admin") ||
        roles.includes("superuser") ||
        roles.includes("worker");

      if (isPrivileged) {
        await client.query("ROLLBACK");
        return res.status(403).json({
          ok: false,
          message: "Internal users cannot use public booking",
        });
      }
    }

    const s = await client.query(
      `SELECT id FROM services WHERE public_id = $1 AND is_active = true`,
      [payload.servicePublicId]
    );

    if (s.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "Invalid service" });
    }

    const serviceId = s.rows[0].id;
    const lead = payload.lead;

    const finalAddress =
      String(payload.address || "").trim() ||
      String(lead.address || "").trim();

    if (!finalAddress || finalAddress.length < 5) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        ok: false,
        message: "Address is required",
      });
    }

    const normalizedEmail = normalizeEmail(lead.email);
    const normalizedPhone = normalizePhone(lead.phone);

    let existingLead = null;
    let matchedBy = "new";

    // 1) Match by email first
    if (normalizedEmail) {
      const byEmail = await client.query(
        `
        SELECT
          id,
          public_id,
          email,
          first_name,
          last_name,
          phone,
          address,
          account_type
        FROM leads
        WHERE lower(email) = $1
        LIMIT 1
        `,
        [normalizedEmail]
      );

      if (byEmail.rowCount > 0) {
        existingLead = byEmail.rows[0];
        matchedBy = "email";
      }
    }

    // 2) If no email match, match by normalized phone
    if (!existingLead && normalizedPhone) {
      const byPhone = await client.query(
        `
        SELECT
          id,
          public_id,
          email,
          first_name,
          last_name,
          phone,
          address,
          account_type
        FROM leads
        WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = $1
        LIMIT 1
        `,
        [normalizedPhone]
      );

      if (byPhone.rowCount > 0) {
        existingLead = byPhone.rows[0];
        matchedBy = "phone";
      }
    }

    let leadRow;

    if (existingLead) {
      const updatedLead = await client.query(
        `
        UPDATE leads
        SET
          email = COALESCE($2, email),
          first_name = COALESCE($3, first_name),
          last_name = COALESCE($4, last_name),
          phone = COALESCE($5, phone),
          account_type = COALESCE($6, account_type),
          address = COALESCE($7, address),
          updated_at = now()
        WHERE id = $1
        RETURNING id, public_id, email, first_name, last_name, phone, address, account_type
        `,
        [
          existingLead.id,
          normalizedEmail || null,
          lead.first_name || null,
          lead.last_name || null,
          lead.phone || null,
          lead.account_type || null,
          finalAddress || null,
        ]
      );

      leadRow = updatedLead.rows[0];
    } else {
      const insertedLead = await client.query(
        `
        INSERT INTO leads (email, first_name, last_name, phone, account_type, address)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, public_id, email, first_name, last_name, phone, address, account_type
        `,
        [
          normalizedEmail,
          lead.first_name,
          lead.last_name,
          lead.phone || null,
          lead.account_type || null,
          finalAddress,
        ]
      );

      leadRow = insertedLead.rows[0];
    }

    const leadId = leadRow.id;

    const created = await client.query(
      `
      INSERT INTO bookings (
        customer_user_id,
        lead_id,
        service_id,
        starts_at,
        ends_at,
        address,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, public_id, status, starts_at, ends_at, address, notes, created_at
      `,
      [
        null,
        leadId,
        serviceId,
        payload.startsAt,
        payload.endsAt,
        finalAddress,
        payload.notes,
      ]
    );

    const booking = created.rows[0];

    await addEvent(client, booking.id, null, "created_public", {
      leadEmail: normalizedEmail,
      leadPublicId: leadRow.public_id,
      matchedBy,
    });

    const adminUsersRes = await client.query(
      `
      SELECT DISTINCT ur.user_id
      FROM user_roles ur
      WHERE ur.role IN ('admin', 'superuser')
      `
    );

    const notificationRows = adminUsersRes.rows.map((r) => ({
      userId: r.user_id,
      kind: "booking.created",
      title: "New public booking",
      body: `A new booking ${booking.public_id} was created by a new customer.`,
      bookingId: booking.id,
      bookingPublicId: booking.public_id,
      metadata: {
        bookingPublicId: booking.public_id,
        source: "public",
        leadEmail: normalizedEmail,
        matchedBy,
      },
    }));

    await createNotifications(client, notificationRows);

    await client.query("COMMIT");

    broadcastToRoles(["admin", "superuser"], {
      type: "booking.created",
      bookingId: booking.public_id,
      startsAt: booking.starts_at,
      source: "public",
    });

    return res.status(201).json({
      ok: true,
      booking: {
        public_id: booking.public_id,
        status: booking.status,
        starts_at: booking.starts_at,
        ends_at: booking.ends_at,
        address: booking.address,
        notes: booking.notes ?? null,
        created_at: booking.created_at,
      },
      lead: {
        public_id: leadRow.public_id,
        email: leadRow.email,
        first_name: leadRow.first_name,
        last_name: leadRow.last_name,
        phone: leadRow.phone ?? null,
        address: leadRow.address,
      },
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    if (e && e.code === "23P01") {
      return res.status(409).json({
        ok: false,
        message: "Time slot unavailable",
      });
    }

    next(e);
  } finally {
    client.release();
  }
});

module.exports = router;