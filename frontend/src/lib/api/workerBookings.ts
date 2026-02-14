import { jsonFetch } from "../api/bookings";
import type { AdminBookingRow } from "./adminBookings";

export type WorkerListBookingsResponse = {
  ok: boolean;
  bookings: AdminBookingRow[];
};

export type WorkerCompleteBookingResponse = {
  ok: boolean;
  booking: { public_id: string; status: "completed"; completed_at: string };
};

export function workerListAssignedBookings() {
  return jsonFetch<WorkerListBookingsResponse>(`/worker/bookings/assigned`);
}

export function workerListJobHistory() {
  return jsonFetch<WorkerListBookingsResponse>(`/worker/bookings/history`);
}

export function workerCompleteBooking(publicId: string) {
  return jsonFetch<WorkerCompleteBookingResponse>(`/worker/bookings/${publicId}/complete`, {
    method: "PATCH",
  });
}