// routes/adminMetricsBookings.js
const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

// Accept date range: start/end in YYYY-MM-DD.
// end is EXCLUSIVE (recommended for clean range math).
const querySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
});

async function requireSuperUserByDb(userId) {
  const rolesRes = await pool.query(`SELECT role FROM user_roles WHERE user_id = $1`, [userId]);
  const roles = rolesRes.rows.map((r) => r.role);
  return roles.includes("superuser");
}

function toISODateOnly(d) {
  // returns YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateOnly(s) {
  // expects YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return s; // keep as date-only string; Postgres can cast to date
}

router.get("/admin/metrics/bookings", requireAuth, async (req, res, next) => {
  try {
    const { start, end } = querySchema.parse(req.query);

    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const ok = await requireSuperUserByDb(userId);
    if (!ok) return res.status(403).json({ ok: false, message: "Forbidden" });

    // ✅ Default range: last 90 days rolling from "today"
    const now = new Date();
    const endDefault = toISODateOnly(now); // today date-only
    const startDefault = toISODateOnly(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000));

    const startDate = parseDateOnly(start || "") || startDefault;
    const endDate = parseDateOnly(end || "") || endDefault;

    // Guard: end must be after start
    // Also clamp max range (optional but recommended): 365 days
    // We'll do it in SQL-safe manner by checking in JS first.
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

    const r = await pool.query(
      `
      WITH params AS (
        SELECT
          $1::date AS start_date,
          $2::date AS end_date, -- exclusive
          date_trunc('month', $1::date)::date AS start_month,
          date_trunc('month', ($2::date - interval '1 day'))::date AS end_month_inclusive
      ),
      totals AS (
        SELECT
          COUNT(*) FILTER (WHERE created_at >= (SELECT start_date FROM params)
                           AND created_at <  (SELECT end_date   FROM params))::int AS bookings_in_range,

          COUNT(*) FILTER (WHERE status = 'completed'
                           AND created_at >= (SELECT start_date FROM params)
                           AND created_at <  (SELECT end_date   FROM params))::int AS completed_in_range,

          COUNT(*) FILTER (WHERE status = 'cancelled'
                           AND created_at >= (SELECT start_date FROM params)
                           AND created_at <  (SELECT end_date   FROM params))::int AS cancelled_in_range,

          COUNT(*) FILTER (WHERE status = 'pending'
                           AND created_at >= (SELECT start_date FROM params)
                           AND created_at <  (SELECT end_date   FROM params))::int AS pending_in_range,

          COUNT(*) FILTER (WHERE status = 'accepted'
                           AND created_at >= (SELECT start_date FROM params)
                           AND created_at <  (SELECT end_date   FROM params))::int AS accepted_in_range,

          COUNT(*) FILTER (WHERE status = 'assigned'
                           AND created_at >= (SELECT start_date FROM params)
                           AND created_at <  (SELECT end_date   FROM params))::int AS assigned_in_range,

          -- keep useful all-time totals too
          COUNT(*)::int AS bookings_all_time,
          COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_all_time,
          COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_all_time
        FROM bookings
      ),
      months_series AS (
        SELECT
          date_trunc('month', d)::date AS month_start
        FROM params p,
        generate_series(p.start_month, p.end_month_inclusive, interval '1 month') AS d
        ORDER BY month_start
      ),
      monthly AS (
        SELECT
          ms.month_start,
          COALESCE((
            SELECT COUNT(*)::int
            FROM bookings b, params p
            WHERE b.created_at >= GREATEST(ms.month_start, p.start_date)
              AND b.created_at <  LEAST(ms.month_start + interval '1 month', p.end_date)
          ), 0) AS created_count,
          COALESCE((
            SELECT COUNT(*)::int
            FROM bookings b, params p
            WHERE b.status = 'completed'
              AND b.created_at >= GREATEST(ms.month_start, p.start_date)
              AND b.created_at <  LEAST(ms.month_start + interval '1 month', p.end_date)
          ), 0) AS completed_count,
          COALESCE((
            SELECT COUNT(*)::int
            FROM bookings b, params p
            WHERE b.status = 'cancelled'
              AND b.created_at >= GREATEST(ms.month_start, p.start_date)
              AND b.created_at <  LEAST(ms.month_start + interval '1 month', p.end_date)
          ), 0) AS cancelled_count
        FROM months_series ms
      )
      SELECT
        (SELECT row_to_json(totals) FROM totals) AS totals,
        (SELECT json_agg(monthly) FROM monthly) AS monthly
      `,
      [startDate, endDate]
    );

    const row = r.rows[0] || {};
    const totals = row.totals || {};
    const monthly = row.monthly || [];

    const inRange = Number(totals.bookings_in_range || 0);
    const completedInRange = Number(totals.completed_in_range || 0);
    const completionRate =
      inRange > 0 ? Math.round((completedInRange / inRange) * 1000) / 10 : 0;

    return res.json({
      ok: true,
      range: { start: startDate, end_exclusive: endDate, days: diffDays },
      totals: {
        ...totals,
        completion_rate_percent: completionRate,
      },
      monthly,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;