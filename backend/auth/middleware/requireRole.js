// middleware/requireRole.js
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // requireAuth must run first and set req.user
    const roles = Array.isArray(req.user?.roles) ? req.user.roles : [];
    const primary = req.user?.user_role;

    // allow if primary matches OR any role matches
    const ok =
      (primary && allowedRoles.includes(primary)) ||
      roles.some((r) => allowedRoles.includes(r));

    if (!req.user?.id) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    if (!ok) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }

    return next();
  };
}

module.exports = { requireRole };