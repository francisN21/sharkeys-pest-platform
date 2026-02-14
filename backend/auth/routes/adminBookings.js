const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

async function addEvent(client, bookingId, actorUserId, eventType, metadata = {}) {
  await client.query(
    `INSERT INTO booking_events (booking_id, actor_user_id, event_type, metadata)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [bookingId, actorUserId || null, eventType, JSON.stringify(metadata)]
  );
}

router.get("/", requireAuth, requireRole("admin"), async (req, res, next) => {
  const status = String(req.query.status || "pending");

  try {
    const q = await pool.query(
      `
      SELECT
        b.public_id,
        b.status,
        b.starts_at,
        b.ends_at,
        b.address,
        b.created_at,
        b.accepted_at,
        b.completed_at,
        b.cancelled_at,
        b.notes,
        s.title AS service_title,
        b.assigned_worker_user_id,

        cu.public_id AS customer_public_id,
        cu.first_name AS customer_first_name,
        cu.last_name AS customer_last_name,
        cu.phone AS customer_phone,
        cu.email AS customer_email,
        cu.address AS customer_address,
        cu.account_type AS customer_account_type
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      JOIN users cu ON cu.id = b.customer_user_id
      WHERE b.status = $1
      ORDER BY b.created_at DESC
      LIMIT 200
      `,
      [status]
    );

    res.json({ ok: true, bookings: q.rows });
  } catch (e) {
    next(e);
  }
});

router.patch("/:publicId/cancel", requireAuth, requireRole("admin"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const lock = await client.query(
      `SELECT id, status FROM bookings WHERE public_id = $1 FOR UPDATE`,
      [req.params.publicId]
    );

    if (lock.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, message: "Booking not found" });
    }

    const b = lock.rows[0];

    // already done?
    if (b.status === "completed") {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Completed bookings cannot be cancelled" });
    }
    if (b.status === "cancelled") {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Booking is already cancelled" });
    }

    const updated = await client.query(
      `
      UPDATE bookings
      SET status = 'cancelled',
          cancelled_at = now(),
          updated_at = now()
      WHERE id = $1
      RETURNING public_id, status, cancelled_at
      `,
      [b.id]
    );

    await addEvent(client, b.id, req.user.id, "cancelled_by_admin", {});
    await client.query("COMMIT");

    return res.json({ ok: true, booking: updated.rows[0] });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    next(e);
  } finally {
    client.release();
  }
});

router.patch("/:publicId/accept", requireAuth, requireRole("admin"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const bookingPublicId = req.params.publicId;
    const adminId = req.user.id;

    await client.query("BEGIN");

    const b = await client.query(
      `SELECT id, status FROM bookings WHERE public_id = $1 FOR UPDATE`,
      [bookingPublicId]
    );
    if (b.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, message: "Booking not found" });
    }

    const booking = b.rows[0];

    if (booking.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Booking is not pending" });
    }

    const updated = await client.query(
      `
      UPDATE bookings
      SET status = 'accepted',
          accepted_at = now(),
          updated_at = now()
      WHERE id = $1
      RETURNING public_id, status, accepted_at
      `,
      [booking.id]
    );

    await addEvent(client, booking.id, adminId, "accepted", {});
    await client.query("COMMIT");

    res.json({ ok: true, booking: updated.rows[0] });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    next(e);
  } finally {
    client.release();
  }
});

const assignSchema = z.object({
  workerUserId: z.number().int().positive(),
});

router.patch("/:publicId/assign", requireAuth, requireRole("admin"), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const bookingPublicId = req.params.publicId;
    const adminId = req.user.id;
    const { workerUserId } = assignSchema.parse(req.body);

    await client.query("BEGIN");

    const b = await client.query(
      `SELECT id, status FROM bookings WHERE public_id = $1 FOR UPDATE`,
      [bookingPublicId]
    );

    if (b.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, message: "Booking not found" });
    }

    const booking = b.rows[0];

    if (booking.status !== "accepted" && booking.status !== "assigned") {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Booking must be accepted first" });
    }

    // Confirm worker has worker role (DB role value is 'worker', not 'technician')
    const w = await client.query(
      `SELECT 1 FROM user_roles WHERE role = 'worker' AND user_id = $1`,
      [workerUserId]
    );
    if (w.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "Invalid technician (workerUserId)" });
    }

    // If you're using booking_assignments (recommended), store assignment there
    await client.query(
      `
      INSERT INTO booking_assignments (booking_id, worker_user_id, assigned_by_user_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (booking_id, worker_user_id) DO NOTHING
      `,
      [booking.id, workerUserId, adminId]
    );

    const updated = await client.query(
      `
      UPDATE bookings
      SET status = 'assigned',
          updated_at = now()
      WHERE id = $1
      RETURNING public_id, status
      `,
      [booking.id]
    );

    await addEvent(client, booking.id, adminId, "assigned", { workerUserId });

    await client.query("COMMIT");
    res.json({ ok: true, booking: updated.rows[0] });
  } catch (e) {
    try { await client.query("ROLLBACK"); } catch {}
    next(e);
  } finally {
    client.release();
  }
});

router.get("/technicians", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const r = await pool.query(
      `
      SELECT
        u.id,
        u.public_id,
        u.first_name,
        u.last_name,
        u.phone,
        u.email
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id
      WHERE ur.role = 'worker'
      ORDER BY u.last_name ASC, u.first_name ASC
      LIMIT 200
      `
    );

    res.json({ ok: true, technicians: r.rows });
  } catch (e) {
    next(e);
  }
});

const completedQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(10).max(100).optional().default(30),
  year: z.coerce.number().int().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  day: z.coerce.number().int().min(1).max(31).optional(),
  q: z.string().trim().max(200).optional(),
});

function buildCompletedRange({ year, month, day }) {
  // returns { start, end } strings (YYYY-MM-DD) or nulls
  if (!year) return { start: null, end: null };

  // year only
  if (!month) {
    return { start: `${year}-01-01`, end: `${year + 1}-01-01` };
    }

  // year + month
  if (!day) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
    return { start, end };
  }

  // year + month + day
  const start = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  // end = next day
  const d = new Date(`${start}T00:00:00.000Z`);
  const next = new Date(d.getTime() + 24 * 60 * 60 * 1000);
  const end = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
  return { start, end };
}

/**
 * GET /admin/bookings/completed
 * Query params:
 *  - page (default 1)
 *  - pageSize (default 30, max 100)
 *  - year, month, day (optional)
 *  - q (search string optional)
 */
router.get("/completed", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const { page, pageSize, year, month, day, q } = completedQuerySchema.parse(req.query);
    const offset = (page - 1) * pageSize;

    const { start, end } = buildCompletedRange({ year, month, day });

    const where = [];
    const params = [];
    let p = 1;

    where.push(`b.status = 'completed'`);

    if (start && end) {
      where.push(`b.completed_at >= $${p++}::timestamptz AND b.completed_at < $${p++}::timestamptz`);
      params.push(start, end);
    }

    if (q && q.length > 0) {
      // search across common fields
      where.push(`
        (
          b.public_id::text ILIKE $${p}
          OR b.address ILIKE $${p}
          OR COALESCE(b.notes,'') ILIKE $${p}
          OR s.title ILIKE $${p}
          OR cu.first_name ILIKE $${p}
          OR cu.last_name ILIKE $${p}
          OR (cu.first_name || ' ' || cu.last_name) ILIKE $${p}
          OR cu.email ILIKE $${p}
          OR COALESCE(cu.phone,'') ILIKE $${p}
          OR COALESCE(cu.address,'') ILIKE $${p}
        )
      `);
      params.push(`%${q}%`);
      p++;
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // total count
    const countRes = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      JOIN users cu ON cu.id = b.customer_user_id
      ${whereSql}
      `,
      params
    );

    const total = countRes.rows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    // page rows
    const dataParams = [...params, pageSize, offset];

    const dataRes = await pool.query(
      `
      SELECT
        b.public_id,
        b.status,
        b.starts_at,
        b.ends_at,
        b.address,
        b.notes,
        b.created_at,
        b.accepted_at,
        b.completed_at,
        b.cancelled_at,
        s.title AS service_title,
        b.assigned_worker_user_id,

        cu.public_id AS customer_public_id,
        cu.first_name AS customer_first_name,
        cu.last_name AS customer_last_name,
        cu.phone AS customer_phone,
        cu.email AS customer_email,
        cu.address AS customer_address,
        cu.account_type AS customer_account_type
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      JOIN users cu ON cu.id = b.customer_user_id
      ${whereSql}
      ORDER BY b.completed_at DESC NULLS LAST
      LIMIT $${p++}
      OFFSET $${p++}
      `,
      dataParams
    );

    res.json({
      ok: true,
      bookings: dataRes.rows,
      page,
      pageSize,
      total,
      totalPages,
      filter: { year: year ?? null, month: month ?? null, day: day ?? null },
      q: q ?? "",
    });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /admin/bookings/completed/filters
 * Returns only values that exist in DB.
 * Query params: year?, month?
 * - if no year: returns available years
 * - if year only: returns available months in that year
 * - if year+month: returns available days in that month
 */
router.get("/completed/filters", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const year = req.query.year ? Number(req.query.year) : null;
    const month = req.query.month ? Number(req.query.month) : null;

    // years
    if (!year) {
      const r = await pool.query(
        `
        SELECT DISTINCT EXTRACT(YEAR FROM completed_at)::int AS year
        FROM bookings
        WHERE status = 'completed' AND completed_at IS NOT NULL
        ORDER BY year DESC
        `
      );
      return res.json({ ok: true, years: r.rows.map((x) => x.year) });
    }

    // months in year
    if (year && !month) {
      const r = await pool.query(
        `
        SELECT DISTINCT EXTRACT(MONTH FROM completed_at)::int AS month
        FROM bookings
        WHERE status = 'completed'
          AND completed_at >= $1::timestamptz
          AND completed_at <  $2::timestamptz
        ORDER BY month ASC
        `,
        [`${year}-01-01`, `${year + 1}-01-01`]
      );
      return res.json({ ok: true, months: r.rows.map((x) => x.month) });
    }

    // days in month
    if (year && month) {
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

      const r = await pool.query(
        `
        SELECT DISTINCT EXTRACT(DAY FROM completed_at)::int AS day
        FROM bookings
        WHERE status = 'completed'
          AND completed_at >= $1::timestamptz
          AND completed_at <  $2::timestamptz
        ORDER BY day ASC
        `,
        [start, end]
      );
      return res.json({ ok: true, days: r.rows.map((x) => x.day) });
    }

    res.json({ ok: true, years: [], months: [], days: [] });
  } catch (e) {
    next(e);
  }
});

module.exports = router;