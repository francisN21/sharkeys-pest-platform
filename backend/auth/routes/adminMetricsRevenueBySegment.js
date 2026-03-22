// routes/adminMetricsRevenueBySegment.js
const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

const querySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // exclusive
  tzOffsetMinutes: z
    .union([z.string().regex(/^-?\d+$/), z.number().int()])
    .optional()
    .transform((v) => (v === undefined ? 0 : Number(v))),
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
 * GET /admin/metrics/revenue-by-segment
 * Superuser only.
 * Returns revenue + booking KPIs per customer account_type (residential, business, unknown).
 * Also returns monthly breakdown per segment.
 */
router.get("/admin/metrics/revenue-by-segment", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const ok = await requireSuperUserByDb(userId);
    if (!ok) return res.status(403).json({ ok: false, message: "Forbidden" });

    const parsed = querySchema.parse(req.query);
    const start = parsed.start ?? dateOnlyMonthsAgoUtc(6);
    const endExclusive = parsed.end ?? dateOnlyTodayUtc();
    const tzOffsetMinutes = Number.isFinite(parsed.tzOffsetMinutes) ? parsed.tzOffsetMinutes : 0;

    const startMs = new Date(`${start}T00:00:00Z`).getTime();
    const endMs = new Date(`${endExclusive}T00:00:00Z`).getTime();
    if (!(endMs > startMs)) {
      return res.status(400).json({ ok: false, message: "Invalid range: end must be after start" });
    }

    const r = await pool.query(
      `
      WITH completed AS (
        SELECT
          COALESCE(u.account_type, 'unknown')                                      AS segment,
          b.customer_user_id,
          COALESCE(bp.final_price_cents, bp.initial_price_cents, s.base_price_cents, 0) AS revenue_cents,
          date_trunc('month', (b.completed_at - make_interval(mins => $3)))::date  AS month_start
        FROM bookings b
        JOIN users u ON u.id = b.customer_user_id
        JOIN services s ON s.id = b.service_id
        LEFT JOIN booking_prices bp ON bp.booking_id = b.id
        WHERE
          b.status = 'completed'
          AND b.customer_user_id IS NOT NULL
          AND b.completed_at IS NOT NULL
          AND (b.completed_at - make_interval(mins => $3)) >= ($1::date)::timestamp
          AND (b.completed_at - make_interval(mins => $3)) <  ($2::date)::timestamp
      ),
      by_segment AS (
        SELECT
          segment,
          COUNT(*)::int                               AS completed_bookings,
          COUNT(DISTINCT customer_user_id)::int       AS unique_customers,
          SUM(revenue_cents)::bigint                  AS revenue_cents,
          ROUND(AVG(revenue_cents)::numeric, 0)::bigint AS avg_revenue_per_booking,
          ROUND(
            SUM(revenue_cents)::numeric / NULLIF(COUNT(DISTINCT customer_user_id), 0),
            0
          )::bigint AS avg_revenue_per_customer
        FROM completed
        GROUP BY segment
        ORDER BY revenue_cents DESC
      ),
      by_segment_month AS (
        SELECT
          segment,
          month_start,
          COUNT(*)::int          AS completed_bookings,
          SUM(revenue_cents)::bigint AS revenue_cents
        FROM completed
        GROUP BY segment, month_start
        ORDER BY segment ASC, month_start ASC
      )
      SELECT
        (SELECT json_agg(by_segment)       FROM by_segment)       AS by_segment,
        (SELECT json_agg(by_segment_month) FROM by_segment_month) AS by_segment_month
      `,
      [start, endExclusive, tzOffsetMinutes]
    );

    const row = r.rows[0] || {};
    return res.json({
      ok: true,
      range: { start, end_exclusive: endExclusive, tzOffsetMinutes },
      by_segment: row.by_segment || [],
      by_segment_month: row.by_segment_month || [],
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
