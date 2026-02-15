// middleware/trackSiteAccess.js
const { pool } = require("../src/db");

/**
 * Tracks requests into:
 * - site_access_events (every request)
 * - site_unique_visitors_daily (once per day per ip_hash)
 *
 * Notes:
 * - Requires pgcrypto extension (already enabled)
 * - Stores ip_hash (sha256) and ip (optional)
 * - Works behind proxy if you set `app.set("trust proxy", 1)`
 */
function trackSiteAccess(opts = {}) {
  const {
    // Skip logging for noisy endpoints
    excludePaths = ["/health", "/favicon.ico"],
    excludePrefixes = ["/_next", "/static"],
  } = opts;

  return function trackSiteAccessMiddleware(req, res, next) {
    try {
      const path = req.originalUrl || req.url || "";
      const pathname = path.split("?")[0] || "";

      if (excludePaths.includes(pathname)) return next();
      if (excludePrefixes.some((p) => pathname.startsWith(p))) return next();

      const startedAt = Date.now();

      res.on("finish", async () => {
        try {
          const durationMs = Date.now() - startedAt;

          // Express req.ip respects trust proxy; set `app.set("trust proxy", 1)` in server
          const ip = req.ip || null;
          if (!ip) return;

          const userId = req.auth?.userId ?? req.user?.id ?? null;
          const sessionId = req.cookies?.[process.env.SESSION_COOKIE_NAME || "sid"] ?? null;

          const method = req.method || "GET";
          const statusCode = res.statusCode || null;
          const userAgent = req.get("user-agent") || null;
          const referer = req.get("referer") || null;

          // 1) Insert raw event
          await pool.query(
            `
            INSERT INTO site_access_events (
              occurred_at, path, method, status_code,
              user_id, session_id,
              ip, ip_hash, user_agent, referer,
              metadata
            )
            VALUES (
              now(), $1, $2, $3,
              $4, $5,
              $6::inet, digest($6::text, 'sha256'), $7, $8,
              jsonb_build_object('duration_ms', $9)
            )
            `,
            [pathname, method, statusCode, userId, sessionId, ip, userAgent, referer, durationMs]
          );

          // 2) Upsert daily unique (1 row per day per ip_hash)
          await pool.query(
            `
            INSERT INTO site_unique_visitors_daily (day, ip_hash, first_seen_at)
            VALUES (current_date, digest($1::text, 'sha256'), now())
            ON CONFLICT (day, ip_hash) DO NOTHING
            `,
            [ip]
          );
        } catch {
          // don't block response / fail the request
        }
      });

      next();
    } catch {
      next();
    }
  };
}

module.exports = { trackSiteAccess };