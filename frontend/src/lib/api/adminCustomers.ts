import { jsonFetch } from "../api/bookings";

export type AdminCustomerKind = "registered" | "lead";

export type AdminCustomerRow = {
  kind: AdminCustomerKind;
  public_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  account_type: string | null;
  created_at: string;
  open_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
};

export type AdminListCustomersResponse = {
  ok: boolean;
  customers: AdminCustomerRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  q?: string;
};

export function adminListCustomers(opts: { page?: number; pageSize?: number; q?: string }) {
  const qs = new URLSearchParams();
  if (opts.page) qs.set("page", String(opts.page));
  if (opts.pageSize) qs.set("pageSize", String(opts.pageSize));
  if (opts.q) qs.set("q", opts.q);
  return jsonFetch<AdminListCustomersResponse>(`/admin/customers?${qs.toString()}`);
}

export type AdminCustomerBookingRow = {
  public_id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  address: string | null;
  notes: string | null;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  service_title: string;
};

export type AdminCustomerDetailResponse = {
  ok: boolean;
  customer: {
    kind: AdminCustomerKind;
    public_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    account_type: string | null;
    created_at: string;
  };
  tag: {
    tag: string | null;
    note: string | null;
    updated_at: string | null;
    updated_by_user_id: number | null;
  };
  summary: {
    lifetime_value: number;
    counts: {
      in_progress: number;
      completed: number;
      cancelled: number;
    };
  };
  bookings: {
    in_progress: AdminCustomerBookingRow[];
    completed: AdminCustomerBookingRow[];
    cancelled: AdminCustomerBookingRow[];
  };
  generated_at?: string;
};

export type SearchPersonKind = "registered" | "lead";

export type AdminSearchRow = {
  public_id: string; // uuid string (as text)
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  created_at: string; // backend returns created_at for both
  kind: SearchPersonKind;
  account_type?: "residential" | "business" | null;
};

export type AdminSearchCustomersAndLeadsResponse = {
  ok: boolean;
  results: AdminSearchRow[];
};

export function adminSearchCustomersAndLeads(args?: { q?: string; limit?: number }) {
  const qs = new URLSearchParams();
  if (args?.q && args.q.trim()) qs.set("q", args.q.trim());
  if (args?.limit) qs.set("limit", String(args.limit));

  // ✅ matches backend route: GET /admin/customers/search
  return jsonFetch<AdminSearchCustomersAndLeadsResponse>(`/admin/customers/search?${qs.toString()}`);
}

export function adminGetCustomerDetail(kind: AdminCustomerKind, publicId: string) {
  return jsonFetch<AdminCustomerDetailResponse>(`/admin/customers/${kind}/${encodeURIComponent(publicId)}`);
}

export function adminSetCustomerTag(kind: AdminCustomerKind, publicId: string, tag: string | null, note?: string | null) {
  return jsonFetch<{ ok: boolean }>(`/admin/customers/${kind}/${encodeURIComponent(publicId)}/tag`, {
    method: "PATCH",
    body: JSON.stringify({ tag, note: note ?? null }),
  });
}