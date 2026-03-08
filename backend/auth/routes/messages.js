// backend/auth/routes/messages.js
const express = require("express");
const { pool } = require("../src/db");
const { z } = require("zod");
const { requireAuth } = require("../middleware/requireAuth");
const { broadcastToBookingParticipants } = require("../src/realtime");

const router = express.Router();

async function getRolesByDb(userId) {
  const rolesRes = await pool.query(`SELECT role FROM user_roles WHERE user_id = $1`, [userId]);
  return rolesRes.rows
    .map((r) => String(r.role || "").trim().toLowerCase())
    .filter(Boolean);
}

function computeSenderRole(roles) {
  if (roles.includes("superuser")) return "superuser";
  if (roles.includes("admin")) return "admin";
  if (roles.includes("worker")) return "worker";
  return "customer";
}

async function getBookingIdByPublicId(publicId) {
  const r = await pool.query(`SELECT id FROM bookings WHERE public_id = $1 LIMIT 1`, [publicId]);
  return r.rows[0]?.id ?? null;
}

/**
 * Access model:
 * - superuser/admin: access ANY booking thread
 * - otherwise: must be an ACTIVE booking_participant for the booking
 */
async function canAccessBooking({ userId, roles, bookingId }) {
  const isAdminish = roles.includes("admin") || roles.includes("superuser");
  if (isAdminish) return true;

  const r = await pool.query(
    `
    SELECT 1
    FROM booking_participants bp
    WHERE bp.booking_id = $1
      AND bp.user_id = $2
      AND bp.removed_at IS NULL
    LIMIT 1
    `,
    [bookingId, userId]
  );

  return r.rowCount > 0;
}

async function getMessageWithUserFields(messageId, bookingId) {
  const r = await pool.query(
    `
    SELECT
      m.id,
      m.booking_id,
      m.sender_user_id,
      m.sender_role,
      m.body,
      m.created_at,
      m.updated_at,
      m.delivered_at,
      u.first_name,
      u.last_name
    FROM booking_messages m
    LEFT JOIN users u ON u.id = m.sender_user_id
    WHERE m.id = $1
      AND m.booking_id = $2
      AND m.deleted_at IS NULL
    LIMIT 1
    `,
    [messageId, bookingId]
  );

  return r.rows[0] ?? null;
}

const sendSchema = z.object({
  body: z.string().min(1).max(4000).transform((s) => s.trim()),
});

const editSchema = z.object({
  body: z.string().min(1).max(4000).transform((s) => s.trim()),
});

/**
 * GET /admin/bookings/:publicId/messages
 */
