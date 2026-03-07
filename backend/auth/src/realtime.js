const WebSocket = require("ws");

const clients = new Set();

/**
 * Initialize WebSocket server
 */
function initRealtime(server) {
  const wss = new WebSocket.Server({
    server,
    path: "/ws",
  });

  wss.on("connection", (ws) => {
    clients.add(ws);

    ws.on("close", () => {
      clients.delete(ws);
    });

    ws.on("error", () => {
      clients.delete(ws);
    });
  });

  console.log("Realtime WebSocket server initialized");

  return wss;
}

/**
 * Broadcast event to all connected clients
 */
function broadcast(event) {
  const payload = JSON.stringify(event);

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

module.exports = {
  initRealtime,
  broadcast,
};