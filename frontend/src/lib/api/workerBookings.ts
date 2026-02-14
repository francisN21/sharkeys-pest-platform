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
  booking: { public_id: string; status: "completed"; completed_at: string };
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

// ✅ IMPORTANT: backend is POST /:id/complete (not PATCH)
export function workerCompleteBooking(publicId: string) {
  return jsonFetch<WorkerCompleteBookingResponse>(`/worker/bookings/${publicId}/complete`, {
    method: "PATCH",
  });
}