// frontend/src/lib/api/adminRevenueMetrics.ts
import { jsonFetch } from "./http";

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