// src/auditLog.js
// Writes to admin_audit_log. Never throws — failures are silently swallowed
// so they never block the main operation.
const { pool } = require("./db");

/**
 * @param {number} actorUserId
 * @param {string} action        e.g. "session.clear", "token.revoke", "employee.invite"
 * @param {string|null} targetType  e.g. "user", "employee_invite", "lead_invite"
 * @param {string|null} targetId    stringified ID of the target
 * @param {object} metadata      any extra context
 */
async function recordAuditLog(actorUserId, action, targetType = null, targetId = null, metadata = {}) {
  try {
    await pool.query(
      `INSERT INTO admin_audit_log (actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [actorUserId, action, targetType, targetId != null ? String(targetId) : null, JSON.stringify(metadata)]
    );
  } catch {
    // intentional: audit failures must never surface to the user
  }
}

module.exports = { recordAuditLog };
