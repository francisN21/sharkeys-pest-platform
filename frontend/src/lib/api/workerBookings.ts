// frontend/src/lib/api/workerBookings.ts
import { jsonFetch } from "../api/bookings";

// ✅ Worker row supports both registered customer and lead bookings
export type WorkerBookingRow = {
  public_id: string;
  status: "assigned" | "completed" | "cancelled" | "pending" | "accepted";
  starts_at: string;
  ends_at: string;
  address: string;
  notes: string | null;

  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;

  service_title: string;

  // --- registered customer (nullable for lead bookings)
  customer_public_id?: string | null;
  customer_first_name?: string | null;
  customer_last_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  customer_account_type?: string | null;

  // --- lead (nullable for registered bookings)
  lead_public_id?: string | null;
  lead_first_name?: string | null;
  lead_last_name?: string | null;
  lead_email?: string | null;
  lead_phone?: string | null;
  lead_account_type?: string | null;
};

export type WorkerListBookingsResponse = {
  ok: boolean;
  bookings: WorkerBookingRow[];
};

export type WorkerHistoryResponse = {
  ok: boolean;
  bookings: WorkerBookingRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type WorkerCompleteBookingResponse = {
  ok: boolean;
  booking: {
    public_id: string;
    status: "completed";
    completed_at?: string;
    completed_worker_user_id?: number;
  };
};

export function workerListAssignedBookings() {
  return jsonFetch<WorkerListBookingsResponse>(`/worker/bookings/assigned`);
}

export function workerListJobHistory(page = 1, pageSize = 30) {
  const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return jsonFetch<WorkerHistoryResponse>(`/worker/bookings/history?${qs.toString()}`);
}

export function workerCompleteBooking(publicId: string) {
  return jsonFetch<WorkerCompleteBookingResponse>(`/worker/bookings/${publicId}/complete`, {
    method: "PATCH",
  });
}