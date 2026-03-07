require("dotenv").config();

const http = require("http");
const { app } = require("./app");
const { initRealtime } = require("./realtime");

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