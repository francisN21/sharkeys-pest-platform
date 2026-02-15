// routes/bookingSurvey.js
const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

function getAuthedUserId(req) {
  return req.user?.id ?? req.auth?.userId ?? null;
}

// GET /survey/needed
// - returns { ok: true, needed: boolean }
// - needed = true if user has NOT submitted survey yet
router.get("/survey/needed", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthedUserId(req);
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const existing = await pool.query(
      `SELECT 1 FROM booking_survey_responses WHERE user_id = $1 LIMIT 1`,
      [userId]
    );

    return res.json({ ok: true, needed: existing.rowCount === 0 });
  } catch (e) {
    next(e);
  }
});

const submitSchema = z.object({
  bookingPublicId: z.string().uuid().optional(),
  heard_from: z.enum(["linkedin", "google", "instagram", "facebook", "referred", "other"]),
  referrer_name: z.string().trim().min(2).max(120).optional(),
  other_text: z.string().trim().min(2).max(200).optional(),
}).strict();

// POST /survey
router.post("/survey", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthedUserId(req);
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const payload = submitSchema.parse(req.body);

    // ✅ only once ever per user
    const existing = await pool.query(
      `SELECT id FROM booking_survey_responses WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (existing.rowCount > 0) {
      return res.status(200).json({ ok: true, already_submitted: true });
    }

    // Optional booking linkage
    let bookingId = null;
    if (payload.bookingPublicId) {
      const b = await pool.query(
        `SELECT id FROM bookings WHERE public_id = $1 LIMIT 1`,
        [payload.bookingPublicId]
      );
      if (b.rowCount > 0) bookingId = b.rows[0].id;
    }

    const heardFrom = payload.heard_from;
    const referrerName = heardFrom === "referred" ? (payload.referrer_name || null) : null;
    const otherText = heardFrom === "other" ? (payload.other_text || null) : null;

    await pool.query(
      `
      INSERT INTO booking_survey_responses
        (user_id, booking_id, heard_from, referrer_name, other_text, submitted_at)
      VALUES
        ($1, $2, $3, $4, $5, now())
      `,
      [userId, bookingId, heardFrom, referrerName, otherText]
    );

    return res.status(201).json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;