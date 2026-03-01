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

    // 1) If user already exists, stop (same behavior as today)
    const existing = await client.query(`SELECT id FROM users WHERE email = $1`, [normalizedEmail]);
    if (existing.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Email already in use" });
    }

    // 2) If lead exists, lock it for promotion
    const leadRes = await client.query(
      `SELECT id, email, crm_tag, crm_tag_note, crm_tag_updated_at, crm_tag_updated_by_user_id
       FROM leads
       WHERE email = $1
       FOR UPDATE`,
      [normalizedEmail]
    );
    const lead = leadRes.rows[0] || null;

    // 3) If lead exists, rename its email to a placeholder to avoid trigger conflict on users insert
    //    (Trigger checks: "does leads.email == NEW.email?")
    if (lead) {
      const placeholderEmail = `promoted+lead${lead.id}@example.invalid`;
      await client.query(`UPDATE leads SET email = $1 WHERE id = $2`, [placeholderEmail, lead.id]);
    }

    // 4) Create the user
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

    // 5) Default role: customer
    await client.query(
      `INSERT INTO user_roles (user_id, role)
       VALUES ($1, 'customer')
       ON CONFLICT DO NOTHING`,
      [user.id]
    );

    // 6) If this was a lead promotion, migrate dependent data then delete lead
    if (lead) {
      // IMPORTANT: migrate bookings first to satisfy bookings_customer_or_lead_chk (XOR)
      await client.query(
        `UPDATE bookings
         SET customer_user_id = $1,
             lead_id = NULL
         WHERE lead_id = $2`,
        [user.id, lead.id]
      );

      // Optional but recommended: migrate customer_tags lead -> registered
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

      // Clean up old lead tag row
      await client.query(`DELETE FROM customer_tags WHERE kind = 'lead' AND entity_id = $1`, [lead.id]);

      // Now safe to delete the lead (bookings no longer reference it)
      await client.query(`DELETE FROM leads WHERE id = $1`, [lead.id]);
    }

    await client.query("COMMIT");

    // Create session AFTER commit (keeps your current pattern)
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

    // If your cross-table uniqueness trigger throws 23505, return a clean 409
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
 * - Validates credentials
 * - Creates session cookie
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

    // Pick a primary role for convenience (admin > worker > customer)
    const roles = user.roles || [];
    const user_role = roles.includes("admin") ? "admin" : roles.includes("worker") ? "worker" : "customer";

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
        roles,       // ['customer'] or ['admin', ...]
        user_role,   // 'admin' | 'worker' | 'customer'
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
    const user_role = roles.includes("admin") ? "admin" : roles.includes("worker") ? "worker" : "customer";
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