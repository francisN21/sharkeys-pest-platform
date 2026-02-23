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
 *
 * Returns rows with:
 * - kind: 'registered' | 'lead'
 * - public_id, first_name, last_name, email, phone, address, account_type, created_at
 * - open_bookings, completed_bookings, cancelled_bookings
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

    // total count (registered + leads)
    const countRes = await pool.query(
      `
      WITH directory AS (
        -- Registered customers (role=customer AND NOT admin/worker)
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

        -- Leads
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
        -- Registered customers
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

        -- Leads
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
 * COMBINED SEARCH (registered customers + leads) - lightweight (no stats)
 * GET /admin/customers/search?q=&limit=
 *
 * Returns: [{ public_id, kind, email, first_name, last_name, phone, address, created_at }]
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

module.exports = router;