const express = require("express");
const argon2 = require("argon2");
const crypto = require("crypto");
const { z } = require("zod");

const { pool } = require("../src/db");
const {
  getCookieOptions,
  createSession,
  deleteSession,
} = require("../src/auth/session");
const { requireAuth } = require("../middleware/requireAuth");
const { config } = require("../src/config");
const {
  sendWelcomeVerificationEmail,
  sendPasswordResetEmail,
} = require("../src/email/mailer");

const router = express.Router();

/**
 * Helpers
 */
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getAuthedUserId(req) {
  return req.user?.id ?? req.auth?.userId ?? null;
}

function getAuthExpiresAt(req) {
  return req.auth?.expiresAt ?? null;
}

function hashValue(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function generateSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function buildAppUrl(path, params = {}) {
  if (!config.APP_BASE_URL) return null;

  const url = new URL(path || "/", config.APP_BASE_URL);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value) !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

async function issueEmailVerificationCode(client, userId) {
  const code = generateSixDigitCode();
  const codeHash = hashValue(code);
  const expiresAt = addMinutes(new Date(), 15).toISOString();

  await client.query(
    `DELETE FROM email_verification_codes WHERE user_id = $1 AND consumed_at IS NULL`,
    [userId]
  );

  await client.query(
    `
    INSERT INTO email_verification_codes (user_id, code_hash, expires_at)
    VALUES ($1, $2, $3)
    `,
    [userId, codeHash, expiresAt]
  );

  return { code, expiresAt };
}

async function issuePasswordResetToken(client, userId) {
  const token = generateResetToken();
  const tokenHash = hashValue(token);
  const expiresAt = addHours(new Date(), 1).toISOString();

  await client.query(
    `DELETE FROM password_reset_tokens WHERE user_id = $1 AND consumed_at IS NULL`,
    [userId]
  );

  await client.query(
    `
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES ($1, $2, $3)
    `,
    [userId, tokenHash, expiresAt]
  );

  return { token, expiresAt };
}

/**
 * Schemas
 */
const strongPasswordSchema = z
  .string()
  .min(14, "Password must be at least 14 characters")
  .max(128, "Password is too long")
  .regex(/[A-Z]/, "Must include an uppercase letter")
  .regex(/[a-z]/, "Must include a lowercase letter")
  .regex(/\d/, "Must include a number")
  .regex(/[^A-Za-z0-9]/, "Must include a special character")
  .refine((val) => !/\s/.test(val), "No spaces allowed");

const signupSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().transform((s) => s.trim()),
  phone: z.string().min(7).max(30).optional(),
  password: strongPasswordSchema,
  accountType: z.enum(["residential", "business"]).optional(),
  address: z.string().min(5).max(500).optional(),
});

const loginSchema = z.object({
  email: z.string().email().transform((s) => s.trim()),
  password: z.string().min(1).max(128),
});

const verifyEmailRequestSchema = z.object({
  email: z.string().email().transform((s) => s.trim()),
});

const verifyEmailConfirmSchema = z.object({
  email: z.string().email().transform((s) => s.trim()),
  code: z.string().trim().regex(/^\d{6}$/),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().transform((s) => s.trim()),
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(20).max(500),
  password: strongPasswordSchema,
});

/**
 * POST /auth/signup
 */
