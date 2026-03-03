// backend/auth/routes/bookingPrices.js
const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

async function getRolesByDb(userId) {
  const rolesRes = await pool.query(`SELECT role FROM user_roles WHERE user_id = $1`, [userId]);
  return rolesRes.rows.map((r) => String(r.role || "").trim().toLowerCase()).filter(Boolean);
}

async function isAdminOrSuper(userId) {
  const roles = await getRolesByDb(userId);
  return roles.includes("admin") || roles.includes("superuser");
}

// assigned tech guard (for worker)
async function isAssignedWorker(userId, bookingId) {
  const r = await pool.query(
    `SELECT 1 FROM booking_assignments WHERE booking_id = $1 AND worker_user_id = $2 LIMIT 1`,
    [bookingId, userId]
  );
  return r.rowCount > 0;
}

const setFinalPriceSchema = z.object({
  final_price_cents: z
    .union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)])
    .transform((v) => Number(v)),
});

/**
 * GET /bookings/:publicId/price
 * - admin/superuser can read any
 * - assigned worker can read their own booking
 */
router.get("/bookings/:publicId/price", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const bookingPublicId = String(req.params.publicId || "").trim();
    if (!bookingPublicId) return res.status(400).json({ ok: false, message: "Missing booking id" });

    const bRes = await pool.query(`SELECT id FROM bookings WHERE public_id = $1 LIMIT 1`, [bookingPublicId]);
    if (bRes.rowCount === 0) return res.status(404).json({ ok: false, message: "Booking not found" });

    const bookingId = bRes.rows[0].id;

    const adminish = await isAdminOrSuper(userId);
    if (!adminish) {
      const assigned = await isAssignedWorker(userId, bookingId);
      if (!assigned) return res.status(403).json({ ok: false, message: "Forbidden" });
    }

    const pRes = await pool.query(
      `
      SELECT
        bp.initial_price_cents,
        bp.final_price_cents,
        bp.currency,
        bp.set_by_user_id,
        bp.set_at,
        bp.created_at,
        bp.updated_at
      FROM booking_prices bp
      WHERE bp.booking_id = $1
      LIMIT 1
      `,
      [bookingId]
    );

    if (pRes.rowCount === 0) {
      // should not happen if you always insert on create, but safe fallback
      return res.json({
        ok: true,
        price: {
          initial_price_cents: 0,
          final_price_cents: null,
          currency: "USD",
          set_by_user_id: null,
          set_at: null,
          created_at: null,
          updated_at: null,
        },
      });
    }

    return res.json({ ok: true, price: pRes.rows[0] });
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /bookings/:publicId/price
 * - admin/superuser can set any
 * - assigned worker can set final price for their own booking
 */
router.patch("/bookings/:publicId/price", requireAuth, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const bookingPublicId = String(req.params.publicId || "").trim();
    if (!bookingPublicId) return res.status(400).json({ ok: false, message: "Missing booking id" });

    const { final_price_cents } = setFinalPriceSchema.parse(req.body);

    await client.query("BEGIN");

    const bRes = await client.query(
      `SELECT id, status, service_id FROM bookings WHERE public_id = $1 FOR UPDATE`,
      [bookingPublicId]
    );
    if (bRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, message: "Booking not found" });
    }

    const booking = bRes.rows[0];

    // forbid pricing cancelled bookings
    if (booking.status === "cancelled") {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Cannot set price for a cancelled booking" });
    }

    const adminish = await isAdminOrSuper(userId);
    if (!adminish) {
      const assigned = await isAssignedWorker(userId, booking.id);
      if (!assigned) {
        await client.query("ROLLBACK");
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
      // optional: only allow when assigned or completed
      if (booking.status !== "assigned" && booking.status !== "completed") {
        await client.query("ROLLBACK");
        return res.status(409).json({ ok: false, message: "Price can only be set when assigned/completed" });
      }
    }

    // Ensure booking_prices exists (fallback)
    await client.query(
      `
      INSERT INTO booking_prices (booking_id, initial_price_cents, final_price_cents, currency)
      SELECT b.id, COALESCE(s.base_price_cents, 0), NULL, 'USD'
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      WHERE b.id = $1
      ON CONFLICT (booking_id) DO NOTHING
      `,
      [booking.id]
    );

    const pRes = await client.query(
      `
      UPDATE booking_prices
      SET
        final_price_cents = $2,
        set_by_user_id = $3,
        set_at = now()
      WHERE booking_id = $1
      RETURNING initial_price_cents, final_price_cents, currency, set_by_user_id, set_at, created_at, updated_at
      `,
      [booking.id, final_price_cents, userId]
    );

    await client.query("COMMIT");
    return res.json({ ok: true, price: pRes.rows[0] });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    next(e);
  } finally {
    client.release();
  }
});

module.exports = router;