// middleware/requireAuth.js
const {
  getSession,
  touchSession,
  deleteSession,
  getCookieOptions,
} = require("../src/auth/session");

const { pool } = require("../src/db");

async function requireAuth(req, res, next) {
  const client = await pool.connect();
  try {
    const cookieName = process.env.SESSION_COOKIE_NAME || "sid";
    const sid = req.cookies?.[cookieName];

    if (!sid) {
      client.release();
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const session = await getSession(sid);
    if (!session) {
      client.release();
      return res.status(401).json({ ok: false, message: "Invalid session" });
    }

    // Expired?
    if (new Date(session.expires_at).getTime() <= Date.now()) {
      if (typeof deleteSession === "function") await deleteSession(sid).catch(() => {});
      if (typeof getCookieOptions === "function") {
        res.clearCookie(cookieName, { ...getCookieOptions() });
      }
      client.release();
      return res.status(401).json({ ok: false, message: "Session expired" });
    }

    // Sliding refresh
    const updated = await touchSession(sid);

    const userId = updated.user_id;

    // 🔥 Load roles for RBAC checks
    const rolesRes = await client.query(
      `SELECT role FROM user_roles WHERE user_id = $1`,
      [userId]
    );
    const roles = rolesRes.rows.map((r) => r.role);

    // Primary role convenience (admin > worker > customer)
    const user_role = roles.includes("admin")
      ? "admin"
      : roles.includes("worker")
      ? "worker"
      : "customer";

    // ✅ New style
    req.auth = {
      userId,
      sessionId: updated.id,
      expiresAt: new Date(updated.expires_at).toISOString(),
    };

    // ✅ Backward compatible + role-aware
    req.user = { id: userId, roles, user_role };

    // console.log("REQUIRE AUTH SET:", { auth: req.auth, user: req.user });
    client.release();
    return next();
  } catch (err) {
    try {
      client.release();
    } catch {}
    return next(err);
  }
}

module.exports = { requireAuth };