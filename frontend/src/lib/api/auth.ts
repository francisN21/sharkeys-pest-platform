import type { LoginValues, SignupValues } from "../validators/auth";

type ApiErrorShape = { message?: string; error?: string; ok?: boolean };

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE;

function resolveUrl(path: string) {
  if (!API_BASE && !path.startsWith("http")) {
    // Makes local dev errors obvious
    throw new Error(
      "Missing NEXT_PUBLIC_AUTH_API_BASE. Set it in .env.local (e.g. http://localhost:4000)."
    );
  }
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = resolveUrl(path);

  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  const data = (await res.json().catch(() => ({}))) as T & ApiErrorShape;

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

/**
 * Backend response shape for /auth/me
 * NOTE:
 * - Prefer public_id for display/URLs later (UUID)
 * - Keep id present if backend still returns it
 */
export type MeResponse = {
  ok: boolean;
  user?: {
    id?: string; // internal bigint (avoid using in UI later)
    public_id?: string; // UUID (best to use externally)
    email: string;

    first_name?: string | null;
    last_name?: string | null;

    phone?: string | null;
    account_type?: "residential" | "business" | string | null;
    address?: string | null;

    email_verified_at: string | null;
    created_at: string;
  };
  session?: { expiresAt: string };
};

export type AuthOkResponse = { ok: boolean; message?: string };

export function signup(payload: SignupValues) {
  return jsonFetch<AuthOkResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      // ✅ new schema
      firstName: payload.firstName,
      lastName: payload.lastName,

      email: payload.email,
      phone: payload.phone,
      password: payload.password,

      // optional fields
      accountType: payload.accountType,
      address: payload.address,
    }),
  });
}

export function login(payload: LoginValues) {
  return jsonFetch<AuthOkResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout() {
  return jsonFetch<AuthOkResponse>("/auth/logout", { method: "POST" });
}

export function me() {
  return jsonFetch<MeResponse>("/auth/me", { method: "GET" });
}