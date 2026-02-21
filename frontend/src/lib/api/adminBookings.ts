import { jsonFetch } from "../api/bookings";

export type AdminBookingRow = {
  public_id: string;
  status: "pending" | "accepted" | "assigned" | "completed" | "cancelled";
  starts_at: string;
  ends_at: string;
  address: string;
  notes: string | null;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  service_title: string;
  //Customer Data
  customer_public_id: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string | null;
  customer_email: string;
  customer_address: string | null;
  customer_account_type: string | null;

  //technincian Data
  completed_event_at?: string | null;

  completed_by_user_id?: number | null;
  completed_by_public_id?: string | null;
  completed_by_first_name?: string | null;
  completed_by_last_name?: string | null;
  completed_by_phone?: string | null;
  completed_by_email?: string | null;
};

export type AdminListBookingsResponse = {
  ok: boolean;
  bookings: AdminBookingRow[];
};

export type AdminCompletedBookingsResponse = {
  ok: boolean;
  bookings: AdminBookingRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  filter: { year: number | null; month: number | null; day: number | null };
  q: string;
};

export type AdminCompletedFiltersResponse =
  | { ok: boolean; years: number[] }
  | { ok: boolean; months: number[] }
  | { ok: boolean; days: number[] };

export function adminListCompletedBookings(params: {
  page?: number;
  pageSize?: number; // 30..100
  year?: number;
  month?: number;
  day?: number;
  q?: string;
}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  if (params.year) qs.set("year", String(params.year));
  if (params.month) qs.set("month", String(params.month));
  if (params.day) qs.set("day", String(params.day));
  if (params.q) qs.set("q", params.q);

  return jsonFetch<AdminCompletedBookingsResponse>(`/admin/bookings/completed?${qs.toString()}`);
}

export type TechnicianRow = {
  id: number;
  public_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string;
};

export function getAdminBookings(status: string = "pending") {
  return jsonFetch<AdminListBookingsResponse>(
    `/admin/bookings?status=${encodeURIComponent(status)}`
  );
}

export async function adminListBookings(status: string) {
  return jsonFetch<AdminListBookingsResponse>(
    `/admin/bookings?status=${encodeURIComponent(status)}`
  );
}

export function adminAcceptBooking(publicId: string) {
  return jsonFetch<{ ok: boolean; booking: AdminBookingRow }>(
    `/admin/bookings/${publicId}/accept`,
    { method: "PATCH" }
  );
}

export function adminCancelBooking(publicId: string) {
  return jsonFetch<{ ok: boolean; booking: AdminBookingRow }>(
    `/admin/bookings/${publicId}/cancel`,
    { method: "PATCH" }
  );
}

export async function adminListTechnicians() {
  return jsonFetch<{ ok: boolean; technicians: TechnicianRow[] }>(
    `/admin/bookings/technicians`
  );
}

export async function adminAssignBooking(
  publicId: string,
  workerUserId: number
) {
  return jsonFetch<{ ok: boolean; booking: AdminBookingRow }>(
    `/admin/bookings/${publicId}/assign`,
    {
      method: "PATCH",
      body: JSON.stringify({ workerUserId }),
    }
  );
}

export function adminGetCompletedFilters(params: { year?: number; month?: number }) {
  const qs = new URLSearchParams();
  if (params.year) qs.set("year", String(params.year));
  if (params.month) qs.set("month", String(params.month));
  return jsonFetch<AdminCompletedFiltersResponse>(`/admin/bookings/completed/filters?${qs.toString()}`);
}

export type AdminCreateBookingResponse = {
  ok: boolean;
  booking?: {
    public_id: string;
    status: string;
    starts_at: string;
    ends_at: string;
    address: string;
    notes: string | null;
    created_at: string;
  };
};

export type AdminCreateBookingInput =
  | {
      servicePublicId: string;
      startsAt: string;
      endsAt: string;
      notes?: string;
      customerPublicId: string;
      address?: string; // optional override
    }
  | {
      servicePublicId: string;
      startsAt: string;
      endsAt: string;
      notes?: string;
      lead: {
        email: string;
        first_name?: string;
        last_name?: string;
        phone?: string;
        account_type?: "residential" | "business";
        address: string;
      };
      address?: string; // optional override (usually not needed)
    };

export function adminCreateBooking(payload: AdminCreateBookingInput) {
  return jsonFetch<AdminCreateBookingResponse>("/admin/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type AvailabilityBooking = {
  public_id: string;
  starts_at: string; // ISO
  ends_at: string;   // ISO
  status: string;
};

export type BookingAvailabilityResponse = {
  ok: boolean;
  date: string; // YYYY-MM-DD
  startUtc: string;
  endUtc: string;
  bookings: AvailabilityBooking[];
};

export function getBookingAvailability(params: { date: string; tzOffsetMinutes: number }) {
  const qs = new URLSearchParams({
    date: params.date,
    tzOffsetMinutes: String(params.tzOffsetMinutes),
  });
  return jsonFetch<BookingAvailabilityResponse>(`/bookings/availability?${qs.toString()}`, { method: "GET" });
}