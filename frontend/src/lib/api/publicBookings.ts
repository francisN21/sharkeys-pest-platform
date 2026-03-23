// frontend/src/lib/api/publicBookings.ts
import { jsonFetch } from "./http";

export type CreateGuestBookingInput = {
  servicePublicId: string;
  startsAt: string;
  endsAt: string;
  address: string;
  notes: string;
  lead: {
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    account_type?: "residential" | "business";
    address: string;
  };
};

export type CreateGuestBookingResponse = {
  ok: boolean;
  booking?: {
    public_id: string;
    status?: string;
    starts_at?: string;
    ends_at?: string;
    address?: string;
    notes?: string | null;
    created_at?: string;
  };
  lead?: {
    public_id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string | null;
    address?: string;
  };
};

export async function createGuestBooking(input: CreateGuestBookingInput) {
  return jsonFetch<CreateGuestBookingResponse>("/public/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}