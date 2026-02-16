// routes/bookingsMe.js
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
      WITH latest_assignment AS (
        SELECT DISTINCT ON (ba.booking_id)
          ba.booking_id,
          ba.worker_user_id,
          ba.assigned_at
        FROM booking_assignments ba
        ORDER BY ba.booking_id, ba.assigned_at DESC
      ),
      latest_completed_event AS (
        -- If your "complete booking" route logs an event_type='completed'
        -- and uses actor_user_id as the tech who completed it, we can display that.
        SELECT DISTINCT ON (be.booking_id)
          be.booking_id,
          be.actor_user_id,
          be.created_at AS completed_event_at
        FROM booking_events be
        WHERE be.event_type = 'completed'
          AND be.actor_user_id IS NOT NULL
        ORDER BY be.booking_id, be.created_at DESC
      )
      SELECT
        b.public_id,
        b.status,
        b.starts_at,
        b.ends_at,
        b.address,
        b.notes,
        b.created_at,
        b.completed_at,
        b.cancelled_at,
        s.title AS service_title,

        -- ✅ Assigned tech (latest assignment)
        aw.public_id AS assigned_worker_public_id,
        aw.first_name AS assigned_worker_first_name,
        aw.last_name  AS assigned_worker_last_name,
        aw.phone      AS assigned_worker_phone,
        aw.email      AS assigned_worker_email,
        la.assigned_at AS assigned_at,

        -- ✅ Completed by (best-effort)
        cw.public_id AS completed_by_public_id,
        cw.first_name AS completed_by_first_name,
        cw.last_name  AS completed_by_last_name,
        cw.phone      AS completed_by_phone,
        cw.email      AS completed_by_email,
        lce.completed_event_at

      FROM bookings b
      JOIN services s ON s.id = b.service_id

      LEFT JOIN latest_assignment la ON la.booking_id = b.id
      LEFT JOIN users aw ON aw.id = la.worker_user_id

      LEFT JOIN latest_completed_event lce ON lce.booking_id = b.id
      LEFT JOIN users cw ON cw.id = lce.actor_user_id

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