// src/lib/api/http.ts
export type ApiErrorShape = {
  ok?: boolean;
  message?: string;
  error?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE;

function resolveUrl(path: string) {
  if (!API_BASE && !path.startsWith("http")) {
    throw new Error(
      "Missing NEXT_PUBLIC_AUTH_API_BASE. Set it in .env.local (e.g. http://localhost:4000)."
    );
  }
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

function isApiErrorShape(x: unknown): x is ApiErrorShape {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.message === "string" ||
    typeof o.error === "string" ||
    typeof o.ok === "boolean"
  );
}

export async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(resolveUrl(path), {
    ...init,
    headers: {
      ...(init?.headers || {}),
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  const raw: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      (isApiErrorShape(raw) && (raw.message || raw.error)) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return raw as T;
}