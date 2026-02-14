// routes/me.js
const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

const updateMeSchema = z
  .object({
    first_name: z.string().trim().min(1).max(100).optional(),
    last_name: z.string().trim().min(1).max(100).optional(),
    phone: z
      .string()
      .trim()
      .min(7)
      .max(30)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    address: z
      .string()
      .trim()
      .max(255)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    account_type: z
      .enum(["residential", "business"])
      .optional()
      .or(z.literal("").transform(() => undefined)),
  })
  .strict();

/**
 * ✅ Helper: fetch user + roles in the same shape as /auth/me
 * (so Profile UI can safely rely on roles/user_role after PATCH as well)
 */
async function fetchUserWithRoles(userId) {
  const u = await pool.query(
    `
    SELECT
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

  const user = u.rows[0] || null;
  if (!user) return null;

  const roles = user.roles || [];
  const user_role = roles.includes("superuser")
    ? "superuser"
    : roles.includes("admin")
    ? "admin"
    : roles.includes("worker")
    ? "worker"
    : "customer";

  return { ...user, roles, user_role };
}

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const patch = updateMeSchema.parse(req.body);

    // If nothing provided, do nothing but still return current (✅ now includes roles)
    const keys = Object.keys(patch);
    if (keys.length === 0) {
      const cur = await fetchUserWithRoles(userId);
      if (!cur) return res.status(401).json({ ok: false, message: "Not authenticated" });
      return res.json({ ok: true, user: cur });
    }

    const fields = [];
    const values = [];
    let p = 1;

    if (patch.first_name !== undefined) {
      fields.push(`first_name = $${p++}`);
      values.push(patch.first_name);
    }
    if (patch.last_name !== undefined) {
      fields.push(`last_name = $${p++}`);
      values.push(patch.last_name);
    }
    if (patch.phone !== undefined) {
      fields.push(`phone = $${p++}`);
      values.push(patch.phone);
    }
    if (patch.address !== undefined) {
      fields.push(`address = $${p++}`);
      values.push(patch.address);
    }
    if (patch.account_type !== undefined) {
      fields.push(`account_type = $${p++}`);
      values.push(patch.account_type);
    }

    values.push(userId);

    // Keep your existing UPDATE as-is (fast)
    await pool.query(
      `
      UPDATE users
      SET ${fields.join(", ")},
          updated_at = now()
      WHERE id = $${p}
      `,
      values
    );

    // ✅ Return same shape as /auth/me (includes roles/user_role)
    const updated = await fetchUserWithRoles(userId);
    if (!updated) return res.status(401).json({ ok: false, message: "Not authenticated" });

    res.json({ ok: true, user: updated });
  } catch (e) {
    next(e);
  }
});

module.exports = router;