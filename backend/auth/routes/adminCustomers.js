// backend/auth/routes/adminCustomers.js
const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

/**
 * LIST (registered customers + leads)
 * GET /admin/customers?page=&pageSize=&q=
 */
const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
  q: z.string().trim().optional(),
});

router.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { page, pageSize, q } = listSchema.parse(req.query);
    const offset = (page - 1) * pageSize;

    const like = q && q.length ? `%${q}%` : null;

    const countRes = await pool.query(
      `
      WITH directory AS (
        SELECT
          'registered'::text AS kind,
          u.id AS entity_id,
          u.public_id,
          u.first_name,
          u.last_name,
          u.phone,
          u.email,
          u.address,
          u.account_type,
          u.created_at
        FROM users u
        WHERE
          EXISTS (SELECT 1 FROM user_roles urc WHERE urc.user_id = u.id AND urc.role = 'customer')
          AND NOT EXISTS (SELECT 1 FROM user_roles urx WHERE urx.user_id = u.id AND urx.role IN ('admin','worker'))

        UNION ALL

        SELECT
          'lead'::text AS kind,
          l.id AS entity_id,
          l.public_id,
          l.first_name,
          l.last_name,
          l.phone,
          l.email,
          l.address,
          l.account_type,
          l.created_at
        FROM leads l
      )
      SELECT COUNT(*)::int AS total
      FROM directory d
      WHERE
        ($1::text IS NULL)
        OR (
          COALESCE(d.email,'') ILIKE $1
          OR COALESCE(d.first_name,'') ILIKE $1
          OR COALESCE(d.last_name,'') ILIKE $1
          OR (COALESCE(d.first_name,'') || ' ' || COALESCE(d.last_name,'')) ILIKE $1
          OR COALESCE(d.phone,'') ILIKE $1
          OR COALESCE(d.address,'') ILIKE $1
        )
      `,
      [like]
    );

    const total = countRes.rows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const dataRes = await pool.query(
      `
      WITH directory AS (
        SELECT
          'registered'::text AS kind,
          u.id AS entity_id,
          u.public_id,
          u.first_name,
          u.last_name,
          u.phone,
          u.email,
          u.address,
          u.account_type,
          u.created_at
        FROM users u
        WHERE
          EXISTS (SELECT 1 FROM user_roles urc WHERE urc.user_id = u.id AND urc.role = 'customer')
          AND NOT EXISTS (SELECT 1 FROM user_roles urx WHERE urx.user_id = u.id AND urx.role IN ('admin','worker'))

        UNION ALL

        SELECT
          'lead'::text AS kind,
          l.id AS entity_id,
          l.public_id,
          l.first_name,
          l.last_name,
          l.phone,
          l.email,
          l.address,
          l.account_type,
          l.created_at
        FROM leads l
      ),
      stats AS (
        SELECT
          d.kind,
          d.entity_id,
          COALESCE(SUM(CASE WHEN b.status IN ('pending','accepted','assigned') THEN 1 ELSE 0 END), 0)::int AS open_bookings,
          COALESCE(SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END), 0)::int AS completed_bookings,
          COALESCE(SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END), 0)::int AS cancelled_bookings
        FROM directory d
        LEFT JOIN bookings b
          ON (
            (d.kind = 'registered' AND b.customer_user_id = d.entity_id)
            OR
            (d.kind = 'lead' AND b.lead_id = d.entity_id)
          )
        GROUP BY d.kind, d.entity_id
      )
      SELECT
        d.kind,
        d.public_id,
        d.first_name,
        d.last_name,
        d.phone,
        d.email,
        d.address,
        d.account_type,
        d.created_at,
        COALESCE(s.open_bookings, 0) AS open_bookings,
        COALESCE(s.completed_bookings, 0) AS completed_bookings,
        COALESCE(s.cancelled_bookings, 0) AS cancelled_bookings
      FROM directory d
      LEFT JOIN stats s ON s.kind = d.kind AND s.entity_id = d.entity_id
      WHERE
        ($1::text IS NULL)
        OR (
          COALESCE(d.email,'') ILIKE $1
          OR COALESCE(d.first_name,'') ILIKE $1
          OR COALESCE(d.last_name,'') ILIKE $1
          OR (COALESCE(d.first_name,'') || ' ' || COALESCE(d.last_name,'')) ILIKE $1
          OR COALESCE(d.phone,'') ILIKE $1
          OR COALESCE(d.address,'') ILIKE $1
        )
      ORDER BY d.created_at DESC
      LIMIT $2
      OFFSET $3
      `,
      [like, pageSize, offset]
    );

    res.json({
      ok: true,
      customers: dataRes.rows,
      page,
      pageSize,
      total,
      totalPages,
      q: q ?? "",
    });
  } catch (e) {
    next(e);
  }
});

