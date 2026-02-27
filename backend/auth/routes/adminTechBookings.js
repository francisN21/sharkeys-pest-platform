// backend/auth/routes/adminTechBookings.js
const express = require("express");
const { pool } = require("../src/db");
const { z } = require("zod");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

async function getRolesByDb(userId) {
  const rolesRes = await pool.query(`SELECT role FROM user_roles WHERE user_id = $1`, [userId]);
  return rolesRes.rows
    .map((r) => String(r.role || "").trim().toLowerCase())
    .filter(Boolean);
}

async function requireAdminOrSuperByDb(userId) {
  const roles = await getRolesByDb(userId);
  return roles.includes("admin") || roles.includes("superuser");
}

const reassignSchema = z.object({
  worker_user_id: z
    .union([z.number().int().positive(), z.string().regex(/^\d+$/)])
    .transform((v) => Number(v)),
});

/* -----------------------------------------
   LIST: /admin/tech-bookings
------------------------------------------ */
router.get("/admin/tech-bookings", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const ok = await requireAdminOrSuperByDb(userId);
    if (!ok) return res.status(403).json({ ok: false, message: "Forbidden" });

    // 1) tech list (workers)
    const techRes = await pool.query(
      `
      SELECT u.id AS user_id, u.public_id, u.email, u.first_name, u.last_name, u.phone
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      WHERE ur.role = 'worker'
      ORDER BY u.last_name NULLS LAST, u.first_name NULLS LAST, u.email
      `
    );

    // 2) assigned bookings (current assignment only)
    // IMPORTANT: LEFT JOIN users + LEFT JOIN leads so lead bookings are included.
    const assignedRes = await pool.query(
      `
      SELECT
        b.public_id,
        b.status,
        b.starts_at,
        b.ends_at,
        b.address,
        b.notes,
        s.title AS service_title,

        -- registered customer fields (nullable for lead bookings)
        cu.first_name AS customer_first_name,
        cu.last_name  AS customer_last_name,
        cu.email      AS customer_email,
        cu.phone      AS customer_phone,
        cu.account_type AS customer_account_type,

        -- lead fields (nullable for registered bookings)
        l.public_id   AS lead_public_id,
        l.first_name  AS lead_first_name,
        l.last_name   AS lead_last_name,
        l.email       AS lead_email,
        l.phone       AS lead_phone,
        l.account_type AS lead_account_type,

        -- tags stored in customer_tags
        ct_reg.tag  AS registered_crm_tag,
        ct_lead.tag AS lead_crm_tag,

        -- optional: if booking is a lead, attempt to match a registered user by email/phone
        ct_guess.tag AS guessed_registered_crm_tag,

        -- the final crm_tag we want to show in UI
        COALESCE(ct_reg.tag, ct_lead.tag, ct_guess.tag) AS crm_tag,

        ba.worker_user_id

      FROM bookings b
      JOIN booking_assignments ba ON ba.booking_id = b.id
      JOIN services s ON s.id = b.service_id
      LEFT JOIN users cu ON cu.id = b.customer_user_id
      LEFT JOIN leads l  ON l.id = b.lead_id

      -- direct tags: registered booking
      LEFT JOIN customer_tags ct_reg
        ON ct_reg.kind = 'registered' AND ct_reg.entity_id = b.customer_user_id

      -- direct tags: lead booking
      LEFT JOIN customer_tags ct_lead
        ON ct_lead.kind = 'lead' AND ct_lead.entity_id = b.lead_id

      -- guess a registered user from the lead (email/phone)
      LEFT JOIN LATERAL (
        SELECT u.id AS user_id
        FROM users u
        WHERE
          (
            l.email IS NOT NULL
            AND lower(trim(u.email::text)) = lower(trim(l.email::text))
          )
          OR
          (
            l.phone IS NOT NULL
            AND regexp_replace(coalesce(u.phone, ''), '[^0-9]+', '', 'g')
                = regexp_replace(coalesce(l.phone, ''), '[^0-9]+', '', 'g')
          )
        ORDER BY u.id DESC
        LIMIT 1
      ) u_guess ON TRUE

      LEFT JOIN customer_tags ct_guess
        ON ct_guess.kind = 'registered' AND ct_guess.entity_id = u_guess.user_id

      WHERE b.status = 'assigned'
      ORDER BY ba.worker_user_id, b.starts_at ASC
      `
    );

    // Build lookup
    const techs = techRes.rows.map((t) => ({
      user_id: t.user_id,
      public_id: t.public_id ?? null,
      email: t.email ?? null,
      first_name: t.first_name ?? null,
      last_name: t.last_name ?? null,
      phone: t.phone ?? null,
      bookings: [],
    }));

    const byId = new Map(techs.map((t) => [String(t.user_id), t]));

    for (const r of assignedRes.rows) {
      const tech = byId.get(String(r.worker_user_id));
      if (!tech) continue;

      const leadName = `${r.lead_first_name || ""} ${r.lead_last_name || ""}`.trim();
      const customerName = `${r.customer_first_name || ""} ${r.customer_last_name || ""}`.trim();

      const displayName =
        (customerName || leadName || r.customer_email || r.lead_email || "").trim() || null;

      tech.bookings.push({
        public_id: r.public_id,
        status: r.status,
        starts_at: r.starts_at,
        ends_at: r.ends_at,
        address: r.address,
        notes: r.notes ?? null,
        service_title: r.service_title,

        customer_name: displayName,
        customer_email: r.customer_email ?? r.lead_email ?? null,
        customer_phone: r.customer_phone ?? r.lead_phone ?? null,
        customer_account_type: r.customer_account_type ?? r.lead_account_type ?? null,

        crm_tag: r.crm_tag ?? null,

        lead_public_id: r.lead_public_id ?? null,
        lead_first_name: r.lead_first_name ?? null,
        lead_last_name: r.lead_last_name ?? null,
        lead_email: r.lead_email ?? null,
        lead_phone: r.lead_phone ?? null,
        lead_account_type: r.lead_account_type ?? null,
      });
    }

    return res.json({ ok: true, technicians: techs, generated_at: new Date().toISOString() });
  } catch (e) {
    next(e);
  }
});

