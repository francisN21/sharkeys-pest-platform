// frontend/src/lib/api/auth.ts
import type { LoginValues, SignupValues } from "../validators/auth";

type ApiErrorShape = { message?: string; error?: string; ok?: boolean };

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE;

function resolveUrl(path: string) {
  if (!API_BASE && !path.startsWith("http")) {
    throw new Error("Missing NEXT_PUBLIC_AUTH_API_BASE. Set it in .env.local (e.g. http://localhost:4000).");
  }
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

export class ApiError extends Error {
  status: number;
  payload?: unknown;
  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = resolveUrl(path);

  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.headers || {}), "Content-Type": "application/json" },
    credentials: "include",
  });

  const data = (await res.json().catch(() => ({}))) as T & ApiErrorShape;

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }

  return data as T;
}

export type MeUser = {
  id?: number; 
  public_id?: string; // UUID
  email: string;

  first_name?: string | null;
  last_name?: string | null;

  phone?: string | null;
  account_type?: "residential" | "business" | string | null;
  address?: string | null;

  email_verified_at: string | null;
  created_at?: string;

  roles?: string[];
  user_role?: "admin" | "worker" | "customer" | string;
};

export type MeResponse = {
  ok: boolean;
  user?: MeUser;
  session?: { expiresAt: string | null };
};

export type AuthOkResponse = { ok: boolean; message?: string };

export type UpdateMePayload = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  account_type?: "residential" | "business";
};

export function signup(payload: SignupValues) {
  return jsonFetch<AuthOkResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      first_name: payload.firstName,
      last_name: payload.lastName,
      email: payload.email,
      phone: payload.phone ?? null,
      password: payload.password,
      account_type: payload.accountType ?? null,
      address: payload.address ?? null,
    }),
  });
}

export function login(payload: LoginValues) {
  return jsonFetch<AuthOkResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateMe(payload: UpdateMePayload) {
  return jsonFetch<{ ok: boolean; user: MeUser }>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function logout() {
  return jsonFetch<AuthOkResponse>("/auth/logout", { method: "POST" });
}

export function me() {
  return jsonFetch<MeResponse>("/auth/me", { method: "GET" });
}

/**
 * ✅ Helper: reliably derive numeric meUserId
 * - supports "id" as number
 * - supports "id" as string (if backend serializes bigint as string)
 */
export function getMeUserId(res?: MeResponse | null): number | null {
  const raw = res?.user?.id as unknown;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() && /^\d+$/.test(raw.trim())) return Number(raw.trim());
  return null;
}