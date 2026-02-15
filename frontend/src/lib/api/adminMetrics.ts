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

export type BookingsTotals = {
  bookings_in_range: number;
  completed_in_range: number;
  cancelled_in_range: number;

  pending_in_range: number;
  accepted_in_range: number;
  assigned_in_range: number;

  bookings_all_time: number;
  completed_all_time: number;
  cancelled_all_time: number;

  completion_rate_percent: number;
};

export type BookingsMonthlyRow = {
  month_start: string; // YYYY-MM-01
  created_count: number;
  completed_count: number;
  cancelled_count: number;
};

export type CustomersAllTime = {
  customers_all_time: number;
  residential_all_time: number;
  business_all_time: number;
  unknown_all_time: number;
  residential_percent: number;
  business_percent: number;
};

export type CustomersInRange = {
  new_customers_in_range: number;
  new_residential_in_range: number;
  new_business_in_range: number;
  new_unknown_in_range: number;
};

export type CustomersMetricsResponse = {
  ok: boolean;
  range: { start: string; end_exclusive: string; days: number };
  all_time: CustomersAllTime;
  in_range: CustomersInRange;
};

export type SurveyCountRow = {
  code: string;   // linkedin | google | instagram | facebook | referred | other
  label: string;  // display label
  count: number;
};

export type SurveyTopOtherRow = {
  val: string;   // normalized "other" text
  count: number;
};

export type SurveyMetricsResponse = {
  ok: boolean;
  range: { start: string; end_exclusive: string; days: number };
  total_responses: number;
  counts: SurveyCountRow[];
  top_other: SurveyTopOtherRow[];
};

export function getTrafficMetrics(days = 30) {
  return jsonFetch<TrafficMetricsResponse>(`/admin/metrics/traffic?days=${encodeURIComponent(days)}`, {
    method: "GET",
  });
}

export type BookingsMetricsResponse = {
  ok: boolean;
  range: { start: string; end_exclusive: string; days: number };
  totals: BookingsTotals;
  monthly: BookingsMonthlyRow[];
};

export function getBookingsMetrics(range?: { start?: string; end?: string }) {
  const params = new URLSearchParams();
  if (range?.start) params.set("start", range.start);
  if (range?.end) params.set("end", range.end);

  const qs = params.toString();
  const path = qs ? `/admin/metrics/bookings?${qs}` : `/admin/metrics/bookings`;

  return jsonFetch<BookingsMetricsResponse>(path, { method: "GET" });
}

export function getCustomersMetrics(range?: { start?: string; end?: string }) {
  const params = new URLSearchParams();
  if (range?.start) params.set("start", range.start);
  if (range?.end) params.set("end", range.end);

  const qs = params.toString();
  const path = qs ? `/admin/metrics/customers?${qs}` : `/admin/metrics/customers`;

  return jsonFetch<CustomersMetricsResponse>(path, { method: "GET" });
}

export function getSurveyMetrics(range?: { start?: string; end?: string }) {
  const params = new URLSearchParams();
  if (range?.start) params.set("start", range.start);
  if (range?.end) params.set("end", range.end);

  const qs = params.toString();
  const path = qs ? `/admin/metrics/survey?${qs}` : `/admin/metrics/survey`;

  return jsonFetch<SurveyMetricsResponse>(path, { method: "GET" });
}

export function downloadCompletedBookingsCsv(range?: { start?: string; end?: string }) {
  const params = new URLSearchParams();
  if (range?.start) params.set("start", range.start);
  if (range?.end) params.set("end", range.end);

  const qs = params.toString();
  const path = qs ? `/admin/metrics/bookings/export?${qs}` : `/admin/metrics/bookings/export`;

  // IMPORTANT: this is a file download, not jsonFetch
  return fetch(resolveUrl(path), {
    method: "GET",
    credentials: "include",
  });
}