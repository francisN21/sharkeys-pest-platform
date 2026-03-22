// routes/adminMetricsTechnicianPerformance.js
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
 * GET /admin/metrics/technician-performance
 * Superuser only.
 * Returns per-technician KPIs: completed, assigned, cancelled counts,
 * total revenue, and average completion time (hours).
 * Filtered to bookings assigned_at within [start, end).
 */
router.get("/admin/metrics/technician-performance", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const ok = await requireSuperUserByDb(userId);
    if (!ok) return res.status(403).json({ ok: false, message: "Forbidden" });

    const parsed = querySchema.parse(req.query);

    // Default: last 6 months
    const start = parsed.start ?? dateOnlyMonthsAgoUtc(6);
    const endExclusive = parsed.end ?? dateOnlyTodayUtc();

    const startMs = new Date(`${start}T00:00:00Z`).getTime();
    const endMs = new Date(`${endExclusive}T00:00:00Z`).getTime();
    if (!(endMs > startMs)) {
      return res.status(400).json({ ok: false, message: "Invalid range: end must be after start" });
    }

    const q = `
      WITH assigned_bookings AS (
        SELECT
          b.id,
          b.status,
          b.completed_at,
          ba.worker_user_id,
          ba.assigned_at,
          COALESCE(bp.final_price_cents, bp.initial_price_cents, s.base_price_cents, 0) AS revenue_cents
        FROM booking_assignments ba
        JOIN bookings b ON b.id = ba.booking_id
        JOIN services s ON s.id = b.service_id
        LEFT JOIN booking_prices bp ON bp.booking_id = b.id
        WHERE
          ba.assigned_at >= ($1::date)::timestamp
          AND ba.assigned_at <  ($2::date)::timestamp
      ),
      tech_stats AS (
        SELECT
          ab.worker_user_id AS worker_id,
          u.first_name,
          u.last_name,
          COUNT(*)::int AS total_assigned,
          COUNT(*) FILTER (WHERE ab.status = 'completed')::int AS completed_count,
          COUNT(*) FILTER (WHERE ab.status = 'cancelled')::int AS cancelled_count,
          COUNT(*) FILTER (WHERE ab.status IN ('assigned', 'accepted', 'pending'))::int AS active_count,
          COALESCE(SUM(ab.revenue_cents) FILTER (WHERE ab.status = 'completed'), 0)::bigint AS revenue_cents,
          ROUND(
            AVG(
              EXTRACT(EPOCH FROM (ab.completed_at - ab.assigned_at)) / 3600.0
            ) FILTER (WHERE ab.status = 'completed' AND ab.completed_at IS NOT NULL),
            2
          ) AS avg_completion_hours
        FROM assigned_bookings ab
        JOIN users u ON u.id = ab.worker_user_id
        GROUP BY ab.worker_user_id, u.first_name, u.last_name
        ORDER BY completed_count DESC, revenue_cents DESC
      )
      SELECT json_agg(tech_stats) AS technicians FROM tech_stats
    `;

    const r = await pool.query(q, [start, endExclusive]);
    const row = r.rows[0] || {};

    return res.json({
      ok: true,
      range: { start, end_exclusive: endExclusive },
      technicians: row.technicians || [],
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /admin/metrics/technician-performance/export
 * Superuser only. Returns technician KPIs as a CSV download.
 * Columns: technician, total_assigned, completed, active, cancelled, completion_rate_pct, revenue_usd, avg_completion_hours
 */
router.get("/admin/metrics/technician-performance/export", requireAuth, async (req, res, next) => {
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
      WITH assigned_bookings AS (
        SELECT
          b.status,
          b.completed_at,
          ba.worker_user_id,
          ba.assigned_at,
          COALESCE(bp.final_price_cents, bp.initial_price_cents, s.base_price_cents, 0) AS revenue_cents
        FROM booking_assignments ba
        JOIN bookings b ON b.id = ba.booking_id
        JOIN services s ON s.id = b.service_id
        LEFT JOIN booking_prices bp ON bp.booking_id = b.id
        WHERE
          ba.assigned_at >= ($1::date)::timestamp
          AND ba.assigned_at <  ($2::date)::timestamp
      )
      SELECT
        u.first_name,
        u.last_name,
        COUNT(*)::int AS total_assigned,
        COUNT(*) FILTER (WHERE ab.status = 'completed')::int AS completed_count,
        COUNT(*) FILTER (WHERE ab.status IN ('assigned', 'accepted', 'pending'))::int AS active_count,
        COUNT(*) FILTER (WHERE ab.status = 'cancelled')::int AS cancelled_count,
        COALESCE(SUM(ab.revenue_cents) FILTER (WHERE ab.status = 'completed'), 0)::bigint AS revenue_cents,
        ROUND(
          AVG(EXTRACT(EPOCH FROM (ab.completed_at - ab.assigned_at)) / 3600.0)
          FILTER (WHERE ab.status = 'completed' AND ab.completed_at IS NOT NULL),
          2
        ) AS avg_completion_hours
      FROM assigned_bookings ab
      JOIN users u ON u.id = ab.worker_user_id
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY completed_count DESC, revenue_cents DESC
      `,
      [start, endExclusive]
    );

    const lines = ["technician,total_assigned,completed,active,cancelled,completion_rate_pct,revenue_usd,avg_completion_hours"];
    for (const row of r.rows) {
      const name = `"${`${row.first_name} ${row.last_name}`.replace(/"/g, '""')}"`;
      const total = Number(row.total_assigned || 0);
      const completed = Number(row.completed_count || 0);
      const active = Number(row.active_count || 0);
      const cancelled = Number(row.cancelled_count || 0);
      const rate = total > 0 ? ((completed / total) * 100).toFixed(1) : "0.0";
      const revenue = (Number(row.revenue_cents || 0) / 100).toFixed(2);
      const avgHours = row.avg_completion_hours != null ? Number(row.avg_completion_hours).toFixed(2) : "";
      lines.push(`${name},${total},${completed},${active},${cancelled},${rate},${revenue},${avgHours}`);
    }

    const csv = lines.join("\r\n");
    const filename = `technician_performance_${start}_to_${endExclusive}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
