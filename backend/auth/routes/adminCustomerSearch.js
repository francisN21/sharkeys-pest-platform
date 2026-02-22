const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

const QuerySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(25),
});

// NOTE: assumes you have a leads table named `leads`
// with columns: public_id, email, first_name, last_name, phone, address, created_at
// If your table name/columns differ, tell me and I’ll adapt it.
router.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "invalid_query", details: parsed.error.flatten() });
    }

    const q = (parsed.data.q || "").trim();
    const limit = parsed.data.limit;

    // basic search pattern
    const like = `%${q.toLowerCase()}%`;

    // We do a UNION ALL so we can return both sets in one payload.
    // You can refine ranking later; for now we order by created_at desc.
    const params = q ? [like, limit] : [limit];

    const sql = q
      ? `
        SELECT * FROM (
          SELECT
            u.public_id,
            u.email,
            u.first_name,
            u.last_name,
            u.phone,
            u.address,
            u.created_at,
            'registered'::text AS kind
          FROM customers u
          WHERE
            LOWER(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')) LIKE $1
            OR LOWER(COALESCE(u.email,'')) LIKE $1
            OR LOWER(COALESCE(u.phone,'')) LIKE $1

          UNION ALL

          SELECT
            l.public_id,
            l.email,
            l.first_name,
            l.last_name,
            l.phone,
            l.address,
            l.created_at,
            'lead'::text AS kind
          FROM leads l
          WHERE
            LOWER(COALESCE(l.first_name,'') || ' ' || COALESCE(l.last_name,'')) LIKE $1
            OR LOWER(COALESCE(l.email,'')) LIKE $1
            OR LOWER(COALESCE(l.phone,'')) LIKE $1
        ) x
        ORDER BY x.created_at DESC
        LIMIT $2
      `
      : `
        SELECT * FROM (
          SELECT
            u.public_id,
            u.email,
            u.first_name,
            u.last_name,
            u.phone,
            u.address,
            u.created_at,
            'registered'::text AS kind
          FROM customers u

          UNION ALL

          SELECT
            l.public_id,
            l.email,
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

    const { rows } = await pool.query(sql, params);

    res.json({
      ok: true,
      results: rows,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;