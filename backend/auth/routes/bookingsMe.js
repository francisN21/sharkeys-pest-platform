const express = require("express");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    // ✅ requireAuth should set req.auth = { userId, expiresAt, ... }
    const userId = req.auth?.userId;

    if (!userId) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }
    const r = await pool.query(
      `
      SELECT b.public_id,
             b.status,
             b.starts_at,
             b.ends_at,
             b.address,
             b.notes,
             b.created_at,
             b.completed_at,
             b.cancelled_at,
             s.title AS service_title
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      WHERE b.customer_user_id = $1
      ORDER BY b.starts_at DESC
      `,
      [userId]
    );

    const upcoming = [];
    const history = [];
    for (const row of r.rows) {
      if (row.status === "completed" || row.status === "cancelled") history.push(row);
      else upcoming.push(row);
    }
    
    history.sort((a, b) => {
      const at = new Date(a.completed_at ?? a.cancelled_at ?? a.starts_at).getTime();
      const bt = new Date(b.completed_at ?? b.cancelled_at ?? b.starts_at).getTime();
    return bt - at;
    });

    res.json({ ok: true, upcoming, history });
  } catch (e) {
    next(e);
  }
});

module.exports = router;