import type { LoginValues, SignupValues } from "../validators/auth";

type ApiErrorShape = { message?: string; error?: string; ok?: boolean };

type SignupResponse = {
  ok: true;
  user: {
    id: string;
    email: string;
    email_verified_at: string | null;
    created_at: string;
  };
  session?: { expiresAt: string };
};

type LoginResponse = SignupResponse;

type MeResponse = SignupResponse;

type LogoutResponse = { ok: true } | { ok: true; message?: string };

function getErrorMessage(data: unknown, status: number) {
  const d = data as ApiErrorShape | null;
  return d?.message || d?.error || `Request failed (${status})`;
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  // Some endpoints may return empty body
  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : {};

  if (!res.ok) {
    throw new Error(getErrorMessage(data, res.status));
  }

  return data as T;
}

/**
 * Signup:
 * Keep payload flexible—backend can ignore unknown fields.
 * (Later I'll expand DB schema to persist phone/address/type.)
 */
export function signup(payload: SignupValues) {
  return jsonFetch<SignupResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
      accountType: payload.accountType,
      address: payload.address,
    }),
  });
}

export function login(payload: LoginValues) {
  return jsonFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Your backend route is POST /auth/logout (so proxy is /api/auth/logout)
export function logout() {
  return jsonFetch<LogoutResponse>("/api/auth/logout", { method: "POST" });
}

export function me() {
  return jsonFetch<MeResponse>("/api/auth/me", { method: "GET" });
}