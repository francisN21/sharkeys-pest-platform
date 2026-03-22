// routes/adminSystemLogs.js
const express = require("express");
const fs = require("fs");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");
const { getSuspiciousLogPath } = require("../middleware/suspiciousFileLogger");
const { ipThrottle } = require("../middleware/suspiciousInputLogger");
const { recordAuditLog } = require("../src/auditLog");

const router = express.Router();

async function requireSuperuser(req, res) {
  const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
  if (!roles.includes("superuser")) {
    res.status(403).json({ ok: false, message: "Forbidden" });
    return false;
  }
  return true;
}

// ─── SESSIONS ─────────────────────────────────────────────────────────────────

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

router.delete("/admin/system/sessions/user/:userId", requireAuth, async (req, res, next) => {
  try {
    if (!(await requireSuperuser(req, res))) return;

    const targetId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(targetId) || targetId <= 0) {
      return res.status(400).json({ ok: false, message: "Invalid userId" });
    }
    if (targetId === req.user.id) {
      return res.status(400).json({ ok: false, message: "Cannot revoke your own sessions via this endpoint" });
    }

    // Look up target email for audit
    const userRes = await pool.query(`SELECT email FROM users WHERE id = $1`, [targetId]);
    const targetEmail = userRes.rows[0]?.email ?? String(targetId);

    const result = await pool.query(
      `DELETE FROM sessions WHERE user_id = $1 RETURNING id`,
      [targetId]
    );

    await recordAuditLog(req.user.id, "session.clear", "user", String(targetId), {
      target_email: targetEmail,
      sessions_cleared: result.rowCount,
    });

    res.json({ ok: true, cleared: result.rowCount });
  } catch (err) {
    next(err);
  }
});

// ─── TOKENS (PENDING) ─────────────────────────────────────────────────────────

