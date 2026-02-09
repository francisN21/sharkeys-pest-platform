// middleware/requireAuth.js
const { getSession, touchSession, deleteSession, getCookieOptions } = require("../src/auth/session");

async function requireAuth(req, res, next) {
  try {
    const cookieName = process.env.SESSION_COOKIE_NAME || "sid";
    const sid = req.cookies?.[cookieName];

    if (!sid) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const session = await getSession(sid);
    if (!session) {
      return res.status(401).json({ ok: false, message: "Invalid session" });
    }

    // Expired?
    if (new Date(session.expires_at).getTime() <= Date.now()) {
      // Optional cleanup
      if (typeof deleteSession === "function") await deleteSession(sid).catch(() => {});
      if (typeof getCookieOptions === "function") {
        res.clearCookie(cookieName, { ...getCookieOptions() });
      }
      return res.status(401).json({ ok: false, message: "Session expired" });
    }

    // Sliding refresh
    const updated = await touchSession(sid);

    // ✅ New style
    req.auth = {
      userId: updated.user_id,
      sessionId: updated.id,
      expiresAt: new Date(updated.expires_at).toISOString(),
    };

    // ✅ Backward-compatible style (fixes req.user.id crashes)
    req.user = { id: updated.user_id };
  console.log("REQUIRE AUTH SET:", { auth: req.auth, user: req.user });
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireAuth };