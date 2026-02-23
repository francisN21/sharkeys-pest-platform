import { jsonFetch } from "../api/bookings";
export type AdminCustomerRow = {
  kind: "registered" | "lead";
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

export function adminListCustomers(args?: { page?: number; pageSize?: number; q?: string }) {
  const page = args?.page ?? 1;
  const pageSize = args?.pageSize ?? 30;

  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("pageSize", String(pageSize));
  if (args?.q && args.q.trim()) qs.set("q", args.q.trim());

  return jsonFetch<AdminListCustomersResponse>(`/admin/customers?${qs.toString()}`);
}

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