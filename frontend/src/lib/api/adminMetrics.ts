// lib/api/adminMetrics.ts
type ApiErrorShape = { message?: string; error?: string; ok?: boolean };

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE;

function resolveUrl(path: string) {
  if (!API_BASE && !path.startsWith("http")) {
    throw new Error("Missing NEXT_PUBLIC_AUTH_API_BASE. Set it in .env.local (e.g. http://localhost:4000).");
  }
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
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
    throw new Error(msg);
  }

  return data as T;
}

export type TrafficTotals = {
  requests_all_time: number;
  requests_1d: number;
  requests_7d: number;
  requests_30d: number;
  uniques_1d: number;
  uniques_7d: number;
  uniques_30d: number;
};

export type TrafficDailyRow = {
  day: string; // YYYY-MM-DD
  requests: number;
  uniques: number;
};

export type TrafficMetricsResponse = {
  ok: boolean;
  totals: TrafficTotals;
  daily: TrafficDailyRow[];
};

export function getTrafficMetrics(days = 30) {
  return jsonFetch<TrafficMetricsResponse>(`/admin/metrics/traffic?days=${encodeURIComponent(days)}`, {
    method: "GET",
  });
}