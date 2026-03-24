// frontend/src/lib/api/adminTechBookings.ts
import { jsonFetch } from "./http";

/* ---------------------------
   LIST types
---------------------------- */
export type TechBookingRow = {
  public_id: string;
  status: "assigned";
  starts_at: string;
  ends_at: string;
  address: string;
  notes: string | null;

  service_title: string;
  service_base_price_cents?: number;

  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_account_type: string | null;

  lead_public_id: string | null;
  lead_first_name: string | null;
  lead_last_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  lead_account_type: string | null;

  crm_tag: string | null;
};

export type TechRow = {
  user_id: number | string;
  public_id: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  bookings: TechBookingRow[];
};

export type AdminTechBookingsResponse = {
  ok: boolean;
  technicians: TechRow[];
  generated_at?: string;
};

export function getAdminTechBookings() {
  return jsonFetch<AdminTechBookingsResponse>("/admin/tech-bookings", { method: "GET" });
}

export function reassignBooking(publicId: string, workerUserId: number) {
  return jsonFetch<{ ok: boolean }>(`/admin/tech-bookings/${encodeURIComponent(publicId)}/reassign`, {
    method: "POST",
    body: JSON.stringify({ worker_user_id: workerUserId }),
  });
}

/* ---------------------------
   DETAIL types (Expand view)
---------------------------- */
export type TechBookingDetail = {
  public_id: string;
  status: string | null;
  starts_at: string | null;
  ends_at: string | null;

  service_title: string | null;
  service_base_price_cents?: number;
  effective_price_cents?: number | null;

  completed_at?: string | null;
  cancelled_at?: string | null;

  worker_user_id: number | null;
  worker_first_name: string | null;
  worker_last_name: string | null;
  worker_email: string | null;
  worker_phone: string | null;

  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;

  booking_notes: string | null;
  initial_notes: string | null;

  customer_name: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_account_type: string | null;

  crm_tag: string | null;

  lead_public_id: string | null;
  lead_first_name: string | null;
  lead_last_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  lead_account_type: string | null;
};

export function getAdminTechBookingDetail(publicId: string) {
  return jsonFetch<{ ok: boolean; booking: TechBookingDetail }>(
    `/admin/tech-bookings/${encodeURIComponent(publicId)}`,
    { method: "GET" }
  );
}