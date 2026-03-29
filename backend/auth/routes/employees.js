const express = require("express");
const argon2 = require("argon2");
const crypto = require("crypto");
const { z } = require("zod");

const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");
const { config } = require("../src/config");
const { sendEmployeeInviteEmail } = require("../src/email/mailer");
const {
  getCookieOptions,
  createSession,
  setCsrfCookie,
} = require("../src/auth/session");

const router = express.Router();

/**
 * Helpers
 */
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

function normalizeInvitedRole(role) {
  const value = String(role || "").trim().toLowerCase();

  if (value === "superadmin") return "superuser";
  if (value === "technician") return "worker";
  if (value === "superuser") return "superuser";
  if (value === "admin") return "admin";
  if (value === "worker") return "worker";

  return null;
}

function displayRole(role) {
  const value = String(role || "").trim().toLowerCase();

  if (value === "superuser") return "superadmin";
  if (value === "worker") return "technician";
  if (value === "admin") return "admin";

  return value || null;
}


const strongPasswordSchema = z
  .string()
  .min(14, "Password must be at least 14 characters")
  .max(128, "Password is too long")
  .regex(/[A-Z]/, "Must include an uppercase letter")
  .regex(/[a-z]/, "Must include a lowercase letter")
  .regex(/\d/, "Must include a number")
  .regex(/[^A-Za-z0-9]/, "Must include a special character")
  .refine((val) => !/\s/.test(val), "No spaces allowed");

const inviteEmployeeSchema = z.object({
  email: z.string().email().transform((s) => s.trim()),
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(7).max(30).optional(),
  user_role: z.enum(["superadmin", "superuser", "admin", "technician", "worker"]),
});

const completeEmployeeSetupSchema = z.object({
  token: z.string().trim().min(20).max(500),
  password: strongPasswordSchema,
  first_name: z.string().trim().min(1).max(100).optional(),
  last_name: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().min(7).max(30).optional(),
});

const reinstateEmployeeSchema = z.object({
  user_role: z.enum(["superadmin", "superuser", "admin", "technician", "worker"]),
});

/**
 * GET /employees
 * Superuser-only employee list
 */
router.get("/", requireAuth, requireRole("superuser"), async (req, res, next) => {
  try {
    const termedFilter = req.query.termed === "true";

    const whereClause = termedFilter
      ? `WHERE u.termed_at IS NOT NULL`
      : `WHERE u.termed_at IS NULL
         AND (
           EXISTS (
             SELECT 1 FROM user_roles eur
             WHERE eur.user_id = u.id
               AND eur.role IN ('superuser', 'admin', 'worker')
           )
           OR (li.id IS NOT NULL AND li.consumed_at IS NULL)
         )`;

    const q = await pool.query(
      `
      SELECT
        u.id,
        u.public_id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.email_verified_at,
        u.created_at,
        u.termed_at,
        (u.password_hash IS NOT NULL) AS has_password,
        COALESCE(array_agg(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}'::text[]) AS roles,
        li.id AS invite_id,
        li.invited_role,
        li.expires_at AS invite_expires_at,
        li.consumed_at AS invite_consumed_at,
        li.created_at AS invite_created_at
      FROM users u
      LEFT JOIN user_roles ur
        ON ur.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT id, invited_role, expires_at, consumed_at, created_at
        FROM employee_invites ei
        WHERE ei.user_id = u.id
        ORDER BY ei.created_at DESC
        LIMIT 1
      ) li ON true
      ${whereClause}
      GROUP BY
        u.id,
        li.id,
        li.invited_role,
        li.expires_at,
        li.consumed_at,
        li.created_at
      ORDER BY
        COALESCE(u.last_name, '') ASC,
        COALESCE(u.first_name, '') ASC,
        u.email ASC
      `
    );

    const now = Date.now();

    const employees = q.rows.map((row) => {
      const roles = Array.isArray(row.roles) ? row.roles : [];
      const isTermed = !!row.termed_at;

      const primaryRole =
        roles.includes("superuser")
          ? "superuser"
          : roles.includes("admin")
          ? "admin"
          : roles.includes("worker")
          ? "worker"
          : row.invited_role || null;

      const invitePending =
        !!row.invite_id &&
        !row.invite_consumed_at &&
        (!row.invite_expires_at || new Date(row.invite_expires_at).getTime() > now);

      const active =
        !isTermed &&
        roles.some((r) => ["superuser", "admin", "worker"].includes(String(r))) &&
        !!row.email_verified_at &&
        !!row.has_password;

      return {
        id: Number(row.id),
        public_id: row.public_id,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        phone: row.phone,
        email_verified_at: row.email_verified_at,
        created_at: row.created_at,
        termed_at: row.termed_at || null,
        roles,
        user_role: displayRole(primaryRole),
        status: isTermed ? "termed" : active ? "active" : invitePending ? "invited" : "pending",
        invite: row.invite_id
          ? {
              invited_role: displayRole(row.invited_role),
              expires_at: row.invite_expires_at,
              consumed_at: row.invite_consumed_at,
              created_at: row.invite_created_at,
            }
          : null,
      };
    });

    return res.json({ ok: true, employees });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /employees/:publicId
 * Superuser-only employee detail
 */
router.get("/:publicId", requireAuth, requireRole("superuser"), async (req, res, next) => {
  try {
    const publicId = String(req.params.publicId || "").trim();

    const q = await pool.query(
      `
      SELECT
        u.id,
        u.public_id,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.email_verified_at,
        u.created_at,
        u.termed_at,
        (u.password_hash IS NOT NULL) AS has_password,
        COALESCE(array_agg(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL), '{}'::text[]) AS roles,
        li.id AS invite_id,
        li.invited_role,
        li.expires_at AS invite_expires_at,
        li.consumed_at AS invite_consumed_at,
        li.created_at AS invite_created_at
      FROM users u
      LEFT JOIN user_roles ur
        ON ur.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT id, invited_role, expires_at, consumed_at, created_at
        FROM employee_invites ei
        WHERE ei.user_id = u.id
        ORDER BY ei.created_at DESC
        LIMIT 1
      ) li ON true
      WHERE u.public_id = $1
      GROUP BY
        u.id,
        li.id,
        li.invited_role,
        li.expires_at,
        li.consumed_at,
        li.created_at
      LIMIT 1
      `,
      [publicId]
    );

    if (q.rowCount === 0) {
      return res.status(404).json({ ok: false, message: "Employee not found" });
    }

    const row = q.rows[0];
    const roles = Array.isArray(row.roles) ? row.roles : [];
    const primaryRole =
      roles.includes("superuser")
        ? "superuser"
        : roles.includes("admin")
        ? "admin"
        : roles.includes("worker")
        ? "worker"
        : row.invited_role || null;

    return res.json({
      ok: true,
      employee: {
        id: Number(row.id),
        public_id: row.public_id,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        phone: row.phone,
        email_verified_at: row.email_verified_at,
        created_at: row.created_at,
        termed_at: row.termed_at || null,
        has_password: !!row.has_password,
        roles,
        user_role: displayRole(primaryRole),
        status: row.termed_at ? "termed" : null,
        invite: row.invite_id
          ? {
              invited_role: displayRole(row.invited_role),
              expires_at: row.invite_expires_at,
              consumed_at: row.invite_consumed_at,
              created_at: row.invite_created_at,
            }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /employees/invite
 * Superuser-only invite endpoint
 *
 * Behavior:
 * - creates placeholder user if needed
 * - does NOT activate employee role yet
 * - sends setup email
 * - role is applied only after employee completes setup
 */
router.post("/invite", requireAuth, requireRole("superuser"), async (req, res, next) => {
  const client = await pool.connect();

  try {
    const actorUserId = req.user?.id ?? req.auth?.userId ?? null;
    const parsed = inviteEmployeeSchema.parse(req.body);

    const invitedRole = normalizeInvitedRole(parsed.user_role);
    if (!invitedRole) {
      return res.status(400).json({ ok: false, message: "Invalid employee role" });
    }

    const normalizedEmail = normalizeEmail(parsed.email);

    await client.query("BEGIN");

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

      const existingRoles = rolesRes.rows.map((r) => String(r.role || "").trim().toLowerCase());

      if (existingRoles.includes("superuser") || existingRoles.includes("admin") || existingRoles.includes("worker")) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          ok: false,
          message: "This user already has an employee role",
        });
      }

      await client.query(
        `
        UPDATE users
        SET
          first_name = COALESCE(NULLIF($2, ''), first_name),
          last_name = COALESCE(NULLIF($3, ''), last_name),
          phone = COALESCE(NULLIF($4, ''), phone),
          updated_at = now()
        WHERE id = $1
        `,
        [user.id, parsed.first_name, parsed.last_name, parsed.phone || null]
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
        VALUES ($1, NULL, $2, $3, $4, NULL, NULL)
        RETURNING id, public_id, email, first_name, last_name, phone, password_hash, email_verified_at
        `,
        [normalizedEmail, parsed.first_name, parsed.last_name, parsed.phone || null]
      );

      user = created.rows[0];
    }

    await client.query(
      `DELETE FROM employee_invites WHERE user_id = $1 AND consumed_at IS NULL`,
      [user.id]
    );

    const token = generateInviteToken();
    const tokenHash = hashValue(token);
    const expiresAt = addDays(new Date(), 7).toISOString();

    await client.query(
      `
      INSERT INTO employee_invites (
        user_id,
        invited_by_user_id,
        invited_role,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [user.id, actorUserId, invitedRole, tokenHash, expiresAt]
    );

    await client.query("COMMIT");

    const setupUrl = buildAppUrl(
      String(process.env.EMPLOYEE_SETUP_PATH || "/employee-setup").trim(),
      { token }
    );

    const emailResult = await sendEmployeeInviteEmail({
      to: user.email,
      firstName: user.first_name,
      roleLabel: displayRole(invitedRole),
      setupUrl,
    });

    return res.status(201).json({
      ok: true,
      employee: {
        public_id: user.public_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        user_role: displayRole(invitedRole),
      },
      invite: {
        expiresAt,
      },
      email: emailResult,
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
 * POST /employees/complete
 * Public endpoint used from employee setup page
 *
 * - validates invite token
 * - sets password
 * - optionally confirms details
 * - marks email verified
 * - applies employee role
 * - removes customer role if present
 */
router.post("/complete", async (req, res, next) => {
  const client = await pool.connect();

  try {
    const parsed = completeEmployeeSetupSchema.parse(req.body);
    const tokenHash = hashValue(parsed.token);

    await client.query("BEGIN");

    const inviteRes = await client.query(
      `
      SELECT
        ei.id,
        ei.user_id,
        ei.invited_role,
        ei.expires_at,
        ei.consumed_at,
        u.email,
        u.first_name,
        u.last_name,
        u.phone,
        u.password_hash,
        u.email_verified_at
      FROM employee_invites ei
      JOIN users u ON u.id = ei.user_id
      WHERE ei.token_hash = $1
        AND ei.consumed_at IS NULL
        AND ei.expires_at > now()
      ORDER BY ei.created_at DESC
      LIMIT 1
      FOR UPDATE
      `,
      [tokenHash]
    );

    const invite = inviteRes.rows[0] || null;
    if (!invite) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "Invalid or expired invite" });
    }

    const userRes = await client.query(
      `
      SELECT id, public_id, email, password_hash, email_verified_at
      FROM users
      WHERE id = $1
      LIMIT 1
      FOR UPDATE
      `,
      [invite.user_id]
    );

    const user = userRes.rows[0] || null;
    if (!user) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "Account not found" });
    }

    if (user.password_hash) {
      const sameAsCurrent = await argon2.verify(user.password_hash, parsed.password);
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

      const reused = await argon2.verify(row.password_hash, parsed.password);
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

    const passwordHash = await argon2.hash(parsed.password);

    await client.query(
      `
      UPDATE users
      SET
        password_hash = $2,
        first_name = COALESCE(NULLIF($3, ''), first_name),
        last_name = COALESCE(NULLIF($4, ''), last_name),
        phone = COALESCE(NULLIF($5, ''), phone),
        email_verified_at = COALESCE(email_verified_at, now()),
        updated_at = now()
      WHERE id = $1
      `,
      [
        user.id,
        passwordHash,
        parsed.first_name || null,
        parsed.last_name || null,
        parsed.phone || null,
      ]
    );

    await client.query(
      `
      INSERT INTO user_roles (user_id, role)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [user.id, invite.invited_role]
    );

    await client.query(
      `DELETE FROM user_roles WHERE user_id = $1 AND role = 'customer'`,
      [user.id]
    );

    await client.query(
      `UPDATE employee_invites SET consumed_at = now() WHERE id = $1`,
      [invite.id]
    );

    await client.query(
      `DELETE FROM email_verification_codes WHERE user_id = $1 AND consumed_at IS NULL`,
      [user.id]
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

    const { sessionId, expiresAt } = await createSession(user.id);

    const cookieName = process.env.SESSION_COOKIE_NAME || "sid";
    res.cookie(cookieName, sessionId, {
      ...getCookieOptions(),
      expires: new Date(expiresAt),
    });
    setCsrfCookie(res);

    return res.json({
      ok: true,
      user: {
        public_id: user.public_id,
        email: user.email,
        user_role: displayRole(invite.invited_role),
      },
      session: { expiresAt },
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
 * POST /employees/:publicId/term
 * Superuser-only — terminate an employee.
 *
 * - Blocks access immediately: nulls password_hash, removes all employee
 *   roles, kills all active sessions, and stamps termed_at.
 * - The user row is preserved so booking/message history remains intact.
 * - Self-termination is rejected.
 */
router.post("/:publicId/term", requireAuth, requireRole("superuser"), async (req, res, next) => {
  const client = await pool.connect();

  try {
    const actorUserId = req.user?.id ?? req.auth?.userId ?? null;
    const publicId = String(req.params.publicId || "").trim();

    if (!publicId) {
      return res.status(400).json({ ok: false, message: "Missing employee id" });
    }

    await client.query("BEGIN");

    const userRes = await client.query(
      `SELECT id, email, termed_at FROM users WHERE public_id = $1 LIMIT 1 FOR UPDATE`,
      [publicId]
    );

    if (userRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, message: "Employee not found" });
    }

    const user = userRes.rows[0];

    if (Number(user.id) === Number(actorUserId)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "You cannot terminate your own account" });
    }

    if (user.termed_at) {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Employee is already termed" });
    }

    // Remove all employee roles
    await client.query(
      `DELETE FROM user_roles WHERE user_id = $1 AND role IN ('superuser', 'admin', 'worker')`,
      [user.id]
    );

    // Cancel any pending invites
    await client.query(
      `DELETE FROM employee_invites WHERE user_id = $1 AND consumed_at IS NULL`,
      [user.id]
    );

    // Kill all active sessions — immediate sign-out
    await client.query(`DELETE FROM sessions WHERE user_id = $1`, [user.id]);

    // Null password_hash — cannot log in even if sessions are somehow restored
    await client.query(
      `UPDATE users SET password_hash = NULL, termed_at = now(), updated_at = now() WHERE id = $1`,
      [user.id]
    );

    // Unassign all active bookings assigned to this worker.
    // Only 'assigned' status bookings are affected — completed and cancelled are
    // historical records and must not be touched.

    // Step 1: Clear the worker from all open bookings and capture the affected IDs.
    const unassignRes = await client.query(
      `UPDATE bookings
       SET
         status = 'accepted',
         assigned_worker_user_id = NULL,
         updated_at = now()
       WHERE assigned_worker_user_id = $1
         AND status = 'assigned'
       RETURNING id`,
      [user.id]
    );

    const affectedBookingIds = unassignRes.rows.map((r) => r.id);

    if (affectedBookingIds.length > 0) {
      // Step 2: Remove the assignment rows so booking_participants stays in sync
      // via the existing trg_spc_sync_worker_participant_on_assignment trigger.
      await client.query(
        `DELETE FROM booking_assignments
         WHERE worker_user_id = $1
           AND booking_id = ANY($2::bigint[])`,
        [user.id, affectedBookingIds]
      );

      // Step 3: Audit trail — one event per affected booking.
      await client.query(
        `INSERT INTO booking_events (booking_id, actor_user_id, event_type, metadata)
         SELECT
           unnest($1::bigint[]),
           $2,
           'worker_unassigned',
           $3::jsonb`,
        [
          affectedBookingIds,
          actorUserId,
          JSON.stringify({ reason: "employee_termed" }),
        ]
      );
    }

    // Audit log — include how many bookings were unassigned for visibility.
    await client.query(
      `INSERT INTO admin_audit_log (actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1, 'employee_termed', 'user', $2::text, $3::jsonb)`,
      [
        actorUserId,
        String(user.id),
        JSON.stringify({ unassigned_bookings: affectedBookingIds.length }),
      ]
    );

    await client.query("COMMIT");

    return res.json({ ok: true, unassigned_bookings: affectedBookingIds.length });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    next(err);
  } finally {
    client.release();
  }
});

/**
 * POST /employees/:publicId/reinstate
 * Superuser-only — reinstate a termed employee.
 *
 * - Clears termed_at.
 * - Creates a fresh employee invite for the specified role.
 * - Sends the setup email — employee must create a new password to regain access.
 * - Does NOT restore roles until the employee completes their new setup.
 */
router.post("/:publicId/reinstate", requireAuth, requireRole("superuser"), async (req, res, next) => {
  const client = await pool.connect();

  try {
    const actorUserId = req.user?.id ?? req.auth?.userId ?? null;
    const publicId = String(req.params.publicId || "").trim();

    if (!publicId) {
      return res.status(400).json({ ok: false, message: "Missing employee id" });
    }

    const parsed = reinstateEmployeeSchema.parse(req.body);
    const invitedRole = normalizeInvitedRole(parsed.user_role);
    if (!invitedRole) {
      return res.status(400).json({ ok: false, message: "Invalid employee role" });
    }

    await client.query("BEGIN");

    const userRes = await client.query(
      `SELECT id, public_id, email, first_name, last_name, phone, termed_at
       FROM users WHERE public_id = $1 LIMIT 1 FOR UPDATE`,
      [publicId]
    );

    if (userRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, message: "Employee not found" });
    }

    const user = userRes.rows[0];

    if (!user.termed_at) {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Employee is not currently termed" });
    }

    // Clear termed status
    await client.query(
      `UPDATE users SET termed_at = NULL, updated_at = now() WHERE id = $1`,
      [user.id]
    );

    // Cancel any stale pending invites
    await client.query(
      `DELETE FROM employee_invites WHERE user_id = $1 AND consumed_at IS NULL`,
      [user.id]
    );

    // Create a fresh invite
    const token = generateInviteToken();
    const tokenHash = hashValue(token);
    const expiresAt = addDays(new Date(), 7).toISOString();

    await client.query(
      `INSERT INTO employee_invites (user_id, invited_by_user_id, invited_role, token_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, actorUserId, invitedRole, tokenHash, expiresAt]
    );

    // Audit log
    await client.query(
      `INSERT INTO admin_audit_log (actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1, 'employee_reinstated', 'user', $2::text, $3::jsonb)`,
      [actorUserId, String(user.id), JSON.stringify({ invited_role: invitedRole })]
    );

    await client.query("COMMIT");

    // Send invite email after commit — failure here doesn't roll back the reinstate
    const setupUrl = buildAppUrl(
      String(process.env.EMPLOYEE_SETUP_PATH || "/employee-setup").trim(),
      { token }
    );

    const emailResult = await sendEmployeeInviteEmail({
      to: user.email,
      firstName: user.first_name,
      roleLabel: displayRole(invitedRole),
      setupUrl,
    });

    return res.json({ ok: true, email: emailResult });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    next(err);
  } finally {
    client.release();
  }
});

/**
 * PATCH /employees/:publicId/roles
 * Superuser-only — adjust admin/worker roles for an active employee.
 *
 * - Replaces the employee's admin + worker roles with the submitted set.
 * - Superuser role is immutable via this endpoint.
 * - Self-modification is rejected.
 * - Termed employees cannot have roles adjusted.
 * - Result set must not be empty (at least one of admin/worker required).
 */
const adjustRolesSchema = z.object({
  roles: z
    .array(z.enum(["admin", "worker"]))
    .min(1, "At least one role is required"),
});

router.patch("/:publicId/roles", requireAuth, requireRole("superuser"), async (req, res, next) => {
  const client = await pool.connect();

  try {
    const actorUserId = req.user?.id ?? req.auth?.userId ?? null;
    const publicId = String(req.params.publicId || "").trim();

    if (!publicId) {
      return res.status(400).json({ ok: false, message: "Missing employee id" });
    }

    const parsed = adjustRolesSchema.parse(req.body);
    const newRoles = [...new Set(parsed.roles)]; // deduplicate

    await client.query("BEGIN");

    const userRes = await client.query(
      `SELECT id, email, termed_at FROM users WHERE public_id = $1 LIMIT 1 FOR UPDATE`,
      [publicId]
    );

    if (userRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, message: "Employee not found" });
    }

    const user = userRes.rows[0];

    if (Number(user.id) === Number(actorUserId)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "You cannot modify your own roles" });
    }

    if (user.termed_at) {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Cannot adjust roles for a termed employee" });
    }

    // Verify target is actually an employee (has at least one employee role)
    const currentRolesRes = await client.query(
      `SELECT role FROM user_roles WHERE user_id = $1 AND role IN ('superuser', 'admin', 'worker')`,
      [user.id]
    );
    const currentRoles = currentRolesRes.rows.map((r) => String(r.role));

    if (currentRoles.length === 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "User is not an active employee" });
    }

    const isSuperuser = currentRoles.includes("superuser");

    // Remove only admin/worker — preserve superuser if present
    await client.query(
      `DELETE FROM user_roles WHERE user_id = $1 AND role IN ('admin', 'worker')`,
      [user.id]
    );

    // Insert the new role set
    for (const role of newRoles) {
      await client.query(
        `INSERT INTO user_roles (user_id, role) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [user.id, role]
      );
    }

    // Audit log
    await client.query(
      `INSERT INTO admin_audit_log (actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1, 'employee_roles_adjusted', 'user', $2::text, $3::jsonb)`,
      [
        actorUserId,
        String(user.id),
        JSON.stringify({ previous_roles: currentRoles.filter((r) => r !== "superuser"), new_roles: newRoles, superuser_preserved: isSuperuser }),
      ]
    );

    await client.query("COMMIT");

    // Return the full updated role set
    const updatedRolesRes = await pool.query(
      `SELECT role FROM user_roles WHERE user_id = $1`,
      [user.id]
    );
    const updatedRoles = updatedRolesRes.rows.map((r) => String(r.role));

    return res.json({ ok: true, roles: updatedRoles });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;