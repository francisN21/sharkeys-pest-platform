const crypto = require("crypto");
const { pool } = require("../db");

function hoursFromNow(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function makeSessionId() {
  // 32 bytes => 64 hex chars, plenty strong
  return crypto.randomBytes(32).toString("hex");
}

function parseCookieDomain() {
  const raw = process.env.COOKIE_DOMAIN || "";
  const cleaned = raw.trim().replace(/^["']+|["']+$/g, "").trim();
  return cleaned || undefined;
}

function getCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  const cookieDomain = parseCookieDomain();
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  };
}

async function createSession(userId) {
  const sessionId = makeSessionId();
  const ttlHours = Number(process.env.SESSION_TTL_HOURS || 24);
  const expiresAt = hoursFromNow(ttlHours);

  await pool.query(
    `INSERT INTO sessions (id, user_id, expires_at)
     VALUES ($1, $2, $3)`,
    [sessionId, userId, expiresAt]
  );

  return { sessionId, expiresAt };
}

async function deleteSession(sessionId) {
  await pool.query(`DELETE FROM sessions WHERE id = $1`, [sessionId]);
}

async function getSession(sessionId) {
  const r = await pool.query(
    `SELECT id, user_id, expires_at, last_seen_at
     FROM sessions
     WHERE id = $1`,
    [sessionId]
  );
  return r.rows[0] || null;
}

async function touchSession(sessionId) {
  // Sliding expiration: extend expires_at to now + TTL on each authenticated request
  const ttlHours = Number(process.env.SESSION_TTL_HOURS || 24);

  const r = await pool.query(
    `UPDATE sessions
       SET last_seen_at = now(),
           expires_at = now() + ($2 || ' hours')::interval
     WHERE id = $1
     RETURNING id, user_id, expires_at`,
    [sessionId, String(ttlHours)]
  );

  return r.rows[0] || null;
}

const CSRF_COOKIE_NAME = "csrf_token";

function generateCsrfToken() {
  return crypto.randomBytes(24).toString("hex");
}

function setCsrfCookie(res) {
  const isProd = process.env.NODE_ENV === "production";
  const cookieDomain = parseCookieDomain();
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript so the frontend can send it as a header
    secure: isProd,
    sameSite: "lax",
    path: "/",
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
  return token;
}

function clearCsrfCookie(res) {
  res.clearCookie(CSRF_COOKIE_NAME, { path: "/" });
}

module.exports = {
  getCookieOptions,
  createSession,
  deleteSession,
  getSession,
  touchSession,
  setCsrfCookie,
  clearCsrfCookie,
};