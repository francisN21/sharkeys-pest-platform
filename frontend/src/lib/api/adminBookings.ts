import { jsonFetch } from "../api/bookings";

export type AdminBookingRow = {
  public_id: string;
  status: "pending" | "accepted" | "assigned" | "completed" | "cancelled";
  starts_at: string;
  ends_at: string;
  address: string;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  service_title: string;
  notes: string | null;
  customer_public_id: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string | null;
  customer_email: string;
  customer_address: string | null;
  customer_account_type: string | null;
};

export type AdminListBookingsResponse = {
  ok: boolean;
  bookings: AdminBookingRow[];
};

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