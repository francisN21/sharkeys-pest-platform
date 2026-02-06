const express = require("express");
const { pool } = require("../src/db");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT public_id, title, description, sort_order, base_price_cents, duration_minutes
       FROM services
       WHERE is_active = true
       ORDER BY sort_order ASC, title ASC`
    );
    res.json({ ok: true, services: r.rows });
  } catch (e) {
    next(e);
  }
});

module.exports = router;