/**
 * COMBINED SEARCH (registered customers + leads)
 * GET /admin/customers/search?q=&limit=
 */
const searchSchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(25),
});

router.get("/search", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const parsed = searchSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "invalid_query", details: parsed.error.flatten() });
    }

    const q = (parsed.data.q || "").trim();
    const limit = parsed.data.limit;
    const like = `%${q}%`;

    const sql =
      q.length > 0
        ? `
        SELECT * FROM (
          SELECT
            u.public_id::text AS public_id,
            u.email::text AS email,
            u.first_name,
            u.last_name,
            u.phone,
            u.address,
            u.created_at,
            'registered'::text AS kind
          FROM users u
          WHERE
            EXISTS (SELECT 1 FROM user_roles urc WHERE urc.user_id = u.id AND urc.role = 'customer')
            AND NOT EXISTS (SELECT 1 FROM user_roles urx WHERE urx.user_id = u.id AND urx.role IN ('admin','worker'))
            AND (
              u.email ILIKE $1
              OR COALESCE(u.first_name,'') ILIKE $1
              OR COALESCE(u.last_name,'') ILIKE $1
              OR (COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')) ILIKE $1
              OR COALESCE(u.phone,'') ILIKE $1
              OR COALESCE(u.address,'') ILIKE $1
            )

          UNION ALL

          SELECT
            l.public_id::text AS public_id,
            l.email::text AS email,
            l.first_name,
            l.last_name,
            l.phone,
            l.address,
            l.created_at,
            'lead'::text AS kind
          FROM leads l
          WHERE
            l.email ILIKE $1
            OR COALESCE(l.first_name,'') ILIKE $1
            OR COALESCE(l.last_name,'') ILIKE $1
            OR (COALESCE(l.first_name,'') || ' ' || COALESCE(l.last_name,'')) ILIKE $1
            OR COALESCE(l.phone,'') ILIKE $1
            OR COALESCE(l.address,'') ILIKE $1
        ) x
        ORDER BY x.created_at DESC
        LIMIT $2
      `
        : `
        SELECT * FROM (
          SELECT
            u.public_id::text AS public_id,
            u.email::text AS email,
            u.first_name,
            u.last_name,
            u.phone,
            u.address,
            u.created_at,
            'registered'::text AS kind
          FROM users u
          WHERE
            EXISTS (SELECT 1 FROM user_roles urc WHERE urc.user_id = u.id AND urc.role = 'customer')
            AND NOT EXISTS (SELECT 1 FROM user_roles urx WHERE urx.user_id = u.id AND urx.role IN ('admin','worker'))

          UNION ALL

          SELECT
            l.public_id::text AS public_id,
            l.email::text AS email,
            l.first_name,
            l.last_name,
            l.phone,
            l.address,
            l.created_at,
            'lead'::text AS kind
          FROM leads l
        ) x
        ORDER BY x.created_at DESC
        LIMIT $1
      `;

    const params = q.length > 0 ? [like, limit] : [limit];
    const { rows } = await pool.query(sql, params);

    res.json({ ok: true, results: rows });
  } catch (e) {
    next(e);
  }
});

/* ---------------------------
   DETAIL VIEW + TAGGING
--------------------------- */

const kindSchema = z.enum(["registered", "lead"]);

async function resolveEntity(kind, publicId) {
  if (kind === "registered") {
    const r = await pool.query(
      `
      SELECT u.id AS entity_id, u.public_id, u.first_name, u.last_name, u.phone, u.email, u.address, u.account_type, u.created_at
      FROM users u
      WHERE u.public_id = $1
      LIMIT 1
      `,
      [publicId]
    );
    return r.rows[0] || null;
  }

  const r = await pool.query(
    `
    SELECT l.id AS entity_id, l.public_id, l.first_name, l.last_name, l.phone, l.email, l.address, l.account_type, l.created_at
    FROM leads l
    WHERE l.public_id = $1
    LIMIT 1
    `,
    [publicId]
  );
  return r.rows[0] || null;
}

