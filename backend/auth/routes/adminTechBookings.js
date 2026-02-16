// backend/auth/routes/adminTechBookings.js
const express = require("express");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

async function requireAdminOrSuperUserByDb(userId) {
  const rolesRes = await pool.query(`SELECT role FROM user_roles WHERE user_id = $1`, [userId]);
  const roles = rolesRes.rows.map((r) => String(r.role || "").trim().toLowerCase()).filter(Boolean);
  return roles.includes("admin") || roles.includes("superuser");
}

router.get("/admin/tech-bookings", requireAuth, async (req, res, next) => {
  try {
    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const ok = await requireAdminOrSuperUserByDb(userId);
    if (!ok) return res.status(403).json({ ok: false, message: "Forbidden" });

    // 1) tech list (workers)
    const techRes = await pool.query(
        `
        SELECT u.id AS user_id, u.public_id, u.email, u.first_name, u.last_name, u.phone
        FROM users u
        JOIN user_roles ur ON ur.user_id = u.id
        WHERE ur.role = 'worker'
        ORDER BY u.last_name NULLS LAST, u.first_name NULLS LAST, u.email
        `
    );

    // 2) assigned bookings with latest assignment per booking
    const assignedRes = await pool.query(
      `
      WITH latest_assignment AS (
        SELECT DISTINCT ON (ba.booking_id)
          ba.booking_id,
          ba.worker_user_id,
          ba.assigned_at
        FROM booking_assignments ba
        ORDER BY ba.booking_id, ba.assigned_at DESC
      )
      SELECT
        b.public_id,
        b.status,
        b.starts_at,
        b.ends_at,
        b.address,
        b.notes,
        s.title AS service_title,

        cu.first_name AS customer_first_name,
        cu.last_name  AS customer_last_name,
        cu.email      AS customer_email,
        cu.phone      AS customer_phone,
        cu.account_type AS customer_account_type,

        la.worker_user_id

      FROM bookings b
      JOIN services s ON s.id = b.service_id
      JOIN users cu ON cu.id = b.customer_user_id
      JOIN latest_assignment la ON la.booking_id = b.id

      WHERE b.status = 'assigned'
      ORDER BY la.worker_user_id, b.starts_at ASC
      `
    );

    // Build lookup
    const techs = techRes.rows.map((t) => ({
      user_id: t.user_id,
      public_id: t.public_id ?? null,
      email: t.email ?? null,
      first_name: t.first_name ?? null,
      last_name: t.last_name ?? null,
      phone: t.phone ?? null,
      bookings: [],
    }));

    const byId = new Map(techs.map((t) => [String(t.user_id), t]));

    for (const r of assignedRes.rows) {
      const tech = byId.get(String(r.worker_user_id));
      if (!tech) continue;

      const customerName = `${r.customer_first_name || ""} ${r.customer_last_name || ""}`.trim() || null;

      tech.bookings.push({
        public_id: r.public_id,
        status: r.status,
        starts_at: r.starts_at,
        ends_at: r.ends_at,
        address: r.address,
        notes: r.notes ?? null,
        service_title: r.service_title,

        customer_name: customerName,
        customer_email: r.customer_email ?? null,
        customer_phone: r.customer_phone ?? null,
        customer_account_type: r.customer_account_type ?? null,
      });
    }

    return res.json({ ok: true, technicians: techs, generated_at: new Date().toISOString() });
  } catch (e) {
    next(e);
  }
});

module.exports = router;