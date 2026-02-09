export type Service = {
  public_id: string;
  title: string;
  description: string;
  duration_minutes?: number | null;
  base_price_cents?: number | null;
};

export type ServicesResponse = { ok: boolean; services: Service[] };

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE;

function resolveUrl(path: string) {
  if (!API_BASE && !path.startsWith("http")) {
    throw new Error("Missing NEXT_PUBLIC_AUTH_API_BASE in .env.local");
  }
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(resolveUrl(path), {
    ...init,
    headers: {
      ...(init?.headers || {}),
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  const data = (await res.json().catch(() => ({}))) as unknown;

  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null && "message" in data
        ? String((data as { message?: unknown }).message || "")
        : `Request failed (${res.status})`;
    throw new Error(msg || `Request failed (${res.status})`);
  }

  return data as T;
}

export function getServices() {
  return jsonFetch<ServicesResponse>("/services", { method: "GET" });
}