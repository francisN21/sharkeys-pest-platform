// src/app.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const pinoHttp = require("pino-http");
const rateLimit = require("express-rate-limit");

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

// Messaging system pipeline
const messages = require("../routes/messages");

// Notifications Pipeline
const notificationsRouter = require("../routes/notifications");

const app = express();

app.set("trust proxy", 1);

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
