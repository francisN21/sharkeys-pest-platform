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

const signupSchema = z.object({
  email: z.string().email().transform((s) => s.trim()),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email().transform((s) => s.trim()),
  password: z.string().min(1).max(128),
});

router.post("/signup", async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { first_name, last_name, email, phone, password, accountType, address } = req.body;

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ ok: false, message: "Missing required fields" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    await client.query("BEGIN");

    const existing = await client.query(`SELECT id FROM users WHERE email = $1`, [normalizedEmail]);
    if (existing.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Email already in use" });
    }

    const passwordHash = await argon2.hash(password);

    const created = await client.query(
      `
      INSERT INTO users (email, password_hash, first_name, last_name, phone, account_type, address)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, public_id, email, first_name, last_name, email_verified_at, created_at
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

    // ✅ Default role: customer
    await client.query(
      `INSERT INTO user_roles (user_id, role) VALUES ($1, 'customer')
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
        email_verified_at: user.email_verified_at,
        created_at: user.created_at,
      },
      session: { expiresAt },
    });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    next(e);
  } finally {
    client.release();
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const r = await pool.query(
      `SELECT id, email, password_hash, email_verified_at
       FROM users
       WHERE email = $1`,
      [email]
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

    res.status(200).json({
      ok: true,
      user: { id: user.id, email: user.email, emailVerifiedAt: user.email_verified_at },
      session: { expiresAt },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/logout", async (req, res, next) => {
  try {
    const cookieName = process.env.SESSION_COOKIE_NAME || "sid";
    const sid = req.cookies?.[cookieName];

    if (sid) await deleteSession(sid);

    res.clearCookie(cookieName, { ...getCookieOptions() });
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Test endpoint: confirms auth + triggers sliding expiration
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT id, email, email_verified_at, created_at
       FROM users
       WHERE id = $1`,
      [req.auth.userId]
    );

    const user = r.rows[0];
    res.json({
      ok: true,
      user,
      session: { expiresAt: req.auth.expiresAt },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
