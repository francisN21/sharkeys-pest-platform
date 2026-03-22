// src/app.js
require("dotenv").config();

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const pinoHttp = require("pino-http");
const rateLimit = require("express-rate-limit");
const { logger } = require("./logger");

const authRouter = require("../routes/auth");
const { notFound } = require("../middleware/notFound");
const { errorHandler } = require("../middleware/errorHandler");
const { trackSiteAccess } = require("../middleware/trackSiteAccess");
const { pool } = require("./db");

// Service routes pipeline
const meRouter = require("../routes/me");
const servicesRouter = require("../routes/services");
const bookingsRouter = require("../routes/bookings");
const bookingsMeRouter = require("../routes/bookingsMe");
const adminBookingsRouter = require("../routes/adminBookings");
const adminCustomersRouter = require("../routes/adminCustomers");
const workerBookingsRouter = require("../routes/workerBookings");
const adminEditServiceRouter = require("../routes/adminServices");
const adminTechBookingsRouter = require("../routes/adminTechBookings");
const adminAvailabilityRoutes = require("../routes/adminAvailability");
const employeesRouter = require("../routes/employees");

// Prices Routes Pipeline
const bookingPricesRouter = require("../routes/bookingPrices.js")

//Public Booking Pipeline
const publicBookingsRouter = require("../routes/publicBookings");

// Metrics routes pipeline
const trafficRouter = require("../routes/adminMetricsTraffic");
const adminMetricsBookingsRouter = require("../routes/adminMetricsBookings");
const adminMetricsCustomersRouter = require("../routes/adminMetricsCustomers");
const adminMetricsSurveyRouter = require("../routes/adminMetricsSurvey");
const bookingSurveyRouter = require("../routes/bookingSurvey");
const adminMetricsBookingsExportRouter = require("../routes/adminMetricsBookingsExport");
const adminMetricsLeadConversionsRouter = require("../routes/adminMetricsLeadConversions");
const adminRevenueMetrics = require("../routes/adminRevenueMetrics");
const adminMetricsRevenueByServiceRouter = require("../routes/adminMetricsRevenueByService");
const adminMetricsTechnicianPerformanceRouter = require("../routes/adminMetricsTechnicianPerformance");
const adminMetricsRepeatCustomersRouter = require("../routes/adminMetricsRepeatCustomers");
const adminMetricsRevenueBySegmentRouter = require("../routes/adminMetricsRevenueBySegment");
const adminMetricsLeadConversionAgeRouter = require("../routes/adminMetricsLeadConversionAge");
const adminSystemLogsRouter = require("../routes/adminSystemLogs");

// Messaging system pipeline
const messages = require("../routes/messages");

// Notifications Pipeline
const notificationsRouter = require("../routes/notifications");

const app = express();

app.set("trust proxy", 1);

// -----------------------------------------------------------
// Request logging + correlation IDs (pino-http)
// -----------------------------------------------------------

app.use(
  pinoHttp({
    logger,
    // Use incoming X-Request-Id header or generate a new UUID
    genReqId: (req, res) => {
      const existing = req.headers["x-request-id"];
      const id = existing || crypto.randomUUID();
      res.setHeader("X-Request-Id", id);
      return id;
    },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
    // Skip noisy health check endpoints
    autoLogging: {
      ignore: (req) =>
        req.url === "/health" || req.url === "/health/db",
    },
  })
);

// -----------------------------------------------------------
// Request timeout — respond 503 if handler takes too long
// -----------------------------------------------------------

app.use((req, res, next) => {
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({
        ok: false,
        error: "ServiceUnavailable",
        message: "Request timed out",
      });
    }
  }, 30_000);

  res.on("finish", () => clearTimeout(timer));
  res.on("close", () => clearTimeout(timer));
  next();
});

// -----------------------------------------------------------
// Rate limiters — applied per-IP before route handlers
// -----------------------------------------------------------

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "TooManyRequests", message: "Too many login attempts. Please try again later." },
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "TooManyRequests", message: "Too many signup attempts. Please try again later." },
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "TooManyRequests", message: "Too many password reset requests. Please try again later." },
});

const emailVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "TooManyRequests", message: "Too many verification requests. Please try again later." },
});

const publicBookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "TooManyRequests", message: "Too many booking requests. Please try again later." },
});

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

app.use(trackSiteAccess({
  excludePrefixes: ["/_next", "/static", "/assets"],
  excludePaths: ["/health", "/favicon.ico"],
}));

// -----------------------------------------------------------
// CSRF validation — double-submit cookie pattern
// Enforced on state-changing methods for authenticated requests
// (i.e. when a session cookie is present).
// Auth endpoints (login, signup) are exempt — no session exists yet.
// -----------------------------------------------------------

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_EXEMPT_PREFIXES = ["/auth/", "/public/"];

app.use((req, res, next) => {
  if (CSRF_SAFE_METHODS.has(req.method)) return next();
  if (CSRF_EXEMPT_PREFIXES.some((p) => req.path.startsWith(p))) return next();

  const cookieName = process.env.SESSION_COOKIE_NAME || "sid";
  if (!req.cookies?.[cookieName]) return next(); // Unauthenticated request — skip

  const tokenFromHeader = req.headers["x-csrf-token"];
  const tokenFromCookie = req.cookies?.[CSRF_COOKIE_NAME];

  if (!tokenFromHeader || !tokenFromCookie || tokenFromHeader !== tokenFromCookie) {
    return res.status(403).json({
      ok: false,
      error: "Forbidden",
      message: "Invalid CSRF token",
    });
  }

  next();
});

// Rate limiters on sensitive auth endpoints
app.post("/auth/login", loginLimiter);
app.post("/auth/signup", signupLimiter);
app.post("/auth/request-password-reset", passwordResetLimiter);
app.post("/auth/reset-password-with-token", passwordResetLimiter);
app.post("/auth/request-email-verification", emailVerificationLimiter);

// Main Auth pipeline
app.use("/auth", authRouter);
app.use("/auth", meRouter);

// Metrics Routes Pipeline
app.use(trafficRouter);
app.use(adminMetricsBookingsRouter);
app.use(adminMetricsCustomersRouter);
app.use(adminMetricsSurveyRouter);
app.use(bookingSurveyRouter);
app.use(adminMetricsBookingsExportRouter);
app.use(adminTechBookingsRouter);
app.use(adminMetricsLeadConversionsRouter);
app.use(adminRevenueMetrics);
app.use(adminMetricsRevenueByServiceRouter);
app.use(adminMetricsTechnicianPerformanceRouter);
app.use(adminMetricsRepeatCustomersRouter);
app.use(adminMetricsRevenueBySegmentRouter);
app.use(adminMetricsLeadConversionAgeRouter);
app.use(adminSystemLogsRouter);
app.use("/employees", employeesRouter);

// Messaging system pipeline
app.use(messages);

// Notifications Pipeline
app.use(notificationsRouter);

// Prices Routes Pipeline
app.use(bookingPricesRouter)

// Public Booking Pipeline (rate limited)
app.use("/public/bookings", publicBookingLimiter);
app.use("/public/bookings", publicBookingsRouter);

// Service routes pipeline
app.use("/services", servicesRouter);
app.use("/bookings", bookingsRouter);
app.use("/bookings", bookingsMeRouter);
app.use("/admin/bookings", adminBookingsRouter);
app.use("/admin/customers", adminCustomersRouter);
app.use("/admin/services", adminEditServiceRouter);
app.use("/worker/bookings", workerBookingsRouter);
app.use("/admin/availability", adminAvailabilityRoutes);


app.use(notFound);
app.use(errorHandler);

module.exports = { app };
