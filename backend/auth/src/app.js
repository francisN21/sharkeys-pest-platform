// src/app.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const pinoHttp = require("pino-http");

const authRouter = require("../routes/auth");
const { notFound } = require("../middleware/notFound");
const { errorHandler } = require("../middleware/errorHandler");
const { pool } = require("./db");

// Service routes pipeline
const servicesRouter = require("../routes/services");
const bookingsRouter = require("../routes/bookings");
const bookingsMeRouter = require("../routes/bookingsMe");
const adminBookingsRouter = require("../routes/adminBookings");
const workerBookingsRouter = require("../routes/workerBookings");


const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;
const LOCAL_ORIGIN = process.env.LOCAL_ORIGIN;
const allowedOrigins = [
  FRONTEND_ORIGIN,
  LOCAL_ORIGIN,
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow Postman, curl, etc.

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

const { suspiciousInputLogger } = require("../middleware/suspiciousInputLogger");
app.use(suspiciousInputLogger);

app.get("/health", (req, res) => {
  res.status(200).json({ ok: true, service: "auth_module" });
});

app.get("/health/db", async (req, res, next) => {
  try {
    const r = await pool.query("SELECT 1 AS ok");
    res.json({ ok: true, db: r.rows[0].ok });
  } catch (e) {
    next(e);
  }
});

app.use("/auth", authRouter);
// Service routes pipeline
app.use("/services", servicesRouter);
app.use("/bookings", bookingsRouter);
app.use("/bookings", bookingsMeRouter);
app.use("/admin/bookings", adminBookingsRouter);
app.use("/worker/bookings", workerBookingsRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = { app };
