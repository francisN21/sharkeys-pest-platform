// routes/adminMetricsRepeatCustomers.js
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
 * GET /admin/metrics/repeat-customers
 * Superuser only.
 * Returns repeat customer rate + top repeat customers.
 * A "repeat customer" has 2+ bookings (any status except cancelled) in range.
 */
router.get("/admin/metrics/repeat-customers", requireAuth, async (req, res, next) => {
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
      WITH booking_counts AS (
        SELECT
          b.customer_user_id,
          COUNT(*) FILTER (WHERE b.status <> 'cancelled')::int AS booking_count,
          COUNT(*) FILTER (WHERE b.status = 'completed')::int  AS completed_count,
          MAX(b.created_at)                                     AS last_booking_at
        FROM bookings b
        WHERE
          b.customer_user_id IS NOT NULL
          AND b.created_at >= ($1::date)::timestamp
          AND b.created_at <  ($2::date)::timestamp
        GROUP BY b.customer_user_id
      ),
      totals AS (
        SELECT
          COUNT(*)::int                                       AS total_customers,
          COUNT(*) FILTER (WHERE booking_count >= 2)::int    AS repeat_customers,
          COUNT(*) FILTER (WHERE booking_count = 1)::int     AS one_time_customers,
          ROUND(
            COUNT(*) FILTER (WHERE booking_count >= 2)::numeric
            / NULLIF(COUNT(*), 0) * 100,
            1
          ) AS repeat_rate_percent
        FROM booking_counts
      ),
      top_repeat AS (
        SELECT
          bc.customer_user_id,
          u.first_name,
          u.last_name,
          u.account_type,
          bc.booking_count,
          bc.completed_count,
          bc.last_booking_at
        FROM booking_counts bc
        JOIN users u ON u.id = bc.customer_user_id
        WHERE bc.booking_count >= 2
        ORDER BY bc.booking_count DESC, bc.completed_count DESC
        LIMIT 20
      )
      SELECT
        (SELECT row_to_json(totals) FROM totals)   AS totals,
        (SELECT json_agg(top_repeat) FROM top_repeat) AS top_repeat
      `,
      [start, endExclusive]
    );

    const row = r.rows[0] || {};
    return res.json({
      ok: true,
      range: { start, end_exclusive: endExclusive },
      totals: row.totals || {
        total_customers: 0,
        repeat_customers: 0,
        one_time_customers: 0,
        repeat_rate_percent: 0,
      },
      top_repeat: row.top_repeat || [],
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
