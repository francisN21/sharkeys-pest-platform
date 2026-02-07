// src/lib/api/bookings.ts
import { jsonFetch } from "./http";

export type BookingStatus = "pending" | "accepted" | "assigned" | "completed" | "cancelled";

export type BookingCard = {
  public_id: string;
  status: BookingStatus;

  starts_at: string;
  ends_at: string;
  address: string;
  created_at: string;

  completed_at?: string | null;
  cancelled_at?: string | null;

  service_title: string;
};

export type MyBookingsResponse = {
  ok: boolean;
  upcoming: BookingCard[];
  history: BookingCard[];
};

export function getMyBookings() {
  return jsonFetch<MyBookingsResponse>("/bookings/me", { method: "GET" });
}

export type CreateBookingPayload = {
  servicePublicId: string; // uuid
  startsAt: string; // ISO
  endsAt: string; // ISO
  address: string;
  notes?: string;
};

export type CreateBookingResponse = {
  ok: boolean;
  booking: {
    public_id: string;
    status: BookingStatus;
    starts_at: string;
    ends_at: string;
    address: string;
    created_at: string;
  };
};

export function createBooking(payload: CreateBookingPayload) {
  return jsonFetch<CreateBookingResponse>("/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}