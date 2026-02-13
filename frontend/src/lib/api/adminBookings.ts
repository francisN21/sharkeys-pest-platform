import { jsonFetch } from "../api/bookings"; // adjust import to your project

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
  assigned_worker_user_id: number | null;

  customer_public_id: string;
  customer_first_name: string;
  customer_last_name: string;
  customer_phone: string | null;
  customer_email: string;
  customer_address: string | null;
  customer_account_type: "residential" | "business" | null;
};

export type AdminListBookingsResponse = {

  ok: boolean;
  bookings: AdminBookingRow[];
  
};



export function getAdminBookings(status: string = "pending") {
  return jsonFetch<AdminListBookingsResponse>(`/admin/bookings?status=${encodeURIComponent(status)}`);
}

export function adminAcceptBooking(publicId: string) {
  return jsonFetch<{ ok: boolean; booking: any }>(`/admin/bookings/${publicId}/accept`, {
    method: "PATCH",
  });
}

export function adminCancelBooking(publicId: string) {
  return jsonFetch<{ ok: boolean; booking: any }>(`/admin/bookings/${publicId}/cancel`, {
    method: "PATCH",
  });
}