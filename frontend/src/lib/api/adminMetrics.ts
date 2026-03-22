// lib/api/adminMetrics.ts
type ApiErrorShape = { message?: string; error?: string; ok?: boolean };

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE;

function resolveUrl(path: string) {
  if (!API_BASE && !path.startsWith("http")) {
    throw new Error("Missing NEXT_PUBLIC_AUTH_API_BASE. Set it in .env.local (e.g. http://localhost:4000).");
  }
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

export class ApiError extends Error {
  status: number;
  payload?: unknown;
  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
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
    throw new ApiError(msg, res.status, data);
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

  all_time: {
    customers_all_time: number;
    residential_all_time: number;
    business_all_time: number;
    unknown_all_time: number;

    residential_percent: number;
    business_percent: number;

    lead_conversions_all_time: number;
  };

  in_range: {
    new_customers_in_range: number;
    new_residential_in_range: number;
    new_business_in_range: number;
    new_unknown_in_range: number;

    lead_conversions_in_range: number;
    lead_conversion_rate_percent: number;
  };
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

export type SurveyReferralRow = {
  customer_first_name: string;
  customer_last_name: string;
  customer_type: "residential" | "business" | null;
  referred_by: string;
  submitted_at: string; // ISO timestamp
};

export type SurveyReferralsResponse = {
  ok: boolean;
  range: { start: string; end_exclusive: string };
  total: number;
  referrals: SurveyReferralRow[];
};

export function getSurveyReferrals(range?: { start?: string; end?: string }) {
  const params = new URLSearchParams();
  if (range?.start) params.set("start", range.start);
  if (range?.end) params.set("end", range.end);

  const qs = params.toString();
  const path = qs ? `/admin/metrics/survey/referrals?${qs}` : `/admin/metrics/survey/referrals`;

  return jsonFetch<SurveyReferralsResponse>(path, { method: "GET" });
}

export function getSurveyMetrics(range?: { start?: string; end?: string }) {
  const params = new URLSearchParams();
  if (range?.start) params.set("start", range.start);
  if (range?.end) params.set("end", range.end);

  const qs = params.toString();
  const path = qs ? `/admin/metrics/survey?${qs}` : `/admin/metrics/survey`;

  return jsonFetch<SurveyMetricsResponse>(path, { method: "GET" });
}

// ─── Revenue by Service ───────────────────────────────────────────────────────

export type RevenueByServiceMonthRow = {
  service_id: number;
  service_name: string;
  month_start: string; // YYYY-MM-01
  completed_count: number;
  revenue_cents: number;
};

export type RevenueByServiceTotalRow = {
  service_id: number;
  service_name: string;
  completed_count: number;
  revenue_cents: number;
};

export type RevenueByServiceResponse = {
  ok: boolean;
  range: { start: string; end_exclusive: string; tzOffsetMinutes: number };
  by_service_month: RevenueByServiceMonthRow[];
  by_service_total: RevenueByServiceTotalRow[];
};

export function getRevenueByService(range?: {
  start?: string;
  end?: string;
  tzOffsetMinutes?: number;
}) {
  const params = new URLSearchParams();
  if (range?.start) params.set("start", range.start);
  if (range?.end) params.set("end", range.end);
  if (range?.tzOffsetMinutes !== undefined)
    params.set("tzOffsetMinutes", String(range.tzOffsetMinutes));

  const qs = params.toString();
  const path = qs
    ? `/admin/metrics/revenue-by-service?${qs}`
    : `/admin/metrics/revenue-by-service`;

  return jsonFetch<RevenueByServiceResponse>(path, { method: "GET" });
}

// ─── Technician Performance ───────────────────────────────────────────────────

export type TechnicianPerformanceRow = {
  worker_id: number;
  first_name: string;
  last_name: string;
  total_assigned: number;
  completed_count: number;
  cancelled_count: number;
  active_count: number;
  revenue_cents: number;
  avg_completion_hours: number | null;
};

export type TechnicianPerformanceResponse = {
  ok: boolean;
  range: { start: string; end_exclusive: string };
  technicians: TechnicianPerformanceRow[];
};

export function getTechnicianPerformance(range?: { start?: string; end?: string }) {
  const params = new URLSearchParams();
  if (range?.start) params.set("start", range.start);
  if (range?.end) params.set("end", range.end);

  const qs = params.toString();
  const path = qs
    ? `/admin/metrics/technician-performance?${qs}`
    : `/admin/metrics/technician-performance`;

  return jsonFetch<TechnicianPerformanceResponse>(path, { method: "GET" });
}

// ─── Repeat Customers ─────────────────────────────────────────────────────────

export type RepeatCustomerTotals = {
  total_customers: number;
  repeat_customers: number;
  one_time_customers: number;
  repeat_rate_percent: number;
};

export type TopRepeatCustomerRow = {
  customer_user_id: number;
  first_name: string;
  last_name: string;
  account_type: "residential" | "business" | null;
  booking_count: number;
  completed_count: number;
  last_booking_at: string;
};

export type RepeatCustomersResponse = {
  ok: boolean;
  range: { start: string; end_exclusive: string };
  totals: RepeatCustomerTotals;
  top_repeat: TopRepeatCustomerRow[];
};

export function getRepeatCustomers(range?: { start?: string; end?: string }) {
  const params = new URLSearchParams();
  if (range?.start) params.set("start", range.start);
  if (range?.end) params.set("end", range.end);
  const qs = params.toString();
  return jsonFetch<RepeatCustomersResponse>(
    qs ? `/admin/metrics/repeat-customers?${qs}` : `/admin/metrics/repeat-customers`,
    { method: "GET" }
  );
}

// ─── Revenue by Segment ───────────────────────────────────────────────────────

export type RevenueBySegmentRow = {
  segment: "residential" | "business" | "unknown";
  completed_bookings: number;
  unique_customers: number;
  revenue_cents: number;
  avg_revenue_per_booking: number;
  avg_revenue_per_customer: number;
};

export type RevenueBySegmentMonthRow = {
  segment: string;
  month_start: string;
  completed_bookings: number;
  revenue_cents: number;
};

export type RevenueBySegmentResponse = {
  ok: boolean;
  range: { start: string; end_exclusive: string; tzOffsetMinutes: number };
  by_segment: RevenueBySegmentRow[];
  by_segment_month: RevenueBySegmentMonthRow[];
};

export function getRevenueBySegment(range?: {
  start?: string;
  end?: string;
  tzOffsetMinutes?: number;
}) {
  const params = new URLSearchParams();
  if (range?.start) params.set("start", range.start);
  if (range?.end) params.set("end", range.end);
  if (range?.tzOffsetMinutes !== undefined)
    params.set("tzOffsetMinutes", String(range.tzOffsetMinutes));
  const qs = params.toString();
  return jsonFetch<RevenueBySegmentResponse>(
    qs ? `/admin/metrics/revenue-by-segment?${qs}` : `/admin/metrics/revenue-by-segment`,
    { method: "GET" }
  );
}

// ─── Lead Conversion Age ──────────────────────────────────────────────────────

export type LeadConversionAgeTotals = {
  total_conversions: number;
  avg_days: number | null;
  min_days: number | null;
  max_days: number | null;
  median_days: number | null;
};

export type LeadConversionAgeBucket = {
  bucket: "same_day" | "1_to_7d" | "7_to_30d" | "30_to_90d" | "90d_plus";
  count: number;
};

export type LeadConversionAgeMonthRow = {
  month_start: string;
  conversions: number;
  avg_days: number | null;
};

export type LeadConversionAgeResponse = {
  ok: boolean;
  range: { start: string; end_exclusive: string };
  totals: LeadConversionAgeTotals;
  buckets: LeadConversionAgeBucket[];
  monthly: LeadConversionAgeMonthRow[];
};

export function getLeadConversionAge(range?: { start?: string; end?: string }) {
  const params = new URLSearchParams();
  if (range?.start) params.set("start", range.start);
  if (range?.end) params.set("end", range.end);
  const qs = params.toString();
  return jsonFetch<LeadConversionAgeResponse>(
    qs ? `/admin/metrics/lead-conversion-age?${qs}` : `/admin/metrics/lead-conversion-age`,
    { method: "GET" }
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function exportRevenueByServiceCsv(range?: {
  start?: string;
  end?: string;
  tzOffsetMinutes?: number;
}) {
  const params = new URLSearchParams();
  if (range?.start) params.set("start", range.start);
  if (range?.end) params.set("end", range.end);
  if (range?.tzOffsetMinutes !== undefined)
    params.set("tzOffsetMinutes", String(range.tzOffsetMinutes));

  const qs = params.toString();
  const path = qs
    ? `/admin/metrics/revenue-by-service/export?${qs}`
    : `/admin/metrics/revenue-by-service/export`;

  return fetch(resolveUrl(path), { method: "GET", credentials: "include" });
}

export function exportTechnicianPerformanceCsv(range?: { start?: string; end?: string }) {
  const params = new URLSearchParams();
  if (range?.start) params.set("start", range.start);
  if (range?.end) params.set("end", range.end);

  const qs = params.toString();
  const path = qs
    ? `/admin/metrics/technician-performance/export?${qs}`
    : `/admin/metrics/technician-performance/export`;

  return fetch(resolveUrl(path), { method: "GET", credentials: "include" });
}

// ─────────────────────────────────────────────────────────────────────────────

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