router.post("/signup", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        message: "Invalid signup payload",
        issues: parsed.error.issues,
      });
    }

    const { first_name, last_name, email, phone, password, accountType, address } = parsed.data;
    const normalizedEmail = normalizeEmail(email);

    await client.query("BEGIN");

    const existing = await client.query(`SELECT id FROM users WHERE email = $1`, [normalizedEmail]);
    if (existing.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Email already in use" });
    }

    const leadRes = await client.query(
      `SELECT
         id,
         public_id,
         email,
         crm_tag,
         crm_tag_note,
         crm_tag_updated_at,
         crm_tag_updated_by_user_id
       FROM leads
       WHERE email = $1
       FOR UPDATE`,
      [normalizedEmail]
    );
    const lead = leadRes.rows[0] || null;

    if (lead) {
      const placeholderEmail = `promoted+lead${lead.id}@example.invalid`;
      await client.query(`UPDATE leads SET email = $1 WHERE id = $2`, [placeholderEmail, lead.id]);
    }

    const passwordHash = await argon2.hash(password);

    const created = await client.query(
      `
      INSERT INTO users (
        email, password_hash, first_name, last_name, phone, account_type, address,
        crm_tag, crm_tag_note, crm_tag_updated_at, crm_tag_updated_by_user_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING id, public_id, email, first_name, last_name, phone, account_type, address, email_verified_at, created_at
      `,
      [
        normalizedEmail,
        passwordHash,
        first_name,
        last_name,
        phone || null,
        accountType || null,
        address || null,
        lead?.crm_tag ?? null,
        lead?.crm_tag_note ?? null,
        lead?.crm_tag_updated_at ?? null,
        lead?.crm_tag_updated_by_user_id ?? null,
      ]
    );

    const user = created.rows[0];

    await client.query(
      `INSERT INTO user_roles (user_id, role)
       VALUES ($1, 'customer')
       ON CONFLICT DO NOTHING`,
      [user.id]
    );

    if (lead) {
      await client.query(
        `UPDATE bookings
         SET customer_user_id = $1,
             lead_id = NULL
         WHERE lead_id = $2`,
        [user.id, lead.id]
      );

      await client.query(
        `
        INSERT INTO lead_conversions (lead_id, lead_public_id, user_id, email)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
        `,
        [lead.id, lead.public_id, user.id, normalizedEmail]
      );

      await client.query(
        `
        INSERT INTO customer_tags (kind, entity_id, tag, note, updated_by_user_id, updated_at)
        SELECT 'registered', $1, ct.tag, ct.note, ct.updated_by_user_id, ct.updated_at
        FROM customer_tags ct
        WHERE ct.kind = 'lead' AND ct.entity_id = $2
        ON CONFLICT (kind, entity_id)
        DO UPDATE SET
          tag = EXCLUDED.tag,
          note = EXCLUDED.note,
          updated_by_user_id = EXCLUDED.updated_by_user_id,
          updated_at = EXCLUDED.updated_at
        `,
        [user.id, lead.id]
      );

      await client.query(`DELETE FROM customer_tags WHERE kind = 'lead' AND entity_id = $1`, [lead.id]);
      await client.query(`DELETE FROM leads WHERE id = $1`, [lead.id]);
    }

    const verification = await issueEmailVerificationCode(client, user.id);

    await client.query("COMMIT");

    const { sessionId, expiresAt } = await createSession(user.id);

    const cookieName = process.env.SESSION_COOKIE_NAME || "sid";
    res.cookie(cookieName, sessionId, {
      ...getCookieOptions(),
      expires: new Date(expiresAt),
    });

    const verifyUrl = buildAppUrl(config.EMAIL_VERIFY_PATH, {
      email: user.email,
    });

    await sendWelcomeVerificationEmail({
      to: user.email,
      firstName: user.first_name,
      code: verification.code,
      verifyUrl,
    });

    return res.status(201).json({
      ok: true,
      user: {
        public_id: user.public_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        account_type: user.account_type,
        address: user.address,
        email_verified_at: user.email_verified_at,
        created_at: user.created_at,
      },
      session: { expiresAt },
      verification: {
        email: user.email,
        expiresAt: verification.expiresAt,
      },
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    if (e && e.code === "23505") {
      return res.status(409).json({ ok: false, message: "Email already in use" });
    }

    next(e);
  } finally {
    client.release();
  }
});

/**
 * POST /auth/login
 */
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const normalizedEmail = normalizeEmail(email);

    const r = await pool.query(
      `
      SELECT
        u.id,
        u.public_id,
        u.email,
        u.password_hash,
        u.email_verified_at,
        u.first_name,
        u.last_name,
        u.phone,
        u.account_type,
        u.address,
        COALESCE(array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}'::text[]) AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      WHERE u.email = $1
      GROUP BY u.id
      `,
      [normalizedEmail]
    );

    const user = r.rows[0];
    if (!user || !user.password_hash) {
      return res.status(401).json({ ok: false, message: "Invalid email or password" });
    }

    const ok = await argon2.verify(user.password_hash, password);
    if (!ok) {
      return res.status(401).json({ ok: false, message: "Invalid email or password" });
    }

    const { sessionId, expiresAt } = await createSession(user.id);

    const cookieName = process.env.SESSION_COOKIE_NAME || "sid";
    res.cookie(cookieName, sessionId, {
      ...getCookieOptions(),
      expires: new Date(expiresAt),
    });

    const roles = user.roles || [];
    const user_role = roles.includes("superuser")
      ? "superuser"
      : roles.includes("admin")
      ? "admin"
      : roles.includes("worker")
      ? "worker"
      : "customer";

    return res.status(200).json({
      ok: true,
      user: {
        public_id: user.public_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        account_type: user.account_type,
        address: user.address,
        email_verified_at: user.email_verified_at,
        roles,
        user_role,
      },
      session: { expiresAt },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/logout
 */
router.post("/logout", async (req, res, next) => {
  try {
    const cookieName = process.env.SESSION_COOKIE_NAME || "sid";
    const sid = req.cookies?.[cookieName];

    if (sid) await deleteSession(sid);

    res.clearCookie(cookieName, { ...getCookieOptions() });
    return res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/verify-email/request
 */
router.post("/verify-email/request", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { email } = verifyEmailRequestSchema.parse(req.body);
    const normalizedEmail = normalizeEmail(email);

    await client.query("BEGIN");

    const userRes = await client.query(
      `
      SELECT id, email, first_name, email_verified_at
      FROM users
      WHERE email = $1
      LIMIT 1
      FOR UPDATE
      `,
      [normalizedEmail]
    );

    const user = userRes.rows[0] || null;
    let expiresAt = null;

    if (user && !user.email_verified_at) {
      const verification = await issueEmailVerificationCode(client, user.id);
      expiresAt = verification.expiresAt;

      await client.query("COMMIT");

      const verifyUrl = buildAppUrl(config.EMAIL_VERIFY_PATH, {
        email: user.email,
      });

      await sendWelcomeVerificationEmail({
        to: user.email,
        firstName: user.first_name,
        code: verification.code,
        verifyUrl,
      });
    } else {
      await client.query("COMMIT");
    }

    return res.json({
      ok: true,
      message: "If that account exists and is not yet verified, a verification email has been sent.",
      expiresAt,
    });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    next(err);
  } finally {
    client.release();
  }
});

/**
 * POST /auth/verify-email/confirm
 */
router.post("/verify-email/confirm", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { email, code } = verifyEmailConfirmSchema.parse(req.body);
    const normalizedEmail = normalizeEmail(email);
    const codeHash = hashValue(code);

    await client.query("BEGIN");

    const userRes = await client.query(
      `
      SELECT id, public_id, email, first_name, last_name, phone, account_type, address, email_verified_at, created_at
      FROM users
      WHERE email = $1
      LIMIT 1
      FOR UPDATE
      `,
      [normalizedEmail]
    );

    const user = userRes.rows[0] || null;
    if (!user) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "Invalid or expired verification code" });
    }

    if (user.email_verified_at) {
      await client.query("COMMIT");
      return res.json({
        ok: true,
        alreadyVerified: true,
        user: {
          public_id: user.public_id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          account_type: user.account_type,
          address: user.address,
          email_verified_at: user.email_verified_at,
          created_at: user.created_at,
        },
      });
    }

    const codeRes = await client.query(
      `
      SELECT id
      FROM email_verification_codes
      WHERE user_id = $1
        AND code_hash = $2
        AND consumed_at IS NULL
        AND expires_at > now()
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
      `,
      [user.id, codeHash]
    );

    const verificationRow = codeRes.rows[0] || null;
    if (!verificationRow) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "Invalid or expired verification code" });
    }

    await client.query(
      `UPDATE email_verification_codes SET consumed_at = now() WHERE id = $1`,
      [verificationRow.id]
    );

    await client.query(
      `UPDATE users SET email_verified_at = now(), updated_at = now() WHERE id = $1`,
      [user.id]
    );

    const updatedUserRes = await client.query(
      `
      SELECT public_id, email, first_name, last_name, phone, account_type, address, email_verified_at, created_at
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [user.id]
    );

    await client.query("COMMIT");

    return res.json({
      ok: true,
      user: updatedUserRes.rows[0],
    });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    next(err);
  } finally {
    client.release();
  }
});

/**
 * POST /auth/password/forgot
 */
router.post("/password/forgot", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    const normalizedEmail = normalizeEmail(email);

    await client.query("BEGIN");

    const userRes = await client.query(
      `
      SELECT id, email, first_name
      FROM users
      WHERE email = $1
      LIMIT 1
      FOR UPDATE
      `,
      [normalizedEmail]
    );

    const user = userRes.rows[0] || null;
    let expiresAt = null;

    if (user) {
      const reset = await issuePasswordResetToken(client, user.id);
      expiresAt = reset.expiresAt;

      await client.query("COMMIT");

      const resetUrl = buildAppUrl(config.PASSWORD_RESET_PATH, {
        token: reset.token,
        email: user.email,
      });

      const emailResult = await sendPasswordResetEmail({
        to: user.email,
        firstName: user.first_name,
        resetUrl,
      });
    } else {
      await client.query("COMMIT");
    }

    return res.json({
      ok: true,
      message: "If that account exists, a password reset email has been sent.",
      expiresAt,
    });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    next(err);
  } finally {
    client.release();
  }
});

/**
 * POST /auth/password/reset
 * Prevent reuse of current password and last 5 previous passwords
 */
router.post("/password/reset", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const tokenHash = hashValue(token);

    await client.query("BEGIN");
    console.log("Here")
    const tokenRes = await client.query(
      `
      SELECT prt.id, prt.user_id
      FROM password_reset_tokens prt
      WHERE prt.token_hash = $1
        AND prt.consumed_at IS NULL
        AND prt.expires_at > now()
      ORDER BY prt.created_at DESC
      LIMIT 1
      FOR UPDATE
      `,
      [tokenHash]
    );

    const resetRow = tokenRes.rows[0] || null;
    if (!resetRow) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "Invalid or expired reset token" });
    }

    const userRes = await client.query(
      `
      SELECT id, password_hash
      FROM users
      WHERE id = $1
      LIMIT 1
      FOR UPDATE
      `,
      [resetRow.user_id]
    );

    const user = userRes.rows[0] || null;
    if (!user) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "Account not found" });
    }

    if (user.password_hash) {
      const sameAsCurrent = await argon2.verify(user.password_hash, password);
      if (sameAsCurrent) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          ok: false,
          message: "New password must be different from your current password and recent passwords",
        });
      }
    }

    const historyRes = await client.query(
      `
      SELECT password_hash
      FROM user_password_history
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 5
      `,
      [user.id]
    );

    for (const row of historyRes.rows) {
      if (!row?.password_hash) continue;

      const reused = await argon2.verify(row.password_hash, password);
      if (reused) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          ok: false,
          message: "New password must be different from your current password and recent passwords",
        });
      }
    }

    if (user.password_hash) {
      await client.query(
        `
        INSERT INTO user_password_history (user_id, password_hash)
        VALUES ($1, $2)
        `,
        [user.id, user.password_hash]
      );
    }

    const passwordHash = await argon2.hash(password);

    await client.query(
      `
      UPDATE users
      SET password_hash = $2,
          updated_at = now()
      WHERE id = $1
      `,
      [user.id, passwordHash]
    );

    await client.query(
      `UPDATE password_reset_tokens SET consumed_at = now() WHERE id = $1`,
      [resetRow.id]
    );

    await client.query(
      `
      DELETE FROM user_password_history
      WHERE id IN (
        SELECT id
        FROM user_password_history
        WHERE user_id = $1
        ORDER BY created_at DESC
        OFFSET 5
      )
      `,
      [user.id]
    );

    await client.query("COMMIT");

    return res.json({ ok: true });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    next(err);
  } finally {
    client.release();
  }
});

/**
 * GET /auth/me
 */
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthedUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const u = await pool.query(
      `
      SELECT
        u.id,
        u.public_id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.account_type,
        u.address,
        u.email_verified_at,
        u.created_at,
        COALESCE(array_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}'::text[]) AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      WHERE u.id = $1
      GROUP BY u.id
      `,
      [userId]
    );
    if (u.rowCount === 0) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const user = u.rows[0];
    const roles = user.roles || [];
    const user_role = roles.includes("superuser")
      ? "superuser"
      : roles.includes("admin")
      ? "admin"
      : roles.includes("worker")
      ? "worker"
      : "customer";

    return res.json({
      ok: true,
      user: {
        ...user,
        roles,
        user_role,
      },
      session: { expiresAt: getAuthExpiresAt(req) },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;