const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

/**
 * Helper: accept BOTH admin + superuser for this router.
 * (We do this without depending on requireRole implementation.)
 */
function requireAnyRole(roles) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) return res.status(401).json({ ok: false, message: "Not authenticated" });

      const r = await pool.query(`SELECT role FROM user_roles WHERE user_id = $1`, [req.user.id]);
      const userRoles = r.rows.map((x) => String(x.role).trim().toLowerCase());

      const ok = roles.some((role) => userRoles.includes(String(role).trim().toLowerCase()));
      if (!ok) return res.status(403).json({ ok: false, message: "Forbidden" });

      next();
    } catch (e) {
      next(e);
    }
  };
}

async function addEvent(client, bookingId, actorUserId, eventType, metadata = {}) {
  await client.query(
    `INSERT INTO booking_events (booking_id, actor_user_id, event_type, metadata)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [bookingId, actorUserId || null, eventType, JSON.stringify(metadata)]
  );
}

/**
 * ---------------------------------------------------------------------------
 * NEW: POST /admin/bookings
 * Creates a booking on behalf of:
 *  - existing registered customer (customerPublicId)
 *  - OR unregistered lead (lead object)
 * ---------------------------------------------------------------------------
 */
const adminCreateBookingSchema = z
  .object({
    servicePublicId: z.string().uuid(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    notes: z.string().max(2000).optional(),

    // existing customer path
    customerPublicId: z.string().uuid().optional(),

    // new lead path
    lead: z
      .object({
        email: z.string().email(),
        first_name: z.string().trim().min(1).optional(),
        last_name: z.string().trim().min(1).optional(),
        phone: z.string().trim().min(5).optional(),
        account_type: z.enum(["residential", "business"]).optional(),
        address: z.string().min(5),
      })
      .optional(),

    // optional address override (mostly useful for existing customer)
    address: z.string().min(5).optional(),
  })
  .refine((x) => (x.customerPublicId ? !x.lead : !!x.lead), {
    message: "Provide either customerPublicId OR lead",
  });

router.post("/", requireAuth, requireAnyRole(["admin", "superuser"]), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const actorUserId = req.user.id;
    const payload = adminCreateBookingSchema.parse(req.body);

    await client.query("BEGIN");

    // Validate service
    const s = await client.query(
      `SELECT id FROM services WHERE public_id = $1 AND is_active = true`,
      [payload.servicePublicId]
    );
    if (s.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "Invalid service" });
    }
    const serviceId = s.rows[0].id;

    let customerUserId = null;
    let leadId = null;
    let finalAddress = null;

    if (payload.customerPublicId) {
      // Existing registered customer
      const u = await client.query(
        `SELECT id, address FROM users WHERE public_id = $1`,
        [payload.customerPublicId]
      );
      if (u.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ ok: false, message: "Customer not found" });
      }

      customerUserId = u.rows[0].id;
      const customerAddress = (u.rows[0].address || "").trim();
      finalAddress = (payload.address || "").trim() || customerAddress;

      if (!finalAddress || finalAddress.length < 5) {
        await client.query("ROLLBACK");
        return res.status(400).json({ ok: false, message: "Address is required (customer has none saved)" });
      }
    } else {
      // Lead (unregistered)
      const lead = payload.lead;

      const up = await client.query(
        `
        INSERT INTO leads (email, first_name, last_name, phone, account_type, address)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO UPDATE SET
          first_name = COALESCE(EXCLUDED.first_name, leads.first_name),
          last_name  = COALESCE(EXCLUDED.last_name, leads.last_name),
          phone      = COALESCE(EXCLUDED.phone, leads.phone),
          account_type = COALESCE(EXCLUDED.account_type, leads.account_type),
          address    = COALESCE(EXCLUDED.address, leads.address),
          updated_at = now()
        RETURNING id, address
        `,
        [
          lead.email,
          lead.first_name || null,
          lead.last_name || null,
          lead.phone || null,
          lead.account_type || null,
          lead.address,
        ]
      );

      leadId = up.rows[0].id;
      finalAddress = (payload.address || "").trim() || (up.rows[0].address || "").trim();

      if (!finalAddress || finalAddress.length < 5) {
        await client.query("ROLLBACK");
        return res.status(400).json({ ok: false, message: "Address is required for new customers" });
      }
    }

    const created = await client.query(
      `
      INSERT INTO bookings (customer_user_id, lead_id, service_id, starts_at, ends_at, address, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, public_id, status, starts_at, ends_at, address, notes, created_at
      `,
      [customerUserId, leadId, serviceId, payload.startsAt, payload.endsAt, finalAddress, payload.notes || null]
    );

    const booking = created.rows[0];

    await addEvent(client, booking.id, actorUserId, "created_by_admin", {
      customerPublicId: payload.customerPublicId || null,
      leadEmail: payload.lead?.email || null,
    });

    await client.query("COMMIT");

    return res.status(201).json({
      ok: true,
      booking: {
        public_id: booking.public_id,
        status: booking.status,
        starts_at: booking.starts_at,
        ends_at: booking.ends_at,
        address: booking.address,
        notes: booking.notes ?? null,
        created_at: booking.created_at,
      },
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    // DB-level double-booking protection
    if (e && e.code === "23P01") {
      return res.status(409).json({ ok: false, message: "Time slot unavailable" });
    }

    next(e);
  } finally {
    client.release();
  }
});

/**
 * ---------------------------------------------------------------------------
 * Existing routes (updated auth + updated joins to support lead-backed bookings)
 * ---------------------------------------------------------------------------
 */

/**
 * GET /admin/bookings?status=pending
 * NOTE: now supports lead bookings by LEFT JOIN users/leads and COALESCE fields.
 */
router.get("/", requireAuth, requireAnyRole(["admin", "superuser"]), async (req, res, next) => {
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

        -- If booking is for a registered customer, cu.* will exist
        cu.public_id AS customer_public_id,
        cu.first_name AS customer_first_name,
        cu.last_name AS customer_last_name,
        cu.phone AS customer_phone,
        cu.email AS customer_email,
        cu.address AS customer_address,
        cu.account_type AS customer_account_type,

        -- If booking is for a lead, l.* will exist
        l.public_id AS lead_public_id,
        l.first_name AS lead_first_name,
        l.last_name AS lead_last_name,
        l.phone AS lead_phone,
        l.email AS lead_email,
        l.address AS lead_address,
        l.account_type AS lead_account_type,

        -- Unified fields for UI convenience
        COALESCE(cu.first_name, l.first_name) AS bookee_first_name,
        COALESCE(cu.last_name,  l.last_name)  AS bookee_last_name,
        COALESCE(cu.email,      l.email)      AS bookee_email,
        COALESCE(cu.phone,      l.phone)      AS bookee_phone,
        COALESCE(cu.account_type, l.account_type) AS bookee_account_type

      FROM bookings b
      JOIN services s ON s.id = b.service_id
      LEFT JOIN users cu ON cu.id = b.customer_user_id
      LEFT JOIN leads l ON l.id = b.lead_id
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

router.patch("/:publicId/cancel", requireAuth, requireAnyRole(["admin", "superuser"]), async (req, res, next) => {
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
    try {
      await client.query("ROLLBACK");
    } catch {}
    next(e);
  } finally {
    client.release();
  }
});

router.patch("/:publicId/accept", requireAuth, requireAnyRole(["admin", "superuser"]), async (req, res, next) => {
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
    try {
      await client.query("ROLLBACK");
    } catch {}
    next(e);
  } finally {
    client.release();
  }
});

const assignSchema = z.object({
  workerUserId: z.number().int().positive(),
});

router.patch("/:publicId/assign", requireAuth, requireAnyRole(["admin", "superuser"]), async (req, res, next) => {
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

    // Confirm worker has worker role
    const w = await client.query(
      `SELECT 1 FROM user_roles WHERE role = 'worker' AND user_id = $1`,
      [workerUserId]
    );
    if (w.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "Invalid technician (workerUserId)" });
    }

    await client.query(
      `
      INSERT INTO booking_assignments (booking_id, worker_user_id, assigned_by_user_id, assigned_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT ON CONSTRAINT booking_assignments_booking_id_key
      DO UPDATE SET
        worker_user_id = EXCLUDED.worker_user_id,
        assigned_by_user_id = EXCLUDED.assigned_by_user_id,
        assigned_at = EXCLUDED.assigned_at
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
    try {
      await client.query("ROLLBACK");
    } catch {}
    next(e);
  } finally {
    client.release();
  }
});

router.get("/technicians", requireAuth, requireAnyRole(["admin", "superuser"]), async (req, res, next) => {
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
  if (!year) return { start: null, end: null };

  if (!month) return { start: `${year}-01-01`, end: `${year + 1}-01-01` };

  if (!day) {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
    return { start, end };
  }

  const start = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const d = new Date(`${start}T00:00:00.000Z`);
  const next = new Date(d.getTime() + 24 * 60 * 60 * 1000);
  const end = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(
    next.getUTCDate()
  ).padStart(2, "0")}`;
  return { start, end };
}

/**
 * GET /admin/bookings/completed
 * Updated joins to support lead bookings + unified fields.
 */
router.get("/completed", requireAuth, requireAnyRole(["admin", "superuser"]), async (req, res, next) => {
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
      where.push(`
        (
          b.public_id::text ILIKE $${p}
          OR b.address ILIKE $${p}
          OR COALESCE(b.notes,'') ILIKE $${p}
          OR s.title ILIKE $${p}

          OR COALESCE(cu.first_name, l.first_name, '') ILIKE $${p}
          OR COALESCE(cu.last_name,  l.last_name,  '') ILIKE $${p}
          OR (COALESCE(cu.first_name, l.first_name, '') || ' ' || COALESCE(cu.last_name, l.last_name, '')) ILIKE $${p}
          OR COALESCE(cu.email, l.email, '') ILIKE $${p}
          OR COALESCE(cu.phone, l.phone, '') ILIKE $${p}
          OR COALESCE(cu.address, l.address, '') ILIKE $${p}

          OR COALESCE(wu.first_name,'') ILIKE $${p}
          OR COALESCE(wu.last_name,'') ILIKE $${p}
          OR (COALESCE(wu.first_name,'') || ' ' || COALESCE(wu.last_name,'')) ILIKE $${p}
          OR COALESCE(wu.email,'') ILIKE $${p}
          OR COALESCE(wu.phone,'') ILIKE $${p}
        )
      `);
      params.push(`%${q}%`);
      p++;
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countRes = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM bookings b
      JOIN services s ON s.id = b.service_id
      LEFT JOIN users cu ON cu.id = b.customer_user_id
      LEFT JOIN leads l ON l.id = b.lead_id

      LEFT JOIN LATERAL (
        SELECT be.actor_user_id, be.created_at AS completed_event_at
        FROM booking_events be
        WHERE be.booking_id = b.id
          AND be.event_type IN ('completed','completed_by_worker')
        ORDER BY be.created_at DESC
        LIMIT 1
      ) ce ON true

      LEFT JOIN users wu ON wu.id = ce.actor_user_id

      ${whereSql}
      `,
      params
    );

    const total = countRes.rows[0]?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
        cu.account_type AS customer_account_type,

        l.public_id AS lead_public_id,
        l.first_name AS lead_first_name,
        l.last_name AS lead_last_name,
        l.phone AS lead_phone,
        l.email AS lead_email,
        l.address AS lead_address,
        l.account_type AS lead_account_type,

        COALESCE(cu.first_name, l.first_name) AS bookee_first_name,
        COALESCE(cu.last_name,  l.last_name)  AS bookee_last_name,
        COALESCE(cu.email,      l.email)      AS bookee_email,
        COALESCE(cu.phone,      l.phone)      AS bookee_phone,
        COALESCE(cu.account_type, l.account_type) AS bookee_account_type,

        ce.completed_event_at,
        wu.id AS completed_by_user_id,
        wu.public_id AS completed_by_public_id,
        wu.first_name AS completed_by_first_name,
        wu.last_name AS completed_by_last_name,
        wu.phone AS completed_by_phone,
        wu.email AS completed_by_email

      FROM bookings b
      JOIN services s ON s.id = b.service_id
      LEFT JOIN users cu ON cu.id = b.customer_user_id
      LEFT JOIN leads l ON l.id = b.lead_id

      LEFT JOIN LATERAL (
        SELECT be.actor_user_id, be.created_at AS completed_event_at
        FROM booking_events be
        WHERE be.booking_id = b.id
          AND be.event_type IN ('completed','completed_by_worker')
        ORDER BY be.created_at DESC
        LIMIT 1
      ) ce ON true

      LEFT JOIN users wu ON wu.id = ce.actor_user_id

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
 * Works as-is (completed_at exists regardless of lead/user).
 */
router.get("/completed/filters", requireAuth, requireAnyRole(["admin", "superuser"]), async (req, res, next) => {
  try {
    const year = req.query.year ? Number(req.query.year) : null;
    const month = req.query.month ? Number(req.query.month) : null;

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