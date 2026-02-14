import { jsonFetch } from "../api/bookings"; // adjust to your real path

export type AdminCustomerRow = {
  id: number;
  public_id: string;

  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string;
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
  const q = args?.q ? `&q=${encodeURIComponent(args.q)}` : "";
  return jsonFetch<AdminListCustomersResponse>(`/admin/customers?page=${page}&pageSize=${pageSize}${q}`);
}