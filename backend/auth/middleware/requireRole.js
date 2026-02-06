const { pool } = require("../src/db");

function requireRole(...roles) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

      const r = await pool.query(`SELECT role FROM user_roles WHERE user_id = $1`, [userId]);
      const userRoles = new Set(r.rows.map((x) => x.role));

      const allowed = roles.some((role) => userRoles.has(role));
      if (!allowed) return res.status(403).json({ ok: false, message: "Forbidden" });

      req.user.roles = Array.from(userRoles);
      next();
    } catch (e) {
      next(e);
    }
  };
}

module.exports = { requireRole };