/* -----------------------------------------
   DETAIL: /admin/tech-bookings/:publicId
------------------------------------------ */
router.get("/admin/tech-bookings/:publicId", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const ok = await requireAdminOrSuperByDb(userId);
    if (!ok) return res.status(403).json({ ok: false, message: "Forbidden" });

    const bookingPublicId = String(req.params.publicId || "").trim();
    if (!bookingPublicId) return res.status(400).json({ ok: false, message: "Missing booking id" });

    const q = await pool.query(
      `
      SELECT
        b.public_id,
        b.status,
        b.starts_at,
        b.ends_at,
        b.address,
        b.notes,
        s.title AS service_title,

        -- assignment (current)
        ba.worker_user_id,

        -- assigned tech info
        wu.first_name AS worker_first_name,
        wu.last_name  AS worker_last_name,
        wu.email      AS worker_email,
        wu.phone      AS worker_phone,

        -- registered customer (nullable)
        cu.first_name AS customer_first_name,
        cu.last_name  AS customer_last_name,
        cu.email      AS customer_email,
        cu.phone      AS customer_phone,
        cu.account_type AS customer_account_type,

        -- lead (nullable)
        l.public_id   AS lead_public_id,
        l.first_name  AS lead_first_name,
        l.last_name   AS lead_last_name,
        l.email       AS lead_email,
        l.phone       AS lead_phone,
        l.account_type AS lead_account_type,

        -- CRM tag (same logic as list)
        ct_reg.tag  AS registered_crm_tag,
        ct_lead.tag AS lead_crm_tag,
        ct_guess.tag AS guessed_registered_crm_tag,
        COALESCE(ct_reg.tag, ct_lead.tag, ct_guess.tag) AS crm_tag

      FROM bookings b
      LEFT JOIN booking_assignments ba ON ba.booking_id = b.id
      LEFT JOIN users wu ON wu.id = ba.worker_user_id
      JOIN services s ON s.id = b.service_id
      LEFT JOIN users cu ON cu.id = b.customer_user_id
      LEFT JOIN leads l  ON l.id = b.lead_id

      LEFT JOIN customer_tags ct_reg
        ON ct_reg.kind = 'registered' AND ct_reg.entity_id = b.customer_user_id

      LEFT JOIN customer_tags ct_lead
        ON ct_lead.kind = 'lead' AND ct_lead.entity_id = b.lead_id

      LEFT JOIN LATERAL (
        SELECT u.id AS user_id
        FROM users u
        WHERE
          (
            l.email IS NOT NULL
            AND lower(trim(u.email::text)) = lower(trim(l.email::text))
          )
          OR
          (
            l.phone IS NOT NULL
            AND regexp_replace(coalesce(u.phone, ''), '[^0-9]+', '', 'g')
                = regexp_replace(coalesce(l.phone, ''), '[^0-9]+', '', 'g')
          )
        ORDER BY u.id DESC
        LIMIT 1
      ) u_guess ON TRUE

      LEFT JOIN customer_tags ct_guess
        ON ct_guess.kind = 'registered' AND ct_guess.entity_id = u_guess.user_id

      WHERE b.public_id = $1
      LIMIT 1
      `,
      [bookingPublicId]
    );

    if (q.rowCount === 0) {
      return res.status(404).json({ ok: false, message: "Booking not found" });
    }

    const r = q.rows[0];

    const leadName = `${(r.lead_first_name ?? "").trim()} ${(r.lead_last_name ?? "").trim()}`.trim();
    const customerName = `${(r.customer_first_name ?? "").trim()} ${(r.customer_last_name ?? "").trim()}`.trim();
    const displayName =
      (customerName || leadName || r.customer_email || r.lead_email || "").trim() || null;

    const booking = {
      public_id: r.public_id,
      status: r.status ?? null,
      starts_at: r.starts_at ?? null,
      ends_at: r.ends_at ?? null,

      // booking/service
      service_title: r.service_title ?? null,
      worker_user_id: r.worker_user_id ?? null,

      // assigned tech info
      worker_first_name: r.worker_first_name ?? null,
      worker_last_name: r.worker_last_name ?? null,
      worker_email: r.worker_email ?? null,
      worker_phone: r.worker_phone ?? null,

      // Address shape expected by UI (DB only has b.address)
      address_line1: r.address ?? null,
      address_line2: null,
      city: null,
      state: null,
      zip: null,

      // Notes (currently single field)
      initial_notes: r.notes ?? null,
      booking_notes: r.notes ?? null,

      // unified customer fields
      customer_name: displayName,
      customer_first_name: r.customer_first_name ?? r.lead_first_name ?? null,
      customer_last_name: r.customer_last_name ?? r.lead_last_name ?? null,
      customer_email: r.customer_email ?? r.lead_email ?? null,
      customer_phone: r.customer_phone ?? r.lead_phone ?? null,
      customer_account_type: r.customer_account_type ?? r.lead_account_type ?? null,

      // lead fields
      lead_public_id: r.lead_public_id ?? null,
      lead_first_name: r.lead_first_name ?? null,
      lead_last_name: r.lead_last_name ?? null,
      lead_email: r.lead_email ?? null,
      lead_phone: r.lead_phone ?? null,
      lead_account_type: r.lead_account_type ?? null,

      // crm
      crm_tag: r.crm_tag ?? null,
    };

    return res.json({ ok: true, booking });
  } catch (e) {
    next(e);
  }
});

