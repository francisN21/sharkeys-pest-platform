import type { LoginValues, SignupValues } from "../validators/auth";

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    credentials: "include", // IMPORTANT: cookie session
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

export function signup(payload: SignupValues) {
  // adapt to your backend expected keys if needed
  return jsonFetch("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
      // optional fields for later:
      accountType: payload.accountType,
      address: payload.address,
    }),
  });
}

export function login(payload: LoginValues) {
  return jsonFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout() {
  return jsonFetch("/api/auth/logout", { method: "POST" });
}

export function me() {
  return jsonFetch("/api/auth/me", { method: "GET" });
}
