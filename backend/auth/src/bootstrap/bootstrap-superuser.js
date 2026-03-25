const crypto = require("crypto");
const { pool } = require("../db");
const { config } = require("../config");
const { sendEmployeeInviteEmail } = require("../email/mailer");

const ADMIN_EMAIL = String(process.env.BOOTSTRAP_SUPERUSER_EMAIL || "").trim();
const ADMIN_FIRST_NAME = String(process.env.BOOTSTRAP_SUPERUSER_FIRST_NAME || "Sharky's").trim();
const ADMIN_LAST_NAME = String(process.env.BOOTSTRAP_SUPERUSER_LAST_NAME || "Admin").trim();
const EMPLOYEE_SETUP_PATH = String(process.env.EMPLOYEE_SETUP_PATH || "/employee-setup").trim();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashValue(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function generateInviteToken() {
  return crypto.randomBytes(32).toString("hex");
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function buildAppUrl(path, params = {}) {
  const baseUrl = String(config.APP_BASE_URL || "").trim();
  if (!baseUrl) return null;

  const url = new URL(path || "/", baseUrl);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value) !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function bootstrapSuperuser() {
  if (!ADMIN_EMAIL) {
    console.log("[bootstrap-superuser] BOOTSTRAP_SUPERUSER_EMAIL is missing. Skipping.");
    return;
  }

  const client = await pool.connect();

  try {
    const normalizedEmail = normalizeEmail(ADMIN_EMAIL);

    await client.query("BEGIN");

    // If any real superuser already exists, stop.
    const existingSuperuserRes = await client.query(
      `
      SELECT u.id, u.email
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.id
      WHERE ur.role = 'superuser'
      LIMIT 1
      FOR UPDATE
      `
    );

    if (existingSuperuserRes.rowCount > 0) {
      await client.query("COMMIT");
      console.log(
        `[bootstrap-superuser] Superuser already exists (${existingSuperuserRes.rows[0].email}). Skipping bootstrap.`
      );
      return;
    }

    // Reuse existing placeholder user if present, otherwise create one.
    let userRes = await client.query(
      `
      SELECT id, public_id, email, first_name, last_name, phone, password_hash, email_verified_at
      FROM users
      WHERE email = $1
      LIMIT 1
      FOR UPDATE
      `,
      [normalizedEmail]
    );

    let user = userRes.rows[0] || null;

    if (user) {
      const rolesRes = await client.query(
        `SELECT role FROM user_roles WHERE user_id = $1`,
        [user.id]
      );

      const existingRoles = rolesRes.rows.map((r) =>
        String(r.role || "").trim().toLowerCase()
      );

      if (
        existingRoles.includes("superuser") ||
        existingRoles.includes("admin") ||
        existingRoles.includes("worker")
      ) {
        await client.query("COMMIT");
        console.log(
          `[bootstrap-superuser] User ${normalizedEmail} already has employee roles (${existingRoles.join(", ")}). Skipping bootstrap.`
        );
        return;
      }

      await client.query(
        `
        UPDATE users
        SET
          first_name = COALESCE(NULLIF($2, ''), first_name),
          last_name = COALESCE(NULLIF($3, ''), last_name),
          updated_at = now()
        WHERE id = $1
        `,
        [user.id, ADMIN_FIRST_NAME, ADMIN_LAST_NAME]
      );

      const refreshed = await client.query(
        `
        SELECT id, public_id, email, first_name, last_name, phone, password_hash, email_verified_at
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [user.id]
      );

      user = refreshed.rows[0];
    } else {
      const created = await client.query(
        `
        INSERT INTO users (
          email,
          password_hash,
          first_name,
          last_name,
          phone,
          account_type,
          address
        )
        VALUES ($1, NULL, $2, $3, NULL, NULL, NULL)
        RETURNING id, public_id, email, first_name, last_name, phone, password_hash, email_verified_at
        `,
        [normalizedEmail, ADMIN_FIRST_NAME, ADMIN_LAST_NAME]
      );

      user = created.rows[0];
    }

    // Remove any stale pending invite.
    await client.query(
      `DELETE FROM employee_invites WHERE user_id = $1 AND consumed_at IS NULL`,
      [user.id]
    );

    const token = generateInviteToken();
    const tokenHash = hashValue(token);
    const expiresAt = addDays(new Date(), 7).toISOString();

    // Bootstrap special case:
    // invited_by_user_id is the same user being invited because there is no prior superuser yet.
    await client.query(
      `
      INSERT INTO employee_invites (
        user_id,
        invited_by_user_id,
        invited_role,
        token_hash,
        expires_at
      )
      VALUES ($1, $1, 'superuser', $2, $3)
      `,
      [user.id, tokenHash, expiresAt]
    );

    await client.query("COMMIT");

    const setupUrl = buildAppUrl(EMPLOYEE_SETUP_PATH, { token });

    const emailResult = await sendEmployeeInviteEmail({
      to: user.email,
      firstName: user.first_name,
      roleLabel: "superadmin",
      setupUrl,
    });

    console.log(
      `[bootstrap-superuser] Bootstrap invite created for ${normalizedEmail}.`
    );
    console.log(
      `[bootstrap-superuser] Expires at: ${expiresAt}`
    );
    console.log(
      `[bootstrap-superuser] Email result: ${JSON.stringify(emailResult)}`
    );
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error("[bootstrap-superuser] Failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
  }
}

module.exports = { bootstrapSuperuser };

// Allow running directly: node bootstrap-superuser.js
if (require.main === module) {
  bootstrapSuperuser()
    .then(() => pool.end())
    .catch(async (err) => {
      console.error("[bootstrap-superuser] Unhandled failure:", err);
      try { await pool.end(); } catch {}
      process.exit(1);
    });
}