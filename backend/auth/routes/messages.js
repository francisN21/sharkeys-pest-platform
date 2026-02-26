// backend/auth/routes/messages.js
const express = require("express");
const { pool } = require("../src/db");
const { z } = require("zod");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

async function getRolesByDb(userId) {
  const rolesRes = await pool.query(`SELECT role FROM user_roles WHERE user_id = $1`, [userId]);
  return rolesRes.rows
    .map((r) => String(r.role || "").trim().toLowerCase())
    .filter(Boolean);
}

async function canAccessBooking({ userId, roles, bookingId }) {
  const isAdminish = roles.includes("admin") || roles.includes("superuser");
  if (isAdminish) return true;

  if (roles.includes("worker")) {
    const r = await pool.query(
      `SELECT 1 FROM booking_assignments ba WHERE ba.booking_id = $1 AND ba.worker_user_id = $2 LIMIT 1`,
      [bookingId, userId]
    );
    return r.rowCount > 0;
  }

  // Optional: customer access later
  return false;
}

async function getBookingIdByPublicId(publicId) {
  const r = await pool.query(`SELECT id FROM bookings WHERE public_id = $1 LIMIT 1`, [publicId]);
  return r.rows[0]?.id ?? null;
}

function computeSenderRole(roles) {
  if (roles.includes("superuser")) return "superuser";
  if (roles.includes("admin")) return "admin";
  if (roles.includes("worker")) return "worker";
  return "customer";
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
 */
router.post("/admin/bookings/:publicId/messages", requireAuth, async (req, res, next) => {
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
    if (!parsed.data.body) return res.status(400).json({ ok: false, message: "Empty message" });

    const senderRole = computeSenderRole(roles);

    const ins = await pool.query(
      `
      INSERT INTO booking_messages (booking_id, sender_user_id, sender_role, body)
      VALUES ($1, $2, $3, $4)
      RETURNING id, booking_id, sender_user_id, sender_role, body, created_at, updated_at, delivered_at
      `,
      [bookingId, userId, senderRole, parsed.data.body]
    );

    return res.json({ ok: true, message: ins.rows[0] });
  } catch (e) {
    next(e);
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
    if (!Number.isFinite(messageId)) return res.status(400).json({ ok: false, message: "Bad message id" });

    const parsed = editSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, message: "Invalid body", issues: parsed.error.issues });
    }
    if (!parsed.data.body) return res.status(400).json({ ok: false, message: "Empty message" });

    // Only sender can edit
    const ownerCheck = await pool.query(
      `SELECT sender_user_id FROM booking_messages WHERE id = $1 AND booking_id = $2 AND deleted_at IS NULL`,
      [messageId, bookingId]
    );
    const senderUserId = ownerCheck.rows[0]?.sender_user_id ?? null;
    if (!senderUserId) return res.status(404).json({ ok: false, message: "Message not found" });
    if (Number(senderUserId) !== Number(userId)) {
      return res.status(403).json({ ok: false, message: "Only the sender can edit this message" });
    }

    const upd = await pool.query(
      `
      UPDATE booking_messages
      SET body = $1, updated_at = now()
      WHERE id = $2
      RETURNING id, booking_id, sender_user_id, sender_role, body, created_at, updated_at, delivered_at
      `,
      [parsed.data.body, messageId]
    );

    return res.json({ ok: true, message: upd.rows[0] });
  } catch (e) {
    next(e);
  }
});

module.exports = router;