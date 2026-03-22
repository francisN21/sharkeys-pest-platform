// routes/adminMetricsRevenueByService.js
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
 * GET /admin/metrics/revenue-by-service
 * Superuser only.
 * Returns completed booking revenue grouped by service × month.
 * Revenue fallback: COALESCE(final_price_cents, initial_price_cents, base_price_cents, 0)
 * Date range: [start, end) exclusive semantics on completed_at (tz-shifted).
 */
router.get("/admin/metrics/revenue-by-service", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const ok = await requireSuperUserByDb(userId);
    if (!ok) return res.status(403).json({ ok: false, message: "Forbidden" });

    const parsed = querySchema.parse(req.query);

    // Default: last 6 months
    const start = parsed.start ?? dateOnlyMonthsAgoUtc(6);
    const endExclusive = parsed.end ?? dateOnlyTodayUtc();
    const tzOffsetMinutes = Number.isFinite(parsed.tzOffsetMinutes) ? parsed.tzOffsetMinutes : 0;

    const startMs = new Date(`${start}T00:00:00Z`).getTime();
    const endMs = new Date(`${endExclusive}T00:00:00Z`).getTime();
    if (!(endMs > startMs)) {
      return res.status(400).json({ ok: false, message: "Invalid range: end must be after start" });
    }

    const q = `
      WITH base AS (
        SELECT
          s.id            AS service_id,
          s.title         AS service_name,
          date_trunc('month', (b.completed_at - make_interval(mins => $3)))::date AS month_start,
          COALESCE(bp.final_price_cents, bp.initial_price_cents, s.base_price_cents, 0) AS revenue_cents
        FROM bookings b
        JOIN services s ON s.id = b.service_id
        LEFT JOIN booking_prices bp ON bp.booking_id = b.id
        WHERE
          b.status = 'completed'
          AND b.completed_at IS NOT NULL
          AND (b.completed_at - make_interval(mins => $3)) >= ($1::date)::timestamp
          AND (b.completed_at - make_interval(mins => $3)) <  ($2::date)::timestamp
      ),
      by_service_month AS (
        SELECT
          service_id,
          service_name,
          month_start,
          COUNT(*)::int        AS completed_count,
          SUM(revenue_cents)::bigint AS revenue_cents
        FROM base
        GROUP BY service_id, service_name, month_start
        ORDER BY service_name ASC, month_start ASC
      ),
      by_service_total AS (
        SELECT
          service_id,
          service_name,
          COUNT(*)::int        AS completed_count,
          SUM(revenue_cents)::bigint AS revenue_cents
        FROM base
        GROUP BY service_id, service_name
        ORDER BY revenue_cents DESC
      )
      SELECT
        (SELECT json_agg(by_service_month)  FROM by_service_month)  AS by_service_month,
        (SELECT json_agg(by_service_total)  FROM by_service_total)  AS by_service_total
    `;

    const r = await pool.query(q, [start, endExclusive, tzOffsetMinutes]);
    const row = r.rows[0] || {};

    return res.json({
      ok: true,
      range: { start, end_exclusive: endExclusive, tzOffsetMinutes },
      by_service_month: row.by_service_month || [],
      by_service_total: row.by_service_total || [],
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /admin/metrics/revenue-by-service/export
 * Superuser only. Returns same data as the JSON endpoint as a CSV download.
 * Columns: service, month, completed_jobs, revenue_usd
 */
router.get("/admin/metrics/revenue-by-service/export", requireAuth, async (req, res, next) => {
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
      SELECT
        s.title         AS service_name,
        date_trunc('month', (b.completed_at - make_interval(mins => $3)))::date AS month_start,
        COUNT(*)::int        AS completed_count,
        SUM(COALESCE(bp.final_price_cents, bp.initial_price_cents, s.base_price_cents, 0))::bigint AS revenue_cents
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      LEFT JOIN booking_prices bp ON bp.booking_id = b.id
      WHERE
        b.status = 'completed'
        AND b.completed_at IS NOT NULL
        AND (b.completed_at - make_interval(mins => $3)) >= ($1::date)::timestamp
        AND (b.completed_at - make_interval(mins => $3)) <  ($2::date)::timestamp
      GROUP BY s.title, month_start
      ORDER BY s.title ASC, month_start ASC
      `,
      [start, endExclusive, tzOffsetMinutes]
    );

    const rows = r.rows;
    const lines = ["service,month,completed_jobs,revenue_usd"];
    for (const row of rows) {
      const service = `"${String(row.service_name).replace(/"/g, '""')}"`;
      const month = row.month_start ? String(row.month_start).slice(0, 7) : "";
      const jobs = Number(row.completed_count || 0);
      const revenue = (Number(row.revenue_cents || 0) / 100).toFixed(2);
      lines.push(`${service},${month},${jobs},${revenue}`);
    }

    const csv = lines.join("\r\n");
    const filename = `revenue_by_service_${start}_to_${endExclusive}.csv`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
