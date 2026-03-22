-- Migration: add login_attempts and admin_audit_log tables
-- Run once against your database.

CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGSERIAL PRIMARY KEY,
  email CITEXT NOT NULL,
  ip INET NULL,
  user_agent TEXT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON login_attempts (email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time
  ON login_attempts (ip, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at
  ON login_attempts (created_at DESC);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id BIGINT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NULL,
  target_id TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_actor
  ON admin_audit_log (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_time
  ON admin_audit_log (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action
  ON admin_audit_log (action, created_at DESC);