function groupStatus(status) {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  return "in_progress"; // pending/accepted/assigned
}

/**
 * GET /admin/customers/:kind/:publicId
 */
router.get("/:kind/:publicId", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const kind = kindSchema.parse(req.params.kind);
    const publicId = String(req.params.publicId || "");

    const entity = await resolveEntity(kind, publicId);
    if (!entity) return res.status(404).json({ ok: false, message: "Customer not found" });

    // Tag row (optional)
    const tagRes = await pool.query(
      `
      SELECT tag, note, updated_at, updated_by_user_id
      FROM customer_tags
      WHERE kind = $1 AND entity_id = $2
      LIMIT 1
      `,
      [kind, entity.entity_id]
    );

    const tagRow = tagRes.rows[0] || null;

    // Pull all bookings for this entity
    // NOTE: lifetime_value uses 0 as default. Plug your amount column here when you add pricing.
    const bookingsRes = await pool.query(
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
        s.title AS service_title

        -- If/when you have a price column, add it here and sum it below:
        -- , COALESCE(b.total_amount, 0) AS total_amount

      FROM bookings b
      JOIN services s ON s.id = b.service_id
      WHERE
        (
          ($1 = 'registered' AND b.customer_user_id = $2)
          OR
          ($1 = 'lead' AND b.lead_id = $2)
        )
      ORDER BY b.created_at DESC
      LIMIT 1000
      `,
      [kind, entity.entity_id]
    );

    const bookings = bookingsRes.rows;

    // Basic summary counts
    const counts = { in_progress: 0, completed: 0, cancelled: 0 };
    for (const b of bookings) counts[groupStatus(b.status)]++;

    // Lifetime value placeholder
    // Replace this logic when you add real money fields:
    const lifetime_value = 0;

    res.json({
      ok: true,
      customer: {
        kind,
        public_id: entity.public_id,
        first_name: entity.first_name ?? null,
        last_name: entity.last_name ?? null,
        email: entity.email ?? null,
        phone: entity.phone ?? null,
        address: entity.address ?? null,
        account_type: entity.account_type ?? null,
        created_at: entity.created_at,
      },
      tag: tagRow
        ? {
            tag: tagRow.tag ?? null,
            note: tagRow.note ?? null,
            updated_at: tagRow.updated_at ?? null,
            updated_by_user_id: tagRow.updated_by_user_id ?? null,
          }
        : { tag: null, note: null, updated_at: null, updated_by_user_id: null },
      summary: {
        lifetime_value,
        counts,
      },
      bookings: {
        in_progress: bookings.filter((b) => groupStatus(b.status) === "in_progress"),
        completed: bookings.filter((b) => groupStatus(b.status) === "completed"),
        cancelled: bookings.filter((b) => groupStatus(b.status) === "cancelled"),
      },
      generated_at: new Date().toISOString(),
    });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /admin/customers/:kind/:publicId/tag
 * Body: { tag: string|null, note?: string|null }
 */
const tagSchema = z.object({
  tag: z.string().trim().max(50).nullable(),
  note: z.string().trim().max(500).nullable().optional(),
});

router.patch("/:kind/:publicId/tag", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const kind = kindSchema.parse(req.params.kind);
    const publicId = String(req.params.publicId || "");
    const { tag, note } = tagSchema.parse(req.body);

    const entity = await resolveEntity(kind, publicId);
    if (!entity) return res.status(404).json({ ok: false, message: "Customer not found" });

    await pool.query(
      `
      INSERT INTO customer_tags (kind, entity_id, tag, note, updated_by_user_id, updated_at)
      VALUES ($1, $2, $3, $4, $5, now())
      ON CONFLICT (kind, entity_id)
      DO UPDATE SET
        tag = EXCLUDED.tag,
        note = EXCLUDED.note,
        updated_by_user_id = EXCLUDED.updated_by_user_id,
        updated_at = EXCLUDED.updated_at
      `,
      [kind, entity.entity_id, tag, note ?? null, req.user?.id ?? null]
    );

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;