/* -----------------------------------------
   REASSIGN: /admin/tech-bookings/:publicId/reassign
------------------------------------------ */
router.post("/admin/tech-bookings/:publicId/reassign", requireAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const ok = await requireAdminOrSuperByDb(userId);
    if (!ok) return res.status(403).json({ ok: false, message: "Forbidden" });

    const bookingPublicId = req.params.publicId;
    const { worker_user_id } = reassignSchema.parse(req.body);

    await client.query("BEGIN");

    const bRes = await client.query(
      `SELECT id, status FROM bookings WHERE public_id = $1 FOR UPDATE`,
      [bookingPublicId]
    );
    if (bRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, message: "Booking not found" });
    }

    const booking = bRes.rows[0];
    if (booking.status === "completed" || booking.status === "cancelled") {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({ ok: false, message: "Cannot reassign a completed/cancelled booking" });
    }

    const techRes = await client.query(
      `SELECT 1 FROM user_roles WHERE user_id = $1 AND role = 'worker' LIMIT 1`,
      [worker_user_id]
    );
    if (techRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "Target user is not a technician" });
    }

    await client.query(
      `
      INSERT INTO booking_assignments (booking_id, worker_user_id, assigned_by_user_id, assigned_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT (booking_id)
      DO UPDATE SET
        worker_user_id = EXCLUDED.worker_user_id,
        assigned_by_user_id = EXCLUDED.assigned_by_user_id,
        assigned_at = EXCLUDED.assigned_at
      `,
      [booking.id, worker_user_id, userId]
    );

    if (booking.status !== "assigned") {
      await client.query(`UPDATE bookings SET status = 'assigned', updated_at = now() WHERE id = $1`, [
        booking.id,
      ]);
    }

    await client.query("COMMIT");
    return res.json({ ok: true });
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