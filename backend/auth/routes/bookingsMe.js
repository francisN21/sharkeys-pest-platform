const express = require("express");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user.id;

    const r = await pool.query(
      `
      SELECT b.public_id,
             b.status,
             b.starts_at,
             b.ends_at,
             b.address,
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

    res.json({ ok: true, upcoming, history });
  } catch (e) {
    next(e);
  }
});

module.exports = router;