// routes/adminMetricsSurvey.js
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

router.get("/admin/metrics/survey", requireAuth, async (req, res, next) => {
  try {
    const { start, end } = querySchema.parse(req.query);

    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const ok = await requireSuperUserByDb(userId);
    if (!ok) return res.status(403).json({ ok: false, message: "Forbidden" });

    // ✅ Default range: last 30 days rolling ending today (exclusive)
    const now = new Date();
    const endDefault = toISODateOnlyLocal(now);
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

    // Counts by source_code (include zeros for active sources)
    const countsRes = await pool.query(
      `
      WITH params AS (
        SELECT $1::date AS start_date, $2::date AS end_date
      )
      SELECT
        s.code,
        s.label,
        COALESCE(COUNT(r.*), 0)::int AS count
      FROM survey_sources s
      LEFT JOIN booking_survey_responses r
        ON r.source_code = s.code
       AND r.created_at >= (SELECT start_date FROM params)
       AND r.created_at <  (SELECT end_date   FROM params)
      WHERE s.is_active = true
      GROUP BY s.code, s.label, s.sort_order
      ORDER BY s.sort_order ASC, s.code ASC
      `,
      [startDate, endDate]
    );

    // Top 3 other_text suggestions (normalized)
    const otherRes = await pool.query(
      `
      WITH params AS (
        SELECT $1::date AS start_date, $2::date AS end_date
      ),
      cleaned AS (
        SELECT
          lower(trim(regexp_replace(coalesce(other_text,''), '\\s+', ' ', 'g'))) AS val
        FROM booking_survey_responses r, params p
        WHERE r.source_code = 'other'
          AND r.created_at >= p.start_date
          AND r.created_at <  p.end_date
      )
      SELECT val, COUNT(*)::int AS count
      FROM cleaned
      WHERE val IS NOT NULL
        AND val <> ''
        AND val <> 'n/a'
        AND val <> 'na'
        AND val <> 'none'
      GROUP BY val
      ORDER BY count DESC, val ASC
      LIMIT 3
      `,
      [startDate, endDate]
    );

    const counts = countsRes.rows || [];
    const total = counts.reduce((sum, r) => sum + Number(r.count || 0), 0);

    return res.json({
      ok: true,
      range: { start: startDate, end_exclusive: endDate, days: diffDays },
      total_responses: total,
      counts, // [{code,label,count}]
      top_other: otherRes.rows || [], // [{val,count}] (no referred names included)
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;