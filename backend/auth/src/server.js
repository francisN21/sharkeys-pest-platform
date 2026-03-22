require("dotenv").config();

const http = require("http");
const { app } = require("./app");
const { initRealtime } = require("./realtime");
const { pool } = require("./db");

const PORT = process.env.PORT || 4000;
const HOST = "0.0.0.0";

const server = http.createServer(app);

/**
 * Initialize WebSocket server
 */
initRealtime(server);

server.listen(PORT, HOST, () => {
  console.log(`Server running on:`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${getLocalIP()}:${PORT}`);
});

// -----------------------------------------------------------
// Graceful shutdown
// -----------------------------------------------------------

function gracefulShutdown(signal) {
  console.log(`[shutdown] Received ${signal}, shutting down gracefully...`);

  server.close(() => {
    console.log("[shutdown] HTTP server closed");
    pool.end(() => {
      console.log("[shutdown] Database pool closed");
      process.exit(0);
    });
  });

  // Force exit if shutdown takes too long (e.g. stuck connections)
  setTimeout(() => {
    console.error("[shutdown] Forced exit after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

function getLocalIP() {
  const os = require("os");
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}