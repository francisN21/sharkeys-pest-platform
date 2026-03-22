// routes/adminSystemLogs.js
const express = require("express");
const fs = require("fs");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");
const { getSuspiciousLogPath } = require("../middleware/suspiciousFileLogger");

const router = express.Router();

async function requireSuperuser(req, res) {
  const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
  if (!roles.includes("superuser")) {
    res.status(403).json({ ok: false, message: "Forbidden" });
    return false;
  }
  return true;
}

// ─── GET /admin/system/sessions ──────────────────────────────────────────────
// All active (non-expired) sessions with user info.
router.get("/admin/system/sessions", requireAuth, async (req, res, next) => {
  try {
    if (!(await requireSuperuser(req, res))) return;

    const result = await pool.query(`
      SELECT
        s.id            AS session_id,
        s.user_id,
        s.created_at,
        s.last_seen_at,
        s.expires_at,
        u.email,
        u.first_name,
        u.last_name,
        array_agg(ur.role ORDER BY ur.role) FILTER (WHERE ur.role IS NOT NULL) AS roles
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN user_roles ur ON ur.user_id = s.user_id
      WHERE s.expires_at > now()
      GROUP BY s.id, s.user_id, s.created_at, s.last_seen_at, s.expires_at,
               u.email, u.first_name, u.last_name
      ORDER BY s.last_seen_at DESC
      LIMIT 200
    `);

    res.json({ ok: true, sessions: result.rows });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /admin/system/sessions/user/:userId ───────────────────────────────
// Clear ALL active sessions for a given user (force sign-out).
router.delete("/admin/system/sessions/user/:userId", requireAuth, async (req, res, next) => {
  try {
    if (!(await requireSuperuser(req, res))) return;

    const targetId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(targetId) || targetId <= 0) {
      return res.status(400).json({ ok: false, message: "Invalid userId" });
    }

    // Prevent clearing your own session accidentally
    if (targetId === req.user.id) {
      return res.status(400).json({ ok: false, message: "Cannot revoke your own sessions via this endpoint" });
    }

    const result = await pool.query(
      `DELETE FROM sessions WHERE user_id = $1 RETURNING id`,
      [targetId]
    );

    res.json({ ok: true, cleared: result.rowCount });
  } catch (err) {
    next(err);
  }
});

// ─── GET /admin/system/tokens ─────────────────────────────────────────────────
// Pending (unconsumed, non-expired) tokens of all types.
router.get("/admin/system/tokens", requireAuth, async (req, res, next) => {
  try {
    if (!(await requireSuperuser(req, res))) return;

    const [empInvites, leadInvites, pwResets] = await Promise.all([
      // Employee invites
      pool.query(`
        SELECT
          ei.id,
          ei.user_id,
          ei.invited_role,
          ei.expires_at,
          ei.created_at,
          u.email        AS user_email,
          u.first_name,
          u.last_name,
          ib.email       AS invited_by_email
        FROM employee_invites ei
        JOIN users u  ON u.id  = ei.user_id
        JOIN users ib ON ib.id = ei.invited_by_user_id
        WHERE ei.consumed_at IS NULL
          AND ei.expires_at > now()
        ORDER BY ei.created_at DESC
        LIMIT 100
      `),

      // Lead account invites
      pool.query(`
        SELECT
          lai.id,
          lai.lead_id,
          lai.expires_at,
          lai.created_at,
          l.email        AS lead_email,
          l.first_name,
          l.last_name,
          sb.email       AS sent_by_email
        FROM lead_account_invites lai
        JOIN leads l ON l.id = lai.lead_id
        LEFT JOIN users sb ON sb.id = lai.sent_by_user_id
        WHERE lai.consumed_at IS NULL
          AND lai.expires_at > now()
        ORDER BY lai.created_at DESC
        LIMIT 100
      `),

      // Password reset tokens
      pool.query(`
        SELECT
          prt.id,
          prt.user_id,
          prt.expires_at,
          prt.created_at,
          u.email,
          u.first_name,
          u.last_name
        FROM password_reset_tokens prt
        JOIN users u ON u.id = prt.user_id
        WHERE prt.consumed_at IS NULL
          AND prt.expires_at > now()
        ORDER BY prt.created_at DESC
        LIMIT 100
      `),
    ]);

    res.json({
      ok: true,
      employee_invites: empInvites.rows,
      lead_invites: leadInvites.rows,
      password_resets: pwResets.rows,
    });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /admin/system/tokens/employee-invite/:id ─────────────────────────
router.delete("/admin/system/tokens/employee-invite/:id", requireAuth, async (req, res, next) => {
  try {
    if (!(await requireSuperuser(req, res))) return;

    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: "Invalid id" });
    }

    const result = await pool.query(
      `DELETE FROM employee_invites WHERE id = $1 AND consumed_at IS NULL RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: "Invite not found or already consumed" });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /admin/system/tokens/lead-invite/:id ─────────────────────────────
router.delete("/admin/system/tokens/lead-invite/:id", requireAuth, async (req, res, next) => {
  try {
    if (!(await requireSuperuser(req, res))) return;

    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: "Invalid id" });
    }

    const result = await pool.query(
      `DELETE FROM lead_account_invites WHERE id = $1 AND consumed_at IS NULL RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: "Invite not found or already consumed" });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /admin/system/tokens/password-reset/:id ──────────────────────────
router.delete("/admin/system/tokens/password-reset/:id", requireAuth, async (req, res, next) => {
  try {
    if (!(await requireSuperuser(req, res))) return;

    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: "Invalid id" });
    }

    const result = await pool.query(
      `DELETE FROM password_reset_tokens WHERE id = $1 AND consumed_at IS NULL RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, message: "Token not found or already consumed" });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── GET /admin/system/suspicious-log ────────────────────────────────────────
// Last N lines from the suspiciousInput.txt JSONL file.
router.get("/admin/system/suspicious-log", requireAuth, async (req, res, next) => {
  try {
    if (!(await requireSuperuser(req, res))) return;

    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit ?? "100", 10) || 100));
    const logPath = getSuspiciousLogPath();

    if (!fs.existsSync(logPath)) {
      return res.json({ ok: true, entries: [], total_lines: 0 });
    }

    const raw = fs.readFileSync(logPath, "utf8");
    const lines = raw.split("\n").filter((l) => l.trim());
    const tail = lines.slice(-limit);

    const entries = tail.map((line) => {
      try { return JSON.parse(line); } catch { return { raw: line }; }
    }).reverse(); // newest first

    res.json({ ok: true, entries, total_lines: lines.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