router.get("/admin/system/tokens", requireAuth, async (req, res, next) => {
  try {
    if (!(await requireSuperuser(req, res))) return;

    const [empInvites, leadInvites, pwResets] = await Promise.all([
      pool.query(`
        SELECT ei.id, ei.user_id, ei.invited_role, ei.expires_at, ei.created_at,
               u.email AS user_email, u.first_name, u.last_name,
               ib.email AS invited_by_email
        FROM employee_invites ei
        JOIN users u  ON u.id  = ei.user_id
        JOIN users ib ON ib.id = ei.invited_by_user_id
        WHERE ei.consumed_at IS NULL AND ei.expires_at > now()
        ORDER BY ei.created_at DESC LIMIT 100
      `),
      pool.query(`
        SELECT lai.id, lai.lead_id, lai.expires_at, lai.created_at,
               l.email AS lead_email, l.first_name, l.last_name,
               sb.email AS sent_by_email
        FROM lead_account_invites lai
        JOIN leads l ON l.id = lai.lead_id
        LEFT JOIN users sb ON sb.id = lai.sent_by_user_id
        WHERE lai.consumed_at IS NULL AND lai.expires_at > now()
        ORDER BY lai.created_at DESC LIMIT 100
      `),
      pool.query(`
        SELECT prt.id, prt.user_id, prt.expires_at, prt.created_at,
               u.email, u.first_name, u.last_name
        FROM password_reset_tokens prt
        JOIN users u ON u.id = prt.user_id
        WHERE prt.consumed_at IS NULL AND prt.expires_at > now()
        ORDER BY prt.created_at DESC LIMIT 100
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

router.delete("/admin/system/tokens/employee-invite/:id", requireAuth, async (req, res, next) => {
  try {
    if (!(await requireSuperuser(req, res))) return;

    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: "Invalid id" });
    }

    const lookup = await pool.query(
      `SELECT ei.id, u.email FROM employee_invites ei JOIN users u ON u.id = ei.user_id WHERE ei.id = $1 AND ei.consumed_at IS NULL`,
      [id]
    );
    if (lookup.rowCount === 0) {
      return res.status(404).json({ ok: false, message: "Invite not found or already consumed" });
    }

    await pool.query(`DELETE FROM employee_invites WHERE id = $1 AND consumed_at IS NULL`, [id]);

    await recordAuditLog(req.user.id, "token.revoke", "employee_invite", String(id), {
      target_email: lookup.rows[0].email,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/admin/system/tokens/lead-invite/:id", requireAuth, async (req, res, next) => {
  try {
    if (!(await requireSuperuser(req, res))) return;

    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: "Invalid id" });
    }

    const lookup = await pool.query(
      `SELECT lai.id, l.email FROM lead_account_invites lai JOIN leads l ON l.id = lai.lead_id WHERE lai.id = $1 AND lai.consumed_at IS NULL`,
      [id]
    );
    if (lookup.rowCount === 0) {
      return res.status(404).json({ ok: false, message: "Invite not found or already consumed" });
    }

    await pool.query(`DELETE FROM lead_account_invites WHERE id = $1 AND consumed_at IS NULL`, [id]);

    await recordAuditLog(req.user.id, "token.revoke", "lead_invite", String(id), {
      target_email: lookup.rows[0].email,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete("/admin/system/tokens/password-reset/:id", requireAuth, async (req, res, next) => {
  try {
    if (!(await requireSuperuser(req, res))) return;

    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ ok: false, message: "Invalid id" });
    }

    const lookup = await pool.query(
      `SELECT prt.id, u.email FROM password_reset_tokens prt JOIN users u ON u.id = prt.user_id WHERE prt.id = $1 AND prt.consumed_at IS NULL`,
      [id]
    );
    if (lookup.rowCount === 0) {
      return res.status(404).json({ ok: false, message: "Token not found or already consumed" });
    }

    await pool.query(`DELETE FROM password_reset_tokens WHERE id = $1 AND consumed_at IS NULL`, [id]);

    await recordAuditLog(req.user.id, "token.revoke", "password_reset", String(id), {
      target_email: lookup.rows[0].email,
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ─── TOKEN HISTORY ────────────────────────────────────────────────────────────

router.get("/admin/system/tokens/history", requireAuth, async (req, res, next) => {
  try {
    if (!(await requireSuperuser(req, res))) return;

    const [empInvites, leadInvites, pwResets] = await Promise.all([
      pool.query(`
        SELECT ei.id, ei.user_id, ei.invited_role, ei.expires_at, ei.created_at, ei.consumed_at,
               CASE WHEN ei.consumed_at IS NOT NULL THEN 'consumed'
                    WHEN ei.expires_at <= now() THEN 'expired'
                    ELSE 'active' END AS status,
               u.email AS user_email, u.first_name, u.last_name,
               ib.email AS invited_by_email
        FROM employee_invites ei
        JOIN users u  ON u.id  = ei.user_id
        JOIN users ib ON ib.id = ei.invited_by_user_id
        WHERE ei.consumed_at IS NOT NULL OR ei.expires_at <= now()
        ORDER BY COALESCE(ei.consumed_at, ei.expires_at) DESC
        LIMIT 100
      `),
      pool.query(`
        SELECT lai.id, lai.lead_id, lai.expires_at, lai.created_at, lai.consumed_at,
               CASE WHEN lai.consumed_at IS NOT NULL THEN 'consumed'
                    WHEN lai.expires_at <= now() THEN 'expired'
                    ELSE 'active' END AS status,
               l.email AS lead_email, l.first_name, l.last_name,
               sb.email AS sent_by_email
        FROM lead_account_invites lai
        JOIN leads l ON l.id = lai.lead_id
        LEFT JOIN users sb ON sb.id = lai.sent_by_user_id
        WHERE lai.consumed_at IS NOT NULL OR lai.expires_at <= now()
        ORDER BY COALESCE(lai.consumed_at, lai.expires_at) DESC
        LIMIT 100
      `),
      pool.query(`
        SELECT prt.id, prt.user_id, prt.expires_at, prt.created_at, prt.consumed_at,
               CASE WHEN prt.consumed_at IS NOT NULL THEN 'consumed'
                    WHEN prt.expires_at <= now() THEN 'expired'
                    ELSE 'active' END AS status,
               u.email, u.first_name, u.last_name
        FROM password_reset_tokens prt
        JOIN users u ON u.id = prt.user_id
        WHERE prt.consumed_at IS NOT NULL OR prt.expires_at <= now()
        ORDER BY COALESCE(prt.consumed_at, prt.expires_at) DESC
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

// ─── SUSPICIOUS LOG ───────────────────────────────────────────────────────────

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
    }).reverse();

    res.json({ ok: true, entries, total_lines: lines.length });
  } catch (err) {
    next(err);
  }
});

// ─── BLOCKED IPs ──────────────────────────────────────────────────────────────

router.get("/admin/system/blocked-ips", requireAuth, async (req, res, next) => {
  try {
    if (!(await requireSuperuser(req, res))) return;

    const entries = ipThrottle.list();
    res.json({ ok: true, entries });
  } catch (err) {
    next(err);
  }
});

router.delete("/admin/system/blocked-ips/:ip", requireAuth, async (req, res, next) => {
  try {
    if (!(await requireSuperuser(req, res))) return;

    const ip = req.params.ip;
    if (!ip || ip.length > 64) {
      return res.status(400).json({ ok: false, message: "Invalid IP" });
    }

    const existed = ipThrottle.clearIp(ip);

    await recordAuditLog(req.user.id, "ip.unblock", "ip", ip, {});

    res.json({ ok: true, existed });
  } catch (err) {
    next(err);
  }
});

// ─── LOGIN ATTEMPTS ───────────────────────────────────────────────────────────

router.get("/admin/system/login-attempts", requireAuth, async (req, res, next) => {
  try {
    if (!(await requireSuperuser(req, res))) return;

    const { email, ip, limit: limitQ } = req.query;
    const limit = Math.min(500, Math.max(1, parseInt(limitQ ?? "100", 10) || 100));

    const conditions = [];
    const params = [];

    if (email) {
      params.push(`%${String(email).toLowerCase()}%`);
      conditions.push(`la.email ILIKE $${params.length}`);
    }
    if (ip) {
      params.push(String(ip));
      conditions.push(`la.ip::text ILIKE $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    params.push(limit);

    const result = await pool.query(
      `SELECT la.id, la.email, la.ip, la.user_agent, la.reason, la.created_at
       FROM login_attempts la
       ${where}
       ORDER BY la.created_at DESC
       LIMIT $${params.length}`,
      params
    );

    res.json({ ok: true, attempts: result.rows });
  } catch (err) {
    next(err);
  }
});

// ─── ACCESS LOG ───────────────────────────────────────────────────────────────

router.get("/admin/system/access-log", requireAuth, async (req, res, next) => {
  try {
    if (!(await requireSuperuser(req, res))) return;

    const { path: pathQ, email, status, start, end, limit: limitQ } = req.query;
    const limit = Math.min(500, Math.max(1, parseInt(limitQ ?? "100", 10) || 100));

    const conditions = [];
    const params = [];

    if (pathQ) {
      params.push(`%${String(pathQ)}%`);
      conditions.push(`sae.path ILIKE $${params.length}`);
    }
    if (status) {
      const s = parseInt(status, 10);
      if (Number.isFinite(s)) {
        params.push(s);
        conditions.push(`sae.status_code = $${params.length}`);
      }
    }
    if (email) {
      params.push(`%${String(email).toLowerCase()}%`);
      conditions.push(`u.email ILIKE $${params.length}`);
    }
    if (start) {
      params.push(String(start));
      conditions.push(`sae.occurred_at >= $${params.length}::timestamptz`);
    }
    if (end) {
      params.push(String(end));
      conditions.push(`sae.occurred_at < $${params.length}::timestamptz`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    params.push(limit);

    const result = await pool.query(
      `SELECT sae.id, sae.occurred_at, sae.path, sae.method, sae.status_code,
              sae.ip, sae.user_agent, sae.referer,
              sae.metadata->>'duration_ms' AS duration_ms,
              u.email, u.first_name, u.last_name
       FROM site_access_events sae
       LEFT JOIN users u ON u.id = sae.user_id
       ${where}
       ORDER BY sae.occurred_at DESC
       LIMIT $${params.length}`,
      params
    );

    res.json({ ok: true, events: result.rows });
  } catch (err) {
    next(err);
  }
});

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────

router.get("/admin/system/audit-log", requireAuth, async (req, res, next) => {
  try {
    if (!(await requireSuperuser(req, res))) return;

    const { action, limit: limitQ } = req.query;
    const limit = Math.min(500, Math.max(1, parseInt(limitQ ?? "100", 10) || 100));

    const conditions = [];
    const params = [];

    if (action) {
      params.push(`%${String(action)}%`);
      conditions.push(`al.action ILIKE $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    params.push(limit);

    const result = await pool.query(
      `SELECT al.id, al.action, al.target_type, al.target_id, al.metadata, al.created_at,
              u.email AS actor_email, u.first_name AS actor_first, u.last_name AS actor_last
       FROM admin_audit_log al
       JOIN users u ON u.id = al.actor_user_id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${params.length}`,
      params
    );

    res.json({ ok: true, entries: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
