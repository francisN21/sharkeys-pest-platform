// routes/adminCustomers.js
const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

/**
 * LIST (registered customers only)
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

    const where = [];
    const params = [];
    let p = 1;

    // customer-only (has 'customer' role AND does NOT have admin/worker roles)
    where.push(`
      EXISTS (SELECT 1 FROM user_roles urc WHERE urc.user_id = u.id AND urc.role = 'customer')
      AND NOT EXISTS (SELECT 1 FROM user_roles urx WHERE urx.user_id = u.id AND urx.role IN ('admin','worker'))
    `);

    if (q && q.length > 0) {
      where.push(`
        (
          u.email ILIKE $${p}
          OR COALESCE(u.first_name,'') ILIKE $${p}
          OR COALESCE(u.last_name,'') ILIKE $${p}
          OR (COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')) ILIKE $${p}
          OR COALESCE(u.phone,'') ILIKE $${p}
          OR COALESCE(u.address,'') ILIKE $${p}
        )
      `);
      params.push(`%${q}%`);
      p++;
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // total count
    const countRes = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM users u
      ${whereSql}
      `,
      params
    );

    const total = countRes.rows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const dataParams = [...params, pageSize, offset];

    const dataRes = await pool.query(
      `
      SELECT
        u.id,
        u.public_id,
        u.first_name,
        u.last_name,
        u.phone,
        u.email,
        u.address,
        u.account_type,
        u.created_at,

        COALESCE(SUM(CASE WHEN b.status IN ('pending','accepted','assigned') THEN 1 ELSE 0 END), 0)::int AS open_bookings,
        COALESCE(SUM(CASE WHEN b.status = 'completed' THEN 1 ELSE 0 END), 0)::int AS completed_bookings,
        COALESCE(SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END), 0)::int AS cancelled_bookings

      FROM users u
      LEFT JOIN bookings b ON b.customer_user_id = u.id

      ${whereSql}

      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $${p++}
      OFFSET $${p++}
      `,
      dataParams
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

    // If q is empty, we still return recent results from both (limited).
    const like = `%${q}%`;

    // Registered customers = users with role customer and not admin/worker (same rule as list)
    const sql = q.length
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

    const params = q.length ? [like, limit] : [limit];
    const { rows } = await pool.query(sql, params);

    res.json({ ok: true, results: rows });
  } catch (e) {
    next(e);
  }
});

module.exports = router;