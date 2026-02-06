// routes/auth.js
const express = require("express");
const argon2 = require("argon2");
const { z } = require("zod");

const { pool } = require("../src/db");
const {
  getCookieOptions,
  createSession,
  deleteSession,
} = require("../src/auth/session");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

/**
 * Helpers
 */
function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getAuthedUserId(req) {
  // Support either style:
  // - req.user = { id }
  // - req.auth = { userId, expiresAt }
  return req.user?.id ?? req.auth?.userId ?? null;
}

function getAuthExpiresAt(req) {
  return req.auth?.expiresAt ?? null;
}

/**
 * Schemas
 * Note: signup includes your profile fields; login keeps minimal.
 */
const signupSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().transform((s) => s.trim()),
  phone: z.string().min(7).max(30).optional(),
  password: z.string().min(8).max(128),
  accountType: z.enum(["residential", "business"]).optional(),
  address: z.string().min(5).max(500).optional(),
});

const loginSchema = z.object({
  email: z.string().email().transform((s) => s.trim()),
  password: z.string().min(1).max(128),
});

/**
 * POST /auth/signup
 * - Creates user
 * - Inserts default role: customer
 * - Creates session cookie
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

    const existing = await client.query(
      `SELECT id FROM users WHERE email = $1`,
      [normalizedEmail]
    );
    if (existing.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Email already in use" });
    }

    const passwordHash = await argon2.hash(password);

    const created = await client.query(
      `
      INSERT INTO users (email, password_hash, first_name, last_name, phone, account_type, address)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
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
      ]
    );

    const user = created.rows[0];

    // Default role: customer
    await client.query(
      `INSERT INTO user_roles (user_id, role)
       VALUES ($1, 'customer')
       ON CONFLICT DO NOTHING`,
      [user.id]
    );

    await client.query("COMMIT");

    const { sessionId, expiresAt } = await createSession(user.id);

    const cookieName = process.env.SESSION_COOKIE_NAME || "sid";
    res.cookie(cookieName, sessionId, {
      ...getCookieOptions(),
      expires: new Date(expiresAt),
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
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    next(e);
  } finally {
    client.release();
  }
});

/**
 * POST /auth/login
 * - Validates credentials
 * - Creates session cookie
 */
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const normalizedEmail = normalizeEmail(email);

    const r = await pool.query(
      `SELECT id, public_id, email, password_hash, email_verified_at, first_name, last_name
       FROM users
       WHERE email = $1`,
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

    return res.status(200).json({
      ok: true,
      user: {
        public_id: user.public_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        email_verified_at: user.email_verified_at,
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
 * GET /auth/me
 * Uses requireAuth and then fetches profile.
 * Works with either req.user.id OR req.auth.userId depending on your middleware.
 */
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userId = getAuthedUserId(req);
    if (!userId) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    const u = await pool.query(
      `SELECT public_id, email, first_name, last_name, phone, account_type, address, email_verified_at, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (u.rowCount === 0) {
      return res.status(401).json({ ok: false, message: "Not authenticated" });
    }

    return res.json({
      ok: true,
      user: u.rows[0],
      session: { expiresAt: getAuthExpiresAt(req) },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;