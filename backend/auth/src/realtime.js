const WebSocket = require("ws");
const url = require("url");

/**
 * Map<WebSocket, { userId, roles, connectedAt }>
 */
const clients = new Map();

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

function parseConnectionIdentity(req) {
  const parsed = url.parse(req.url || "", true);
  const query = parsed.query || {};

  const userIdRaw = query.userId;
  const rolesRaw = query.roles;

  const userId =
    typeof userIdRaw === "string" && /^\d+$/.test(userIdRaw)
      ? Number(userIdRaw)
      : null;

  const roles =
    typeof rolesRaw === "string"
      ? rolesRaw.split(",").map(normalizeRole).filter(Boolean)
      : [];

  return { userId, roles };
}

function initRealtime(server) {
  const wss = new WebSocket.Server({
    server,
    path: "/ws",
  });

  wss.on("connection", (ws, req) => {
    const identity = parseConnectionIdentity(req);

    clients.set(ws, {
      userId: identity.userId,
      roles: identity.roles,
      connectedAt: new Date().toISOString(),
    });

    sendToSocket(ws, {
      type: "system.connected",
      at: new Date().toISOString(),
      userId: identity.userId,
      roles: identity.roles,
    });

    ws.on("message", (raw) => {
      const msg = safeJsonParse(String(raw || ""));
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "auth.identify") {
        const nextUserId =
          typeof msg.userId === "number" &&
          Number.isInteger(msg.userId) &&
          msg.userId > 0
            ? msg.userId
            : null;

        const nextRoles = normalizeRoles(msg.roles);

        clients.set(ws, {
          userId: nextUserId,
          roles: nextRoles,
          connectedAt:
            getClientMeta(ws)?.connectedAt || new Date().toISOString(),
        });

        sendToSocket(ws, {
          type: "system.identified",
          at: new Date().toISOString(),
          userId: nextUserId,
          roles: nextRoles,
        });
      }

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