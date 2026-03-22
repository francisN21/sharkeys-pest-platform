const WebSocket = require("ws");
const { pool } = require("./db");

/**
 * Map<WebSocket, { userId, roles, connectedAt }>
 */
const clients = new Map();

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "sid";

function parseCookies(cookieHeader) {
  const result = {};
  if (!cookieHeader) return result;
  for (const part of String(cookieHeader).split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx < 0) continue;
    result[part.slice(0, eqIdx).trim()] = part.slice(eqIdx + 1).trim();
  }
  return result;
}

async function resolveSessionIdentity(req) {
  const cookies = parseCookies(req.headers.cookie);
  const sid = cookies[SESSION_COOKIE_NAME];
  if (!sid) return null;

  try {
    const r = await pool.query(
      `SELECT s.user_id, COALESCE(array_agg(ur.role ORDER BY ur.role), '{}') AS roles
       FROM sessions s
       LEFT JOIN user_roles ur ON ur.user_id = s.user_id
       WHERE s.id = $1 AND s.expires_at > now()
       GROUP BY s.user_id`,
      [sid]
    );
    if (!r.rows[0]) return null;
    return {
      userId: Number(r.rows[0].user_id),
      roles: r.rows[0].roles || [],
    };
  } catch {
    return null;
  }
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function normalizeRoles(roles) {
  if (!Array.isArray(roles)) return [];
  return roles.map(normalizeRole).filter(Boolean);
}

function isOpen(ws) {
  return ws && ws.readyState === WebSocket.OPEN;
}

function sendToSocket(ws, event) {
  if (!isOpen(ws)) return false;

  try {
    ws.send(JSON.stringify(event));
    return true;
  } catch {
    try {
      ws.close();
    } catch {}
    return false;
  }
}

function getClientMeta(ws) {
  return clients.get(ws) || null;
}

function getAllConnectedClients() {
  return Array.from(clients.entries()).map(([ws, meta]) => ({ ws, meta }));
}

function initRealtime(server) {
  const wss = new WebSocket.Server({
    server,
    path: "/ws",
  });

  wss.on("connection", async (ws, req) => {
    const identity = await resolveSessionIdentity(req);

    if (!identity) {
      ws.close(1008, "Authentication required");
      return;
    }

    clients.set(ws, {
      userId: identity.userId,
      roles: identity.roles,
      connectedAt: new Date().toISOString(),
    });

    sendToSocket(ws, {
      type: "system.connected",
      at: new Date().toISOString(),
    });

    ws.on("message", (raw) => {
      const msg = safeJsonParse(String(raw || ""));
      if (!msg || typeof msg !== "object") return;

      // auth.identify is intentionally not supported — identity is derived
      // from the validated session cookie at connection time and cannot be changed.

      if (msg.type === "ping") {
        sendToSocket(ws, { type: "pong", at: new Date().toISOString() });
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
    });

    ws.on("error", () => {
      clients.delete(ws);
      try {
        ws.close();
      } catch {}
    });
  });

  console.log("Realtime WebSocket server initialized at /ws");
  return wss;
}

function broadcastToAll(event) {
  let count = 0;
  for (const [ws] of clients.entries()) {
    if (sendToSocket(ws, event)) count += 1;
  }
  return count;
}

function broadcastToUser(userId, event) {
  const target = Number(userId);
  if (!Number.isInteger(target) || target <= 0) return 0;

  let count = 0;
  for (const [ws, meta] of clients.entries()) {
    if (Number(meta?.userId) === target) {
      if (sendToSocket(ws, event)) count += 1;
    }
  }
  return count;
}

function broadcastToUsers(userIds, event) {
  const ids = Array.from(
    new Set(
      (Array.isArray(userIds) ? userIds : [])
        .map((x) => Number(x))
        .filter((x) => Number.isInteger(x) && x > 0)
    )
  );

  if (!ids.length) return 0;

  let count = 0;
  for (const [ws, meta] of clients.entries()) {
    if (ids.includes(Number(meta?.userId))) {
      if (sendToSocket(ws, event)) count += 1;
    }
  }
  return count;
}

function broadcastToRole(role, event) {
  const target = normalizeRole(role);
  if (!target) return 0;

  let count = 0;
  for (const [ws, meta] of clients.entries()) {
    const roles = normalizeRoles(meta?.roles);
    if (roles.includes(target)) {
      if (sendToSocket(ws, event)) count += 1;
    }
  }
  return count;
}

function broadcastToRoles(roles, event) {
  const targetRoles = Array.from(new Set(normalizeRoles(roles)));
  if (!targetRoles.length) return 0;

  let count = 0;
  for (const [ws, meta] of clients.entries()) {
    const userRoles = normalizeRoles(meta?.roles);
    if (targetRoles.some((r) => userRoles.includes(r))) {
      if (sendToSocket(ws, event)) count += 1;
    }
  }
  return count;
}

async function broadcastToBookingParticipants(pool, bookingId, event, options = {}) {
  const includeAdminRoles = options.includeAdminRoles ?? false;
  const excludeUserIds = Array.isArray(options.excludeUserIds)
    ? options.excludeUserIds.map((x) => Number(x))
    : [];

  const q = await pool.query(
    `
    SELECT user_id
    FROM (
      SELECT b.customer_user_id AS user_id
      FROM bookings b
      WHERE b.id = $1

      UNION

      SELECT ba.worker_user_id AS user_id
      FROM booking_assignments ba
      WHERE ba.booking_id = $1
    ) x
    WHERE x.user_id IS NOT NULL
    `,
    [bookingId]
  );

  const ids = q.rows
    .map((r) => Number(r.user_id))
    .filter(
      (x) =>
        Number.isInteger(x) &&
        x > 0 &&
        !excludeUserIds.includes(x)
    );

  let count = broadcastToUsers(ids, event);

  if (includeAdminRoles) {
    count += broadcastToRoles(["admin", "superuser"], event);
  }

  return count;
}

module.exports = {
  initRealtime,
  getClientMeta,
  getAllConnectedClients,
  broadcastToAll,
  broadcastToUser,
  broadcastToUsers,
  broadcastToRole,
  broadcastToRoles,
  broadcastToBookingParticipants,
};