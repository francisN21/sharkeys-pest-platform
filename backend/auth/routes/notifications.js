const express = require("express");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

router.get("/notifications", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 25)));
    const unreadOnly = String(req.query.unreadOnly || "false") === "true";

    const params = [userId, limit];
    const where = [`user_id = $1`];

    if (unreadOnly) {
      where.push(`read_at IS NULL`);
    }

    const r = await pool.query(
      `
      SELECT
        id,
        kind,
        title,
        body,
        booking_id,
        booking_public_id,
        message_id,
        metadata,
        read_at,
        created_at
      FROM notifications
      WHERE ${where.join(" AND ")}
      ORDER BY created_at DESC
      LIMIT $2
      `,
      params
    );

    return res.json({ ok: true, notifications: r.rows });
  } catch (e) {
    next(e);
  }
});

router.get("/notifications/unread-count", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const r = await pool.query(
      `
      SELECT COUNT(*)::int AS unread_count
      FROM notifications
      WHERE user_id = $1
        AND read_at IS NULL
      `,
      [userId]
    );

    return res.json({
      ok: true,
      unread_count: r.rows[0]?.unread_count ?? 0,
    });
  } catch (e) {
    next(e);
  }
});

router.patch("/notifications/:id/read", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ ok: false, message: "Invalid notification id" });
    }

    const r = await pool.query(
      `
      UPDATE notifications
      SET read_at = COALESCE(read_at, now())
      WHERE id = $1
        AND user_id = $2
      RETURNING id, read_at
      `,
      [id, userId]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ ok: false, message: "Notification not found" });
    }

    return res.json({ ok: true, notification: r.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.patch("/notifications/read-all", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    await pool.query(
      `
      UPDATE notifications
      SET read_at = COALESCE(read_at, now())
      WHERE user_id = $1
        AND read_at IS NULL
      `,
      [userId]
    );

    return res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;