// routes/adminMetricsLeadConversionAge.js
const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

const querySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // exclusive
});

async function requireSuperUserByDb(userId) {
  const rolesRes = await pool.query(`SELECT role FROM user_roles WHERE user_id = $1`, [userId]);
  const roles = rolesRes.rows.map((r) => r.role);
  return roles.includes("superuser");
}

function dateOnlyTodayUtc() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateOnlyMonthsAgoUtc(months) {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - months);
  d.setUTCDate(1);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}

/**
 * GET /admin/metrics/lead-conversion-age
 * Superuser only.
 * Returns how long leads take to convert (leads.created_at → lead_conversions.converted_at).
 * Includes: avg/min/max days, bucket distribution, monthly trend.
 */
router.get("/admin/metrics/lead-conversion-age", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const ok = await requireSuperUserByDb(userId);
    if (!ok) return res.status(403).json({ ok: false, message: "Forbidden" });

    const parsed = querySchema.parse(req.query);
    const start = parsed.start ?? dateOnlyMonthsAgoUtc(6);
    const endExclusive = parsed.end ?? dateOnlyTodayUtc();

    const startMs = new Date(`${start}T00:00:00Z`).getTime();
    const endMs = new Date(`${endExclusive}T00:00:00Z`).getTime();
    if (!(endMs > startMs)) {
      return res.status(400).json({ ok: false, message: "Invalid range: end must be after start" });
    }

    const r = await pool.query(
      `
      WITH conversions AS (
        SELECT
          lc.converted_at,
          l.created_at                                                         AS lead_created_at,
          EXTRACT(EPOCH FROM (lc.converted_at - l.created_at)) / 86400.0      AS age_days
        FROM lead_conversions lc
        JOIN leads l ON l.id = lc.lead_id
        WHERE
          lc.converted_at >= ($1::date)::timestamp
          AND lc.converted_at <  ($2::date)::timestamp
      ),
      totals AS (
        SELECT
          COUNT(*)::int                          AS total_conversions,
          ROUND(AVG(age_days)::numeric, 1)       AS avg_days,
          ROUND(MIN(age_days)::numeric, 1)       AS min_days,
          ROUND(MAX(age_days)::numeric, 1)       AS max_days,
          ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY age_days)::numeric, 1) AS median_days
        FROM conversions
      ),
      buckets AS (
        SELECT
          CASE
            WHEN age_days < 1   THEN 'same_day'
            WHEN age_days < 7   THEN '1_to_7d'
            WHEN age_days < 30  THEN '7_to_30d'
            WHEN age_days < 90  THEN '30_to_90d'
            ELSE                     '90d_plus'
          END AS bucket,
          COUNT(*)::int AS count
        FROM conversions
        GROUP BY 1
      ),
      monthly AS (
        SELECT
          date_trunc('month', converted_at)::date AS month_start,
          COUNT(*)::int                           AS conversions,
          ROUND(AVG(age_days)::numeric, 1)        AS avg_days
        FROM conversions
        GROUP BY 1
        ORDER BY 1 ASC
      )
      SELECT
        (SELECT row_to_json(totals) FROM totals)     AS totals,
        (SELECT json_agg(buckets)   FROM buckets)    AS buckets,
        (SELECT json_agg(monthly)   FROM monthly)    AS monthly
      `,
      [start, endExclusive]
    );

    const row = r.rows[0] || {};
    return res.json({
      ok: true,
      range: { start, end_exclusive: endExclusive },
      totals: row.totals || {
        total_conversions: 0,
        avg_days: null,
        min_days: null,
        max_days: null,
        median_days: null,
      },
      buckets: row.buckets || [],
      monthly: row.monthly || [],
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
