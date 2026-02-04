import type { LoginValues, SignupValues } from "../validators/auth";

type ApiErrorShape = { message?: string; error?: string; ok?: boolean };

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE;

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;

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

export type MeResponse = {
  ok: boolean;
  user?: {
    id: string;
    email: string;
    full_name?: string | null; // or fullName if camelCase
    email_verified_at: string | null;
    created_at: string;
  };
  session?: { expiresAt: string };
};

export function signup(payload: SignupValues) {
  return jsonFetch<{ ok: boolean }>("/auth/signup", {
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
  return jsonFetch<{ ok: boolean }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout() {
  return jsonFetch<{ ok: boolean }>("/auth/logout", { method: "POST" });
}

export function me() {
  return jsonFetch<MeResponse>("/auth/me", { method: "GET" });
}