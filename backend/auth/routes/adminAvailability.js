const express = require("express");
const { z } = require("zod");
const { pool } = require("../src/db");
const { requireAuth } = require("../middleware/requireAuth");

const router = express.Router();

function requireAnyRole(roles) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ ok: false, message: "Not authenticated" });
      }

      const r = await pool.query(`SELECT role FROM user_roles WHERE user_id = $1`, [req.user.id]);
      const userRoles = r.rows.map((x) => String(x.role).trim().toLowerCase());

      const ok = roles.some((role) => userRoles.includes(String(role).trim().toLowerCase()));
      if (!ok) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }

      next();
    } catch (e) {
      next(e);
    }
  };
}

const createAvailabilityBlockSchema = z.object({
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  blockType: z.enum(["manual", "closed", "holiday", "travel_buffer", "time_off"]).optional(),
  reason: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
});

function startOfLocalDayUtcIso(dateYmd, tzOffsetMinutes) {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const startUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0, 0) + tzOffsetMinutes * 60_000;
  return new Date(startUtcMs).toISOString();
}

function nextLocalDayUtcIso(dateYmd, tzOffsetMinutes) {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const startUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0, 0) + tzOffsetMinutes * 60_000;
  const endUtcMs = startUtcMs + 24 * 60 * 60_000;
  return new Date(endUtcMs).toISOString();
}

router.get(
  "/blocks",
  requireAuth,
  requireAnyRole(["admin", "superuser"]),
  async (req, res, next) => {
    try {
      const date = String(req.query.date || "").trim();
      const tzOffsetMinutes = Number(req.query.tzOffsetMinutes ?? new Date().getTimezoneOffset());

      let startIso = String(req.query.startsAt || "").trim();
      let endIso = String(req.query.endsAt || "").trim();

      if (date) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return res.status(400).json({ ok: false, message: "Invalid date (expected YYYY-MM-DD)" });
        }
        if (!Number.isFinite(tzOffsetMinutes)) {
          return res.status(400).json({ ok: false, message: "Invalid tzOffsetMinutes" });
        }

        startIso = startOfLocalDayUtcIso(date, tzOffsetMinutes);
        endIso = nextLocalDayUtcIso(date, tzOffsetMinutes);
      }

      if (!startIso || !endIso) {
        return res.status(400).json({
          ok: false,
          message: "Provide either date + tzOffsetMinutes or startsAt + endsAt",
        });
      }

      const r = await pool.query(
        `
        SELECT
          public_id,
          scope,
          starts_at,
          ends_at,
          block_type,
          reason,
          notes,
          created_at,
          updated_at
        FROM availability_blocks
        WHERE starts_at < $1::timestamptz
          AND ends_at > $2::timestamptz
        ORDER BY starts_at ASC, ends_at ASC
        `,
        [endIso, startIso]
      );

      return res.json({
        ok: true,
        blocks: r.rows,
      });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/blocks",
  requireAuth,
  requireAnyRole(["admin", "superuser"]),
  async (req, res, next) => {
    const client = await pool.connect();
    try {
      const payload = createAvailabilityBlockSchema.parse(req.body);

      const startsAt = new Date(payload.startsAt);
      const endsAt = new Date(payload.endsAt);

      if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
        return res.status(400).json({ ok: false, message: "Invalid startsAt or endsAt" });
      }

      if (endsAt <= startsAt) {
        return res.status(400).json({ ok: false, message: "End time must be after start time" });
      }

      await client.query("BEGIN");

      const inserted = await client.query(
        `
        INSERT INTO availability_blocks (
          scope,
          starts_at,
          ends_at,
          block_type,
          reason,
          notes,
          created_by_user_id
        )
        VALUES ('business', $1, $2, $3, $4, $5, $6)
        RETURNING
          public_id,
          scope,
          starts_at,
          ends_at,
          block_type,
          reason,
          notes,
          created_at,
          updated_at
        `,
        [
          payload.startsAt,
          payload.endsAt,
          payload.blockType || "manual",
          payload.reason || null,
          payload.notes || null,
          req.user.id,
        ]
      );

      await client.query("COMMIT");

      return res.status(201).json({
        ok: true,
        block: inserted.rows[0],
      });
    } catch (e) {
      try {
        await client.query("ROLLBACK");
      } catch {}
      next(e);
    } finally {
      client.release();
    }
  }
);

router.delete(
  "/blocks/:publicId",
  requireAuth,
  requireAnyRole(["admin", "superuser"]),
  async (req, res, next) => {
    try {
      const publicId = String(req.params.publicId || "").trim();
      if (!publicId) {
        return res.status(400).json({ ok: false, message: "Missing block public id" });
      }

      const del = await pool.query(
        `DELETE FROM availability_blocks WHERE public_id = $1`,
        [publicId]
      );

      if ((del.rowCount || 0) === 0) {
        return res.status(404).json({ ok: false, message: "Availability block not found" });
      }

      return res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;