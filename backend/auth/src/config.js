require("dotenv").config();

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

const config = {
  EMAIL_ENABLED: toBool(process.env.EMAIL_ENABLED, false),
  RESEND_API_KEY: String(process.env.RESEND_API_KEY || "").trim(),
  EMAIL_FROM_BOOKINGS: String(process.env.EMAIL_FROM_BOOKINGS || "").trim(),
  EMAIL_TO_OFFICE: String(process.env.EMAIL_TO_OFFICE || "").trim(),
  APP_BASE_URL: String(process.env.APP_BASE_URL || "").trim(),
};

module.exports = { config };