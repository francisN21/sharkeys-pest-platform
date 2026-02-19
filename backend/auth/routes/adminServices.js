const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");
const { requireRole } = require("../middleware/requireRole");

const router = express.Router();

// --- Validators ---
const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(2000),
  duration_minutes: z
    .number()
    .int()
    .positive()
    .max(24 * 60)
    .nullable()
    .optional(),
});

const updateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().min(1).max(2000).optional(),
  duration_minutes: z
    .number()
    .int()
    .positive()
    .max(24 * 60)
    .nullable()
    .optional(),
}).refine((v) => Object.keys(v).length > 0, {
  message: "No fields provided to update",
});

// OWNER: list services (active only for now; you can change later)
router.get("/", requireAuth, requireRole("superuser"), async (req, res, next) => {
  try {
    const r = await pool.query(
      `SELECT public_id, title, description, sort_order, base_price_cents, duration_minutes
       FROM services
       WHERE is_active = true
       ORDER BY sort_order ASC, title ASC`
    );
    res.json({ ok: true, services: r.rows });
  } catch (e) {
    next(e);
  }
});

// OWNER: create service (active by default)
router.post("/", requireAuth, requireRole("superuser"), async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, message: parsed.error.issues?.[0]?.message || "Invalid input" });
    }

    const { title, description, duration_minutes = null } = parsed.data;

    // NOTE: assumes DB generates public_id (uuid/shortid). If not, add one in DB or generate here.
    // Also assumes defaults for is_active/sort_order/base_price_cents exist.
    const r = await pool.query(
      `INSERT INTO services (title, description, duration_minutes, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING public_id, title, description, sort_order, base_price_cents, duration_minutes`,
      [title, description, duration_minutes]
    );

    res.status(201).json({ ok: true, service: r.rows[0] });
  } catch (e) {
    next(e);
  }
});

// OWNER: update service by public_id
router.patch("/:publicId", requireAuth, requireRole("superuser"), async (req, res, next) => {
  try {
    const publicId = String(req.params.publicId || "").trim();
    if (!publicId) return res.status(400).json({ ok: false, message: "Missing publicId" });

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, message: parsed.error.issues?.[0]?.message || "Invalid input" });
    }

    const { title, description, duration_minutes } = parsed.data;

    // Only update provided fields
    const fields = [];
    const values = [];
    let idx = 1;

    if (typeof title !== "undefined") {
      fields.push(`title = $${idx++}`);
      values.push(title);
    }
    if (typeof description !== "undefined") {
      fields.push(`description = $${idx++}`);
      values.push(description);
    }
    if (typeof duration_minutes !== "undefined") {
      fields.push(`duration_minutes = $${idx++}`);
      values.push(duration_minutes);
    }

    values.push(publicId);

    const r = await pool.query(
      `UPDATE services
       SET ${fields.join(", ")}
       WHERE public_id = $${idx}
       RETURNING public_id, title, description, sort_order, base_price_cents, duration_minutes`,
      values
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ ok: false, message: "Service not found" });
    }

    res.json({ ok: true, service: r.rows[0] });
  } catch (e) {
    next(e);
  }
});

router.delete("/:publicId", requireAuth, requireRole("superuser"), async (req, res, next) => {
  try {
    const publicId = String(req.params.publicId || "").trim();
    if (!publicId) return res.status(400).json({ ok: false, message: "Missing publicId" });

    const r = await pool.query(
      `UPDATE services
       SET is_active = false
       WHERE public_id = $1
       RETURNING public_id`,
      [publicId]
    );

    if (r.rowCount === 0) {
      return res.status(404).json({ ok: false, message: "Service not found" });
    }

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;