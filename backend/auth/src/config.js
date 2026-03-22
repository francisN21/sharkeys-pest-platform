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
  EMAIL_VERIFY_PATH: String(process.env.EMAIL_VERIFY_PATH || "/verify-email").trim(),
  PASSWORD_RESET_PATH: String(process.env.PASSWORD_RESET_PATH || "/reset-password").trim(),
  NEW_ACC_SETUP_PATH: String(process.env.NEW_ACC_SETUP_PATH || "/new-account-setup").trim(),
};

module.exports = { config };