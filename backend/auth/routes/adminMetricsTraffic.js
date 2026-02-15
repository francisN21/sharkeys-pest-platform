// routes/adminMetricsTraffic.js
const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

function requireSuperUser(req, res, next) {
  const roles = req.user?.roles ?? req.auth?.roles ?? null; // if your requireAuth attaches roles
  // If your requireAuth doesn't attach roles, we query them below.
  if (Array.isArray(roles)) {
    const ok = roles.map((r) => String(r).toLowerCase()).includes("superuser");
    if (!ok) return res.status(403).json({ ok: false, message: "Forbidden" });
    return next();
  }
  return next();
}

const querySchema = z.object({
  days: z
    .string()
    .optional()
    .transform((v) => {
      const n = v ? Number(v) : 30;
      if (!Number.isFinite(n)) return 30;
      return Math.max(7, Math.min(365, Math.trunc(n)));
    }),
});

router.get("/admin/metrics/traffic", requireAuth, requireSuperUser, async (req, res, next) => {
  try {
    const { days } = querySchema.parse(req.query);

    // If your requireAuth does NOT attach roles, enforce superuser here via DB:
    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const rolesRes = await pool.query(`SELECT role FROM user_roles WHERE user_id = $1`, [userId]);
    const roles = rolesRes.rows.map((r) => r.role);
    if (!roles.includes("superuser")) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }

    const traffic = await pool.query(
      `
      WITH params AS (
        SELECT
          now() - interval '1 day'  AS since_1d,
          now() - interval '7 days' AS since_7d,
          now() - interval '30 days' AS since_30d,
          now() - ($1::int || ' days')::interval AS since_nd
      ),
      counts AS (
        SELECT
          (SELECT count(*) FROM site_access_events) AS requests_all_time,
          (SELECT count(*) FROM site_access_events e, params p WHERE e.occurred_at >= p.since_1d)  AS requests_1d,
          (SELECT count(*) FROM site_access_events e, params p WHERE e.occurred_at >= p.since_7d)  AS requests_7d,
          (SELECT count(*) FROM site_access_events e, params p WHERE e.occurred_at >= p.since_30d) AS requests_30d,

          (SELECT count(*) FROM site_unique_visitors_daily u WHERE u.day >= (current_date - interval '1 day')::date)  AS uniques_1d,
          (SELECT count(*) FROM site_unique_visitors_daily u WHERE u.day >= (current_date - interval '7 days')::date)  AS uniques_7d,
          (SELECT count(*) FROM site_unique_visitors_daily u WHERE u.day >= (current_date - interval '30 days')::date) AS uniques_30d
      ),
      series AS (
        SELECT
          d::date AS day,
          COALESCE((
            SELECT count(*)
            FROM site_access_events e
            WHERE e.occurred_at >= d
              AND e.occurred_at < (d + interval '1 day')
          ), 0) AS requests,
          COALESCE((
            SELECT count(*)
            FROM site_unique_visitors_daily u
            WHERE u.day = d::date
          ), 0) AS uniques
        FROM generate_series(
          (current_date - ($1::int - 1))::date,
          current_date,
          interval '1 day'
        ) AS d
        ORDER BY d
      )
      SELECT
        (SELECT row_to_json(counts) FROM counts) AS totals,
        (SELECT json_agg(series) FROM series) AS daily
      `,
      [days]
    );

    const row = traffic.rows[0] || {};
    return res.json({
      ok: true,
      totals: row.totals ?? {},
      daily: row.daily ?? [],
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;