// frontend/src/lib/api/adminRevenueMetrics.ts
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

/* ---------------------------
   Types
---------------------------- */

export type RevenueRange = {
  start: string; // YYYY-MM-DD
  end_exclusive: string; // YYYY-MM-DD
  tzOffsetMinutes: number;
};

export type RevenueSeriesDailyRow = {
  day: string; // YYYY-MM-DD
  completed_count: number;
  revenue_cents: number; // bigint in pg -> will arrive as number if small; could be string if huge
};

export type RevenueSeriesWeeklyRow = {
  week_start: string; // YYYY-MM-DD
  completed_count: number;
  revenue_cents: number;
};

export type RevenueSeriesMonthlyRow = {
  month_start: string; // YYYY-MM-DD
  completed_count: number;
  revenue_cents: number;
};

export type RevenueTotals = {
  completed_count: number;
  revenue_cents: number;
};

export type AdminRevenueMetricsResponse = {
  ok: boolean;
  range: RevenueRange;
  totals: RevenueTotals;
  daily: RevenueSeriesDailyRow[];
  weekly: RevenueSeriesWeeklyRow[];
  monthly: RevenueSeriesMonthlyRow[];
};

export type RevenueMetricsQuery = {
  start?: string; // YYYY-MM-DD
  end?: string; // YYYY-MM-DD (end_exclusive)
  tzOffsetMinutes?: number;
};

function buildQuery(params: RevenueMetricsQuery) {
  const qs = new URLSearchParams();

  if (params.start) qs.set("start", params.start);
  if (params.end) qs.set("end", params.end);

  // your backend expects tzOffsetMinutes (example showed 480)
  if (typeof params.tzOffsetMinutes === "number" && Number.isFinite(params.tzOffsetMinutes)) {
    qs.set("tzOffsetMinutes", String(params.tzOffsetMinutes));
  }

  const s = qs.toString();
  return s ? `?${s}` : "";
}

/* ---------------------------
   API function
---------------------------- */

export function getAdminRevenueMetrics(params: RevenueMetricsQuery = {}) {
  const query = buildQuery(params);
  return jsonFetch<AdminRevenueMetricsResponse>(`/admin/revenue-metrics${query}`, { method: "GET" });
}