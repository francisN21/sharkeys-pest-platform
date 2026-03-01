// routes/adminMetricsLeadConversions.js
const express = require("express");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

/**
 * GET /admin/metrics/lead-conversions?days=30
 * - returns total + daily breakdown
 * - requires admin/superuser
 */
router.get("/admin/metrics/lead-conversions", requireAuth, requireRole("admin", "superuser"), async (req, res, next) => {
  try {
    const daysRaw = String(req.query.days || "30").trim();
    const days = /^\d+$/.test(daysRaw) ? Math.min(Math.max(Number(daysRaw), 1), 365) : 30;

    const totalRes = await pool.query(
      `SELECT COUNT(*)::bigint AS total FROM lead_conversions`
    );

    const dailyRes = await pool.query(
      `
      SELECT
        date_trunc('day', converted_at)::date AS day,
        COUNT(*)::bigint AS conversions
      FROM lead_conversions
      WHERE converted_at >= now() - ($1::int * interval '1 day')
      GROUP BY 1
      ORDER BY 1 DESC
      `,
      [days]
    );

    return res.json({
      ok: true,
      total: totalRes.rows[0]?.total ?? "0",
      days,
      daily: dailyRes.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;