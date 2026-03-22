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

    const countsRes = await pool.query(
      `
      WITH params AS (
        SELECT $1::timestamptz AS start_ts,
               $2::timestamptz AS end_ts
      ),
      defs AS (
        SELECT * FROM (VALUES
          ('linkedin'::text, 'LinkedIn'::text, 10::int),
          ('google'::text, 'Google'::text, 20::int),
          ('instagram'::text, 'Instagram'::text, 30::int),
          ('facebook'::text, 'Facebook'::text, 40::int),
          ('referral'::text, 'Referral'::text, 50::int),
          ('other'::text, 'Other'::text, 60::int)
        ) AS v(code, label, sort_order)
      ),
      normalized AS (
        SELECT
          CASE
            WHEN heard_from IS NULL THEN 'other'
            WHEN lower(trim(heard_from)) = 'linkedin' THEN 'linkedin'
            WHEN lower(trim(heard_from)) = 'google' THEN 'google'
            WHEN lower(trim(heard_from)) IN ('instagram','ig') THEN 'instagram'
            WHEN lower(trim(heard_from)) IN ('facebook','fb') THEN 'facebook'
            WHEN lower(trim(heard_from)) IN ('referred','referral','word of mouth','word-of-mouth') THEN 'referral'
            WHEN lower(trim(heard_from)) = 'other' THEN 'other'
            ELSE 'other'
          END AS code,
          other_text
        FROM booking_survey_responses r, params p
        WHERE r.submitted_at >= p.start_ts
          AND r.submitted_at <  p.end_ts
      )
      SELECT
        d.code,
        d.label,
        COALESCE(COUNT(n.*), 0)::int AS count
      FROM defs d
      LEFT JOIN normalized n ON n.code = d.code
      GROUP BY d.code, d.label, d.sort_order
      ORDER BY d.sort_order ASC
      `,
      [`${startDate}T00:00:00Z`, `${endDate}T00:00:00Z`]
    );

    const otherRes = await pool.query(
      `
      WITH params AS (
        SELECT $1::timestamptz AS start_ts,
               $2::timestamptz AS end_ts
      ),
      cleaned AS (
        SELECT
          lower(trim(regexp_replace(coalesce(other_text,''), '\\s+', ' ', 'g'))) AS val
        FROM booking_survey_responses r, params p
        WHERE r.submitted_at >= p.start_ts
          AND r.submitted_at <  p.end_ts
          AND (
            heard_from IS NULL
            OR lower(trim(heard_from)) = 'other'
            OR lower(trim(heard_from)) NOT IN ('linkedin','google','instagram','facebook','referral')
          )
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
      [`${startDate}T00:00:00Z`, `${endDate}T00:00:00Z`]
    );

    const counts = countsRes.rows || [];
    const total = counts.reduce((sum, r) => sum + Number(r.count || 0), 0);

    return res.json({
      ok: true,
      range: { start: startDate, end_exclusive: endDate, days: diffDays },
      total_responses: total,
      counts,
      top_other: otherRes.rows || [],
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /admin/metrics/survey/referrals
 * Superuser only.
 * Returns all "referral" survey responses with customer name and who referred them.
 * Ordered by most recent first.
 */
router.get("/admin/metrics/survey/referrals", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const ok = await requireSuperUserByDb(userId);
    if (!ok) return res.status(403).json({ ok: false, message: "Forbidden" });

    const { start, end } = querySchema.parse(req.query);

    const now = new Date();
    // Default end: tomorrow (exclusive) so today's submissions are included
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const endDefault = toISODateOnlyLocal(tomorrow);
    // Default start: all-time
    const startDate = parseDateOnly(start || "") || "2000-01-01";
    const endDate = parseDateOnly(end || "") || endDefault;

    const startMs = new Date(`${startDate}T00:00:00Z`).getTime();
    const endMs = new Date(`${endDate}T00:00:00Z`).getTime();
    if (!(endMs > startMs)) {
      return res.status(400).json({ ok: false, message: "Invalid range: end must be after start" });
    }

    const r = await pool.query(
      `
      SELECT
        u.first_name                          AS customer_first_name,
        u.last_name                           AS customer_last_name,
        u.account_type                        AS customer_type,
        trim(bsr.referrer_name)               AS referred_by,
        bsr.submitted_at
      FROM booking_survey_responses bsr
      JOIN users u ON u.id = bsr.user_id
      WHERE
        lower(trim(bsr.heard_from)) IN ('referral', 'referred', 'word of mouth', 'word-of-mouth')
        AND bsr.referrer_name IS NOT NULL
        AND length(trim(bsr.referrer_name)) > 0
        AND bsr.submitted_at >= $1::timestamptz
        AND bsr.submitted_at <  $2::timestamptz
      ORDER BY bsr.submitted_at DESC
      `,
      [`${startDate}T00:00:00Z`, `${endDate}T00:00:00Z`]
    );

    return res.json({
      ok: true,
      range: { start: startDate, end_exclusive: endDate },
      total: r.rows.length,
      referrals: r.rows,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;