router.get("/admin/bookings/:publicId/messages", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const publicId = String(req.params.publicId || "").trim();
    const bookingId = await getBookingIdByPublicId(publicId);
    if (!bookingId) return res.status(404).json({ ok: false, message: "Booking not found" });

    const roles = await getRolesByDb(userId);
    const allowed = await canAccessBooking({ userId, roles, bookingId });
    if (!allowed) return res.status(403).json({ ok: false, message: "Forbidden" });

    const msgs = await pool.query(
      `
      SELECT
        m.id,
        m.booking_id,
        m.sender_user_id,
        m.sender_role,
        m.body,
        m.created_at,
        m.updated_at,
        m.delivered_at,
        u.first_name,
        u.last_name
      FROM booking_messages m
      LEFT JOIN users u ON u.id = m.sender_user_id
      WHERE m.booking_id = $1
        AND m.deleted_at IS NULL
      ORDER BY m.created_at ASC
      `,
      [bookingId]
    );

    return res.json({ ok: true, messages: msgs.rows });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /admin/bookings/:publicId/messages
 *
 * Realtime policy:
 * - notify active booking participants
 * - ALSO notify all admin/superuser accounts
 * - exclude the sender
 */
router.post("/admin/bookings/:publicId/messages", requireAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const publicId = String(req.params.publicId || "").trim();
    const bookingId = await getBookingIdByPublicId(publicId);
    if (!bookingId) return res.status(404).json({ ok: false, message: "Booking not found" });

    const roles = await getRolesByDb(userId);
    const allowed = await canAccessBooking({ userId, roles, bookingId });
    if (!allowed) return res.status(403).json({ ok: false, message: "Forbidden" });

    const parsed = sendSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, message: "Invalid body", issues: parsed.error.issues });
    }
    if (!parsed.data.body) {
      return res.status(400).json({ ok: false, message: "Empty message" });
    }

    const senderRole = computeSenderRole(roles);

    await client.query("BEGIN");

    const ins = await client.query(
      `
      INSERT INTO booking_messages (booking_id, sender_user_id, sender_role, body)
      VALUES ($1, $2, $3, $4)
      RETURNING id, booking_id, sender_user_id, sender_role, body, created_at, updated_at, delivered_at
      `,
      [bookingId, userId, senderRole, parsed.data.body]
    );

    const insertedId = ins.rows[0].id;

    const message = await client.query(
      `
      SELECT
        m.id,
        m.booking_id,
        m.sender_user_id,
        m.sender_role,
        m.body,
        m.created_at,
        m.updated_at,
        m.delivered_at,
        u.first_name,
        u.last_name
      FROM booking_messages m
      LEFT JOIN users u ON u.id = m.sender_user_id
      WHERE m.id = $1
        AND m.booking_id = $2
        AND m.deleted_at IS NULL
      LIMIT 1
      `,
      [insertedId, bookingId]
    );

    const msg = message.rows[0] ?? ins.rows[0];
    const fromName = [msg.first_name, msg.last_name].filter(Boolean).join(" ").trim() || null;

    await client.query("COMMIT");

    await broadcastToBookingParticipants(
      pool,
      bookingId,
      {
        type: "message.new",
        threadId: publicId,
        at: msg.created_at,
        snippet: msg.body,
        fromName,
        senderRole: msg.sender_role,
      },
      {
        includeAdminRoles: true,
        excludeUserIds: [userId],
      }
    );

    return res.json({ ok: true, message: msg });
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
 * PATCH /admin/bookings/:publicId/messages/:messageId
 * Only sender_user_id can edit.
 */
router.patch("/admin/bookings/:publicId/messages/:messageId", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const publicId = String(req.params.publicId || "").trim();
    const bookingId = await getBookingIdByPublicId(publicId);
    if (!bookingId) return res.status(404).json({ ok: false, message: "Booking not found" });

    const roles = await getRolesByDb(userId);
    const allowed = await canAccessBooking({ userId, roles, bookingId });
    if (!allowed) return res.status(403).json({ ok: false, message: "Forbidden" });

    const messageId = Number(req.params.messageId);
    if (!Number.isFinite(messageId)) {
      return res.status(400).json({ ok: false, message: "Bad message id" });
    }

    const parsed = editSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, message: "Invalid body", issues: parsed.error.issues });
    }
    if (!parsed.data.body) {
      return res.status(400).json({ ok: false, message: "Empty message" });
    }

    const ownerCheck = await pool.query(
      `SELECT sender_user_id FROM booking_messages WHERE id = $1 AND booking_id = $2 AND deleted_at IS NULL`,
      [messageId, bookingId]
    );

    const senderUserId = ownerCheck.rows[0]?.sender_user_id ?? null;
    if (!senderUserId) {
      return res.status(404).json({ ok: false, message: "Message not found" });
    }
    if (Number(senderUserId) !== Number(userId)) {
      return res.status(403).json({ ok: false, message: "Only the sender can edit this message" });
    }

    await pool.query(
      `
      UPDATE booking_messages
      SET body = $1, updated_at = now()
      WHERE id = $2
      `,
      [parsed.data.body, messageId]
    );

    const updated = await getMessageWithUserFields(messageId, bookingId);
    if (!updated) {
      return res.status(404).json({ ok: false, message: "Message not found" });
    }

    return res.json({ ok: true, message: updated });
  } catch (e) {
    next(e);
  }
});

module.exports = router;