// routes/adminMetricsBookingsExport.js
const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

/**
 * IMPORTANT CHANGE:
 * - start/end are treated as DATE-ONLY in the *DB timezone*.
 * - end is INCLUSIVE for humans; we convert it to end_exclusive by adding +1 day in SQL.
 * This fixes the timezone mismatch you saw (completed_at stored with -08).
 */
const querySchema = z.object({
  start: z.string().optional(), // YYYY-MM-DD
  end: z.string().optional(), // YYYY-MM-DD (inclusive)
});

async function requireSuperUserByDb(userId) {
  const rolesRes = await pool.query(`SELECT role FROM user_roles WHERE user_id = $1`, [userId]);
  const roles = rolesRes.rows.map((r) => r.role);
  return roles.includes("superuser");
}

function parseDateOnly(s) {
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;

  // Validate date is real (e.g., 2026-02-30 should fail)
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;

  // Make sure it round-trips (guards weird parsing)
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const roundTrip = `${yyyy}-${mm}-${dd}`;
  if (roundTrip !== s) return null;

  return s;
}

function toISODateOnlyLocal(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

router.get("/admin/metrics/bookings/export", requireAuth, async (req, res, next) => {
  try {
    const { start, end } = querySchema.parse(req.query);

    const userId = req.user?.id ?? req.auth?.userId ?? null;
    if (!userId) return res.status(401).json({ ok: false, message: "Not authenticated" });

    const ok = await requireSuperUserByDb(userId);
    if (!ok) return res.status(403).json({ ok: false, message: "Forbidden" });

    // Default: last 90 days inclusive through today (DATE-ONLY)
    const now = new Date();
    const endDefaultInclusive = toISODateOnlyLocal(now);
    const startDefault = toISODateOnlyLocal(new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000));

    const startDate = parseDateOnly(start) || startDefault;
    const endInclusive = parseDateOnly(end) || endDefaultInclusive;

    // Validate range length using UTC day math (good enough for limiting user input)
    const startMs = new Date(`${startDate}T00:00:00Z`).getTime();
    const endMsInclusive = new Date(`${endInclusive}T00:00:00Z`).getTime();
    if (!(endMsInclusive >= startMs)) {
      return res.status(400).json({ ok: false, message: "Invalid range: end must be on/after start" });
    }

    const maxDays = 366;
    const diffDaysInclusive = Math.floor((endMsInclusive - startMs) / (24 * 60 * 60 * 1000)) + 1;
    if (diffDaysInclusive > maxDays) {
      return res.status(400).json({ ok: false, message: `Range too large (max ${maxDays} days)` });
    }

    /**
     * KEY FIX:
     * Convert date-only -> timestamptz in the DB timezone:
     *   start_ts = (start::date)::timestamptz
     *   end_ts   = ((end::date + 1)::date)::timestamptz   -- end is inclusive; +1 day makes it exclusive
     *
     * This avoids off-by-one and timezone issues when completed_at is stored with an offset (e.g. -08).
     */
    const rowsRes = await pool.query(
      `
      WITH params AS (
        SELECT
          ($1::date)::timestamptz AS start_ts,
          (($2::date + 1)::date)::timestamptz AS end_ts
      ),
      latest_assignment AS (
        SELECT DISTINCT ON (ba.booking_id)
          ba.booking_id,
          ba.worker_user_id,
          ba.assigned_at
        FROM booking_assignments ba
        ORDER BY ba.booking_id, ba.assigned_at DESC
      )
      SELECT
        b.public_id AS booking_public_id,
        b.status,
        b.starts_at,
        b.ends_at,
        b.created_at AS booking_created_at,
        b.completed_at,
        b.cancelled_at,

        s.title AS service_title,

        cu.public_id AS customer_public_id,
        cu.email AS customer_email,
        cu.first_name AS customer_first_name,
        cu.last_name  AS customer_last_name,
        cu.account_type AS customer_account_type,
        cu.phone AS customer_phone,
        b.address AS service_address,
        b.notes AS customer_notes,

        w.public_id AS worker_public_id,
        w.first_name AS worker_first_name,
        w.last_name  AS worker_last_name,
        w.phone AS worker_phone,
        w.email AS worker_email

      FROM bookings b
      JOIN params p ON true
      JOIN services s ON s.id = b.service_id
      JOIN users cu ON cu.id = b.customer_user_id
      LEFT JOIN latest_assignment la ON la.booking_id = b.id
      LEFT JOIN users w ON w.id = la.worker_user_id

      WHERE b.status = 'completed'
        AND b.completed_at IS NOT NULL
        AND b.completed_at >= p.start_ts
        AND b.completed_at <  p.end_ts

      ORDER BY b.completed_at DESC
      `,
      [startDate, endInclusive]
    );

    const filename = `completed_bookings_${startDate}_to_${endInclusive}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const headers = [
      "service_title",
      "starts_at",
      "ends_at",
      "customer_name",
      "customer_account_type",
      "customer_phone",
      "customer_email",
      "service_address",
      "booking_public_id",
      "booking_created_at",
      "customer_notes",
      "completed_by_name",
      "completed_by_phone",
      "completed_by_email",
      "completed_at",
    ];

    res.write(headers.join(",") + "\n");

    for (const r of rowsRes.rows) {
      const customerName =
        `${r.customer_first_name || ""} ${r.customer_last_name || ""}`.trim() || r.customer_email || "";
      const completedByName = `${r.worker_first_name || ""} ${r.worker_last_name || ""}`.trim() || "";

      const line = [
        r.service_title,
        r.starts_at,
        r.ends_at,
        customerName,
        r.customer_account_type,
        r.customer_phone,
        r.customer_email,
        r.service_address,
        r.booking_public_id,
        r.booking_created_at,
        r.customer_notes,
        completedByName,
        r.worker_phone,
        r.worker_email,
        r.completed_at,
      ]
        .map(csvEscape)
        .join(",");

      res.write(line + "\n");
    }

    res.end();
  } catch (e) {
    next(e);
  }
});

module.exports = router;