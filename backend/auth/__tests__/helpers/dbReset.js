const { pool } = require("../../src/db");

async function resetDb() {
  // Truncating users cascades to: sessions, user_roles, email_verification_codes,
  // password_reset_tokens, employee_invites, bookings, leads, etc.
  await pool.query("TRUNCATE TABLE users RESTART IDENTITY CASCADE");
}

module.exports = { resetDb };