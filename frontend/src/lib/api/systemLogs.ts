// lib/api/systemLogs.ts
import { jsonFetch } from "./http";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionRow = {
  session_id: string;
  user_id: number;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  roles: string[];
};

export type EmployeeInviteToken = {
  id: number;
  user_id: number;
  invited_role: string;
  expires_at: string;
  created_at: string;
  consumed_at?: string | null;
  status?: string;
  user_email: string;
  first_name: string | null;
  last_name: string | null;
  invited_by_email: string;
};

export type LeadInviteToken = {
  id: number;
  lead_id: number;
  expires_at: string;
  created_at: string;
  consumed_at?: string | null;
  status?: string;
  lead_email: string;
  first_name: string | null;
  last_name: string | null;
  sent_by_email: string | null;
};

export type PasswordResetToken = {
  id: number;
  user_id: number;
  expires_at: string;
  created_at: string;
  consumed_at?: string | null;
  status?: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
};

export type SuspiciousLogEntry = {
  ts: string;
  event: string;
  path: string;
  method: string;
  ip: string;
  userAgent?: string;
  hits: Array<{
    field: string;
    pattern: string;
    sensitive: boolean;
    excerpt: string;
    fp?: string;
  }>;
  raw?: string;
};

export type BlockedIpEntry = {
  ip: string;
  blocked: boolean;
  blocked_until: string | null;
  total_count: number;
  window_count: number;
  last_seen: string | null;
};

export type LoginAttempt = {
  id: number;
  email: string;
  ip: string | null;
  user_agent: string | null;
  reason: "user_not_found" | "wrong_password";
  created_at: string;
};

export type AccessLogEvent = {
  id: number;
  occurred_at: string;
  path: string;
  method: string;
  status_code: number | null;
  ip: string | null;
  user_agent: string | null;
  referer: string | null;
  duration_ms: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
};

export type AuditLogEntry = {
  id: number;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor_email: string;
  actor_first: string | null;
  actor_last: string | null;
};

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function getSessions(): Promise<{ sessions: SessionRow[] }> {
  return jsonFetch("/admin/system/sessions");
}

export async function clearUserSessions(userId: number): Promise<{ cleared: number }> {
  return jsonFetch(`/admin/system/sessions/user/${userId}`, { method: "DELETE" });
}

// ─── Tokens (pending) ─────────────────────────────────────────────────────────

export async function getTokens(): Promise<{
  employee_invites: EmployeeInviteToken[];
  lead_invites: LeadInviteToken[];
  password_resets: PasswordResetToken[];
}> {
  return jsonFetch("/admin/system/tokens");
}

export async function revokeToken(
  type: "employee-invite" | "lead-invite" | "password-reset",
  id: number
): Promise<{ ok: boolean }> {
  return jsonFetch(`/admin/system/tokens/${type}/${id}`, { method: "DELETE" });
}

// ─── Token history ────────────────────────────────────────────────────────────

export async function getTokenHistory(): Promise<{
  employee_invites: EmployeeInviteToken[];
  lead_invites: LeadInviteToken[];
  password_resets: PasswordResetToken[];
}> {
  return jsonFetch("/admin/system/tokens/history");
}

// ─── Suspicious log ───────────────────────────────────────────────────────────

export async function getSuspiciousLog(limit = 100): Promise<{
  entries: SuspiciousLogEntry[];
  total_lines: number;
}> {
  return jsonFetch(`/admin/system/suspicious-log?limit=${limit}`);
}

// ─── Blocked IPs ──────────────────────────────────────────────────────────────

export async function getBlockedIps(): Promise<{ entries: BlockedIpEntry[] }> {
  return jsonFetch("/admin/system/blocked-ips");
}

export async function unblockIp(ip: string): Promise<{ ok: boolean }> {
  return jsonFetch(`/admin/system/blocked-ips/${encodeURIComponent(ip)}`, { method: "DELETE" });
}

// ─── Login attempts ───────────────────────────────────────────────────────────

export async function getLoginAttempts(filters?: {
  email?: string;
  ip?: string;
  limit?: number;
}): Promise<{ attempts: LoginAttempt[] }> {
  const params = new URLSearchParams();
  if (filters?.email) params.set("email", filters.email);
  if (filters?.ip) params.set("ip", filters.ip);
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return jsonFetch(`/admin/system/login-attempts${qs ? `?${qs}` : ""}`);
}

// ─── Access log ───────────────────────────────────────────────────────────────

export async function getAccessLog(filters?: {
  path?: string;
  email?: string;
  status?: number;
  start?: string;
  end?: string;
  limit?: number;
}): Promise<{ events: AccessLogEvent[] }> {
  const params = new URLSearchParams();
  if (filters?.path) params.set("path", filters.path);
  if (filters?.email) params.set("email", filters.email);
  if (filters?.status) params.set("status", String(filters.status));
  if (filters?.start) params.set("start", filters.start);
  if (filters?.end) params.set("end", filters.end);
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return jsonFetch(`/admin/system/access-log${qs ? `?${qs}` : ""}`);
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export async function getAuditLog(filters?: {
  action?: string;
  limit?: number;
}): Promise<{ entries: AuditLogEntry[] }> {
  const params = new URLSearchParams();
  if (filters?.action) params.set("action", filters.action);
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return jsonFetch(`/admin/system/audit-log${qs ? `?${qs}` : ""}`);
}
