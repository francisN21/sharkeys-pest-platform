const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

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

    // main data + booking stats
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

module.exports = router;