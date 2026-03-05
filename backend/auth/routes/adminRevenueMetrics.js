// backend/auth/routes/adminRevenueMetrics.js
const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

async function getRolesByDb(userId) {
  const rolesRes = await pool.query(`SELECT role FROM user_roles WHERE user_id = $1`, [userId]);
  return rolesRes.rows.map((r) => String(r.role || "").trim().toLowerCase()).filter(Boolean);
}

async function requireAdminOrSuperByDb(userId) {
  const roles = await getRolesByDb(userId);
  return roles.includes("admin") || roles.includes("superuser");
}

const querySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // end_exclusive (YYYY-MM-DD)
  tzOffsetMinutes: z
    .union([z.string().regex(/^-?\d+$/), z.number().int()])
    .optional()
    .transform((v) => (v === undefined ? 0 : Number(v))),
});

function dateOnlyTodayUtc() {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateOnlyDaysAgoUtc(days) {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Revenue logic:
 * - Only completed bookings
 * - Revenue cents = COALESCE(bp.final_price_cents, bp.initial_price_cents, s.base_price_cents, 0)
 * - Range filter uses completed_at (fallback to ends_at if you want; here we use completed_at)
 * - Uses end_exclusive semantics: [start, end)
 */
router.get("/admin/revenue-metrics", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const ok = await requireAdminOrSuperByDb(userId);
    if (!ok) return res.status(403).json({ ok: false, message: "Forbidden" });

    const parsed = querySchema.parse(req.query);

    // Defaults: last 90 days ending today (exclusive)
    const start = parsed.start ?? dateOnlyDaysAgoUtc(90);
    const endExclusive = parsed.end ?? dateOnlyTodayUtc();
    const tzOffsetMinutes = Number.isFinite(parsed.tzOffsetMinutes) ? parsed.tzOffsetMinutes : 0;

    // Convert UTC timestamps into "local" time using tzOffsetMinutes:
    // local_ts = completed_at - (tzOffsetMinutes minutes)
    // (JS getTimezoneOffset is + for "behind UTC", e.g. Las Vegas PST = 480)
    //
    // Example: tzOffsetMinutes=480 means local = UTC - 480 minutes
    // so we subtract 480 minutes.
    //
    // We then group by local day/week/month using date_trunc on that shifted timestamp.
    const q = `
      WITH base AS (
        SELECT
          b.id AS booking_id,
          b.public_id,
          b.completed_at,
          -- revenue cents fallback order:
          COALESCE(bp.final_price_cents, bp.initial_price_cents, s.base_price_cents, 0) AS revenue_cents,
          -- shift into "local" time using tzOffsetMinutes
          (b.completed_at - make_interval(mins => $3)) AS local_completed_at
        FROM bookings b
        JOIN services s ON s.id = b.service_id
        LEFT JOIN booking_prices bp ON bp.booking_id = b.id
        WHERE
          b.status = 'completed'
          AND b.completed_at IS NOT NULL
          AND (b.completed_at - make_interval(mins => $3)) >= ($1::date)::timestamp
          AND (b.completed_at - make_interval(mins => $3)) <  ($2::date)::timestamp
      ),
      daily AS (
        SELECT
          date_trunc('day', local_completed_at)::date AS day,
          COUNT(*)::int AS completed_count,
          SUM(revenue_cents)::bigint AS revenue_cents
        FROM base
        GROUP BY 1
        ORDER BY 1 ASC
      ),
      weekly AS (
        SELECT
          date_trunc('week', local_completed_at)::date AS week_start,
          COUNT(*)::int AS completed_count,
          SUM(revenue_cents)::bigint AS revenue_cents
        FROM base
        GROUP BY 1
        ORDER BY 1 ASC
      ),
      monthly AS (
        SELECT
          date_trunc('month', local_completed_at)::date AS month_start,
          COUNT(*)::int AS completed_count,
          SUM(revenue_cents)::bigint AS revenue_cents
        FROM base
        GROUP BY 1
        ORDER BY 1 ASC
      ),
      totals AS (
        SELECT
          COUNT(*)::int AS completed_count,
          SUM(revenue_cents)::bigint AS revenue_cents
        FROM base
      )
      SELECT
        (SELECT json_agg(daily)  FROM daily)  AS daily,
        (SELECT json_agg(weekly) FROM weekly) AS weekly,
        (SELECT json_agg(monthly) FROM monthly) AS monthly,
        (SELECT row_to_json(totals) FROM totals) AS totals
    `;

    const r = await pool.query(q, [start, endExclusive, tzOffsetMinutes]);

    const row = r.rows[0] || {};
    return res.json({
      ok: true,
      range: { start, end_exclusive: endExclusive, tzOffsetMinutes },
      totals: row.totals || { completed_count: 0, revenue_cents: 0 },
      daily: row.daily || [],
      weekly: row.weekly || [],
      monthly: row.monthly || [],
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;