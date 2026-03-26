/**
 * manual-setup-superuser.js
 *
 * One-shot script to manually activate the bootstrap superuser account
 * when the email invite cannot be delivered.
 *
 * Run locally (requires DB access via PG* or DATABASE_URL env vars):
 *
 *   BOOTSTRAP_SUPERUSER_EMAIL=you@example.com \
 *   BOOTSTRAP_SUPERUSER_PASSWORD="YourStr0ng!Pass" \
 *   node src/bootstrap/manual-setup-superuser.js
 *
 * What it does:
 *   1. Finds the user by BOOTSTRAP_SUPERUSER_EMAIL
 *   2. Confirms there is no active superuser yet (safety check)
 *   3. Hashes the provided password with argon2
 *   4. Sets password_hash, email_verified_at on the user row
 *   5. Inserts the 'superuser' role (ON CONFLICT DO NOTHING)
 *   6. Removes any 'customer' role
 *   7. Marks any pending employee_invites as consumed
 *
 * This script is IDEMPOTENT — safe to run more than once.
 * It will refuse to run if the user already has a password set.
 */

require("dotenv").config();

const argon2 = require("argon2");
const { pool } = require("../db");

const EMAIL = String(process.env.BOOTSTRAP_SUPERUSER_EMAIL || "").trim().toLowerCase();
const PASSWORD = String(process.env.BOOTSTRAP_SUPERUSER_PASSWORD || "").trim();

async function run() {
  if (!EMAIL) {
    console.error("[manual-setup] BOOTSTRAP_SUPERUSER_EMAIL is required");
    process.exit(1);
  }

  if (!PASSWORD) {
    console.error("[manual-setup] BOOTSTRAP_SUPERUSER_PASSWORD is required");
    process.exit(1);
  }

  if (PASSWORD.length < 14) {
    console.error("[manual-setup] Password must be at least 14 characters");
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Find the user
    const userRes = await client.query(
      `SELECT id, public_id, email, first_name, last_name, password_hash, email_verified_at
       FROM users
       WHERE email = $1
       LIMIT 1
       FOR UPDATE`,
      [EMAIL]
    );

    if (userRes.rowCount === 0) {
      console.error(`[manual-setup] No user found with email: ${EMAIL}`);
      console.error("[manual-setup] Run the bootstrap-superuser script first to create the user row.");
      await client.query("ROLLBACK");
      process.exit(1);
    }

    const user = userRes.rows[0];

    if (user.password_hash) {
      console.log(`[manual-setup] User ${EMAIL} already has a password set.`);
      console.log("[manual-setup] If you need to reset the password, use the password-reset flow instead.");
      await client.query("ROLLBACK");
      process.exit(0);
    }

    // Check for existing superuser (safety guard)
    const existingSuperRes = await client.query(
      `SELECT u.email
       FROM users u
       INNER JOIN user_roles ur ON ur.user_id = u.id
       WHERE ur.role = 'superuser'
         AND u.id != $1
       LIMIT 1`,
      [user.id]
    );

    if (existingSuperRes.rowCount > 0) {
      console.error(`[manual-setup] Another superuser already exists: ${existingSuperRes.rows[0].email}`);
      console.error("[manual-setup] Aborting to prevent duplicate superusers.");
      await client.query("ROLLBACK");
      process.exit(1);
    }

    // Hash the password
    console.log("[manual-setup] Hashing password...");
    const passwordHash = await argon2.hash(PASSWORD);

    // Set password + verify email
    await client.query(
      `UPDATE users
       SET
         password_hash = $2,
         email_verified_at = COALESCE(email_verified_at, now()),
         updated_at = now()
       WHERE id = $1`,
      [user.id, passwordHash]
    );

    // Grant superuser role
    await client.query(
      `INSERT INTO user_roles (user_id, role)
       VALUES ($1, 'superuser')
       ON CONFLICT DO NOTHING`,
      [user.id]
    );

    // Remove customer role if present
    await client.query(
      `DELETE FROM user_roles WHERE user_id = $1 AND role = 'customer'`,
      [user.id]
    );

    // Mark any pending invites as consumed
    await client.query(
      `UPDATE employee_invites
       SET consumed_at = now()
       WHERE user_id = $1 AND consumed_at IS NULL`,
      [user.id]
    );

    await client.query("COMMIT");

    console.log("");
    console.log("✓ Superuser account activated successfully");
    console.log(`  Email    : ${EMAIL}`);
    console.log(`  Name     : ${user.first_name} ${user.last_name}`);
    console.log(`  Role     : superuser`);
    console.log("");
    console.log("You can now log in at your app's /login page.");
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    console.error("[manual-setup] Failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
