import { jsonFetch } from "../api/bookings";
import type { AdminBookingRow } from "./adminBookings";

export type WorkerListBookingsResponse = {
  ok: boolean;
  bookings: AdminBookingRow[];
};

export type WorkerHistoryResponse = {
  ok: boolean;
  bookings: AdminBookingRow[];
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
    completed_at?: string; // ✅ optional for idempotent response
    completed_worker_user_id?: number; // ✅ optional if you want it
  };
};

export function workerListAssignedBookings() {
  return jsonFetch<WorkerListBookingsResponse>(`/worker/bookings/assigned`);
}

export function workerListJobHistory(page = 1, pageSize = 30) {
  const qs = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  return jsonFetch<WorkerHistoryResponse>(`/worker/bookings/history?${qs.toString()}`);
}

// backend is PATCH /worker/bookings/:id/complete
export function workerCompleteBooking(publicId: string) {
  return jsonFetch<WorkerCompleteBookingResponse>(`/worker/bookings/${publicId}/complete`, {
    method: "PATCH",
  });
}