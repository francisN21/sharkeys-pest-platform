// lib/api/systemLogs.ts
type ApiErrorShape = { message?: string; error?: string; ok?: boolean };

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE;

function resolveUrl(path: string) {
  if (!API_BASE && !path.startsWith("http")) {
    throw new Error("Missing NEXT_PUBLIC_AUTH_API_BASE.");
  }
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(resolveUrl(path), {
    ...init,
    headers: { ...(init?.headers ?? {}), "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = (await res.json().catch(() => ({}))) as T & ApiErrorShape;
  if (!res.ok) {
    throw new Error(data?.message ?? data?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

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

// ─── API functions ────────────────────────────────────────────────────────────

export async function getSessions(): Promise<{ sessions: SessionRow[] }> {
  return jsonFetch("/admin/system/sessions");
}

export async function clearUserSessions(userId: number): Promise<{ cleared: number }> {
  return jsonFetch(`/admin/system/sessions/user/${userId}`, { method: "DELETE" });
}

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

export async function getSuspiciousLog(limit = 100): Promise<{
  entries: SuspiciousLogEntry[];
  total_lines: number;
}> {
  return jsonFetch(`/admin/system/suspicious-log?limit=${limit}`);
}
