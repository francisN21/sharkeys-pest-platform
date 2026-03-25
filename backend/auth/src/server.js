require("dotenv").config();

const http = require("http");
const { app } = require("./app");
const { initRealtime } = require("./realtime");
const { pool } = require("./db");
const { logger } = require("./logger");
const { bootstrapSuperuser } = require("./bootstrap/bootstrap-superuser");

const PORT = process.env.PORT || 4000;
const HOST = "0.0.0.0";

const server = http.createServer(app);

/**
 * Initialize WebSocket server
 */
initRealtime(server);

server.listen(PORT, HOST, async () => {
  logger.info({ port: PORT, local: `http://localhost:${PORT}`, network: `http://${getLocalIP()}:${PORT}` }, "Server running");

  // Run on every startup — idempotent, skips if a superuser already exists.
  // Retries with backoff to handle Railway's DB not being reachable immediately.
  (async () => {
    const delays = [3000, 6000, 12000]; // 3s, 6s, 12s
    for (let attempt = 0; attempt <= delays.length; attempt++) {
      try {
        await bootstrapSuperuser();
        return;
      } catch (err) {
        if (attempt < delays.length) {
          logger.warn({ attempt: attempt + 1, err }, "[bootstrap-superuser] Retrying after delay");
          await new Promise((r) => setTimeout(r, delays[attempt]));
        } else {
          logger.error({ err }, "[bootstrap-superuser] All attempts failed");
        }
      }
    }
  })();
});

// -----------------------------------------------------------
// Graceful shutdown
// -----------------------------------------------------------

function gracefulShutdown(signal) {
  logger.info({ signal }, "Shutting down gracefully");

  server.close(() => {
    logger.info("HTTP server closed");
    pool.end(() => {
      logger.info("Database pool closed");
      process.exit(0);
    });
  });

  // Force exit if shutdown takes too long (e.g. stuck connections)
  setTimeout(() => {
    logger.error("Forced exit after shutdown timeout");
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