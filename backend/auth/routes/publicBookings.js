const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { config } = require("../src/config");
const { broadcastToRoles } = require("../src/realtime");
const { createNotifications } = require("../src/notifications");
const {
  sendBookingCreatedCustomerEmail,
  sendLeadBookingInviteEmail,
} = require("../src/email/mailer");

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

function isSundayFromIso(iso) {
  const d = new Date(iso);
  return d.getDay() === 0;
}

function buildAppUrl(path, params = {}) {
  const baseUrl = String(config.APP_BASE_URL || "").trim();
  if (!baseUrl) return null;

  const url = new URL(path || "/", baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value) !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function buildSignupUrl(email) {
  const signupPath = String(
    process.env.PUBLIC_BOOKING_SIGNUP_PATH || "/signup"
  ).trim();

  return buildAppUrl(signupPath, email ? { email } : {});
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

    await assertBookingWindowAllowed(client, payload.startsAt, payload.endsAt);

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
      `SELECT id, title FROM services WHERE public_id = $1 AND is_active = true`,
      [payload.servicePublicId]
    );

    if (s.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "Invalid service" });
    }

    const serviceId = s.rows[0].id;
    const serviceTitle = s.rows[0].title;
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

    let matchedBy = "new";
    let bookingOwnerKind = "lead";
    let customerUserRow = null;
    let leadRow = null;

    // 1) Prefer existing registered user by email.
if (normalizedEmail) {
  const userRes = await client.query(
    `
    SELECT
      u.id,
      u.public_id,
      u.email,
      u.first_name,
      u.last_name,
      u.phone,
      u.address,
      u.account_type
    FROM users u
    WHERE u.email = $1
    LIMIT 1
    FOR UPDATE
    `,
    [normalizedEmail]
  );

  const existingUser = userRes.rows[0] || null;

  if (existingUser) {
      const rolesRes = await client.query(
        `
        SELECT role
        FROM user_roles
        WHERE user_id = $1
        `,
        [existingUser.id]
      );

      const roles = rolesRes.rows.map((r) =>
        String(r.role || "").trim().toLowerCase()
      );

      const isInternal =
        roles.includes("admin") ||
        roles.includes("superuser") ||
        roles.includes("worker");

      if (isInternal) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          ok: false,
          message: "This email belongs to an internal account and cannot use public booking",
        });
      }

      const updatedUserRes = await client.query(
        `
        UPDATE users
        SET
          first_name = COALESCE(NULLIF($2, ''), first_name),
          last_name = COALESCE(NULLIF($3, ''), last_name),
          phone = COALESCE(NULLIF($4, ''), phone),
          account_type = COALESCE($5, account_type),
          address = COALESCE(NULLIF($6, ''), address),
          updated_at = now()
        WHERE id = $1
        RETURNING id, public_id, email, first_name, last_name, phone, address, account_type
        `,
        [
          existingUser.id,
          lead.first_name || null,
          lead.last_name || null,
          lead.phone || null,
          lead.account_type || null,
          finalAddress || null,
        ]
      );

      customerUserRow = updatedUserRes.rows[0];
      matchedBy = "user_email";
      bookingOwnerKind = "registered";
    }
  }

    // 2) Fallback to lead matching / creation only when no registered user matched.
    if (!customerUserRow) {
      let existingLead = null;

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
          FOR UPDATE
          `,
          [normalizedEmail]
        );

        if (byEmail.rowCount > 0) {
          existingLead = byEmail.rows[0];
          matchedBy = "lead_email";
        }
      }

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
          FOR UPDATE
          `,
          [normalizedPhone]
        );

        if (byPhone.rowCount > 0) {
          existingLead = byPhone.rows[0];
          matchedBy = "lead_phone";
        }
      }

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
    }

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
        customerUserRow ? customerUserRow.id : null,
        leadRow ? leadRow.id : null,
        serviceId,
        payload.startsAt,
        payload.endsAt,
        finalAddress,
        payload.notes,
      ]
    );

    const booking = created.rows[0];

    await addEvent(client, booking.id, null, "created_public", {
      source: "public",
      ownerKind: bookingOwnerKind,
      customerUserPublicId: customerUserRow?.public_id || null,
      leadPublicId: leadRow?.public_id || null,
      leadEmail: normalizedEmail || null,
      matchedBy,
    });

    const adminUsersRes = await client.query(
      `
      SELECT DISTINCT ur.user_id
      FROM user_roles ur
      WHERE ur.role IN ('admin', 'superuser')
      `
    );

    const bookingContact = customerUserRow || leadRow;
    const contactName =
      [bookingContact?.first_name, bookingContact?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim() || null;

    const notificationRows = adminUsersRes.rows.map((r) => ({
      userId: r.user_id,
      kind: "booking.created",
      title: "New public booking",
      body: serviceTitle
        ? `New ${serviceTitle} booking from ${contactName ?? "a new customer"}.`
        : `New booking from ${contactName ?? "a new customer"}.`,
      bookingId: booking.id,
      bookingPublicId: booking.public_id,
      metadata: {
        bookingPublicId: booking.public_id,
        serviceTitle,
        customerName: contactName,
        source: "public",
        ownerKind: bookingOwnerKind,
        leadEmail: normalizedEmail,
        matchedBy,
      },
    }));

    await createNotifications(client, notificationRows);

    await client.query("COMMIT");

    broadcastToRoles(["admin", "superuser"], {
      type: "booking.created",
      bookingId: booking.public_id,
      bookingName: serviceTitle,
      customerName: contactName,
      startsAt: booking.starts_at,
      source: "public",
    });

    if (bookingContact?.email) {
      await sendBookingCreatedCustomerEmail({
        to: bookingContact.email,
        firstName: bookingContact.first_name,
        customerName: bookingContact.first_name,
        bookingPublicId: booking.public_id,
        serviceTitle,
        startsAt: booking.starts_at,
        endsAt: booking.ends_at,
        address: booking.address,
        notes: booking.notes,
      });
    }

    // Lead-only invite email for account creation.
    if (leadRow?.email) {
      const signupUrl = buildSignupUrl(leadRow.email);

      await sendLeadBookingInviteEmail({
        to: leadRow.email,
        firstName: leadRow.first_name,
        signupUrl,
        bookingPublicId: booking.public_id,
        serviceTitle,
        startsAt: booking.starts_at,
        endsAt: booking.ends_at,
        address: booking.address,
      });
    }

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
      customer_kind: bookingOwnerKind,
      customer: customerUserRow
        ? {
            public_id: customerUserRow.public_id,
            email: customerUserRow.email,
            first_name: customerUserRow.first_name,
            last_name: customerUserRow.last_name,
            phone: customerUserRow.phone ?? null,
            address: customerUserRow.address,
          }
        : null,
      lead: leadRow
        ? {
            public_id: leadRow.public_id,
            email: leadRow.email,
            first_name: leadRow.first_name,
            last_name: leadRow.last_name,
            phone: leadRow.phone ?? null,
            address: leadRow.address,
          }
        : null,
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

    if (e?.message === "Time slot unavailable") {
      return res.status(409).json({ ok: false, message: "Time slot unavailable" });
    }

    if (e?.message === "Bookings are not available on Sundays") {
      return res.status(409).json({ ok: false, message: "Bookings are not available on Sundays" });
    }

    if (e?.code === "23505") {
      return res.status(409).json({
        ok: false,
        message: "A booking account conflict occurred for this email",
      });
    }

    if (e?.statusCode) {
      return res.status(e.statusCode).json({ ok: false, message: e.message });
    }

    next(e);
  } finally {
    client.release();
  }
});

module.exports = router;