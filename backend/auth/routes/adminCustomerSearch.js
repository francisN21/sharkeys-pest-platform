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

router.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "invalid_query", details: parsed.error.flatten() });
    }

    const q = (parsed.data.q || "").trim().toLowerCase();
    const limit = parsed.data.limit;

    const like = `%${q}%`;

    // NOTE:
    // - leads.email is CITEXT so ILIKE works fine.
    // - We return "public_id" as string for both.
    // - Adjust "customers" table name below ONLY if yours differs.
    // - For customers, I'm assuming columns: public_id, email, first_name, last_name, phone, address, created_at
    const sql = q
      ? `
        SELECT * FROM (
          SELECT
            c.public_id::text AS public_id,
            c.email::text AS email,
            c.first_name,
            c.last_name,
            c.phone,
            c.address,
            c.created_at,
            'registered'::text AS kind
          FROM customers c
          WHERE
            (COALESCE(c.first_name,'') || ' ' || COALESCE(c.last_name,'')) ILIKE $1
            OR c.email ILIKE $1
            OR COALESCE(c.phone,'') ILIKE $1

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
            (COALESCE(l.first_name,'') || ' ' || COALESCE(l.last_name,'')) ILIKE $1
            OR l.email ILIKE $1
            OR COALESCE(l.phone,'') ILIKE $1
        ) x
        ORDER BY x.created_at DESC
        LIMIT $2
      `
      : `
        SELECT * FROM (
          SELECT
            c.public_id::text AS public_id,
            c.email::text AS email,
            c.first_name,
            c.last_name,
            c.phone,
            c.address,
            c.created_at,
            'registered'::text AS kind
          FROM customers c

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

    const params = q ? [like, limit] : [limit];
    const { rows } = await pool.query(sql, params);

    res.json({ ok: true, results: rows });
  } catch (e) {
    next(e);
  }
});

module.exports = router;