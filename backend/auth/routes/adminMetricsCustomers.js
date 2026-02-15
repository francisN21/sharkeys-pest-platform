// routes/adminMetricsCustomers.js
const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

const querySchema = z.object({
  start: z.string().optional(), // YYYY-MM-DD
  end: z.string().optional(),   // YYYY-MM-DD (exclusive)
});

async function requireSuperUserByDb(userId) {
  const rolesRes = await pool.query(`SELECT role FROM user_roles WHERE user_id = $1`, [userId]);
  const roles = rolesRes.rows.map((r) => r.role);
  return roles.includes("superuser");
}

function toISODateOnlyLocal(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateOnly(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return s;
}

router.get("/admin/metrics/customers", requireAuth, async (req, res, next) => {
  try {
    const { start, end } = querySchema.parse(req.query);

    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const ok = await requireSuperUserByDb(userId);
    if (!ok) return res.status(403).json({ ok: false, message: "Forbidden" });

    // ✅ Default: last 30 days rolling, ending today (exclusive end = today+1? or today)
    // We’ll use end_exclusive = tomorrow at 00:00 UTC? Safer: end_exclusive = today + 1 day date-only.
    // But since the UI will pass date-only, we define:
    // - start_date inclusive
    // - end_date exclusive
    const now = new Date();
    const endDefault = toISODateOnlyLocal(now); // today date-only
    const startDefault = toISODateOnlyLocal(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));

    const startDate = parseDateOnly(start || "") || startDefault;
    const endDate = parseDateOnly(end || "") || endDefault;

    const startMs = new Date(`${startDate}T00:00:00Z`).getTime();
    const endMs = new Date(`${endDate}T00:00:00Z`).getTime();
    if (!(endMs > startMs)) {
      return res.status(400).json({ ok: false, message: "Invalid range: end must be after start" });
    }

    const maxDays = 365;
    const diffDays = Math.ceil((endMs - startMs) / (24 * 60 * 60 * 1000));
    if (diffDays > maxDays) {
      return res.status(400).json({ ok: false, message: `Range too large (max ${maxDays} days)` });
    }

    // We consider "customers" = users with role 'customer'
    // account_type in users: 'residential' | 'business' | null
    const r = await pool.query(
      `
      WITH params AS (
        SELECT $1::date AS start_date, $2::date AS end_date
      ),
      customer_users AS (
        SELECT u.*
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'customer'
      ),
      all_time AS (
        SELECT
          COUNT(*)::int AS customers_all_time,
          COUNT(*) FILTER (WHERE account_type = 'residential')::int AS residential_all_time,
          COUNT(*) FILTER (WHERE account_type = 'business')::int AS business_all_time,
          COUNT(*) FILTER (WHERE account_type IS NULL OR account_type NOT IN ('residential','business'))::int AS unknown_all_time
        FROM customer_users
      ),
      in_range AS (
        SELECT
          COUNT(*) FILTER (
            WHERE created_at >= (SELECT start_date FROM params)
              AND created_at <  (SELECT end_date   FROM params)
          )::int AS new_customers_in_range,

          COUNT(*) FILTER (
            WHERE created_at >= (SELECT start_date FROM params)
              AND created_at <  (SELECT end_date   FROM params)
              AND account_type = 'residential'
          )::int AS new_residential_in_range,

          COUNT(*) FILTER (
            WHERE created_at >= (SELECT start_date FROM params)
              AND created_at <  (SELECT end_date   FROM params)
              AND account_type = 'business'
          )::int AS new_business_in_range,

          COUNT(*) FILTER (
            WHERE created_at >= (SELECT start_date FROM params)
              AND created_at <  (SELECT end_date   FROM params)
              AND (account_type IS NULL OR account_type NOT IN ('residential','business'))
          )::int AS new_unknown_in_range
        FROM customer_users
      )
      SELECT
        (SELECT row_to_json(all_time) FROM all_time) AS all_time,
        (SELECT row_to_json(in_range) FROM in_range) AS in_range
      `,
      [startDate, endDate]
    );

    const row = r.rows[0] || {};
    const allTime = row.all_time || {};
    const inRange = row.in_range || {};

    const customersAll = Number(allTime.customers_all_time || 0);
    const resAll = Number(allTime.residential_all_time || 0);
    const bizAll = Number(allTime.business_all_time || 0);

    const pctResAll = customersAll > 0 ? Math.round((resAll / customersAll) * 1000) / 10 : 0;
    const pctBizAll = customersAll > 0 ? Math.round((bizAll / customersAll) * 1000) / 10 : 0;

    return res.json({
      ok: true,
      range: { start: startDate, end_exclusive: endDate, days: diffDays },
      all_time: {
        ...allTime,
        residential_percent: pctResAll,
        business_percent: pctBizAll,
      },
      in_range: inRange,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;