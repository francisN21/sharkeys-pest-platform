// frontend/src/lib/api/bookingPrices.ts
import { jsonFetch } from "./http";

export type BookingPrice = {
  initial_price_cents: number;
  final_price_cents: number | null;
  currency: string;
  set_by_user_id: number | null;
  set_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export function getBookingPrice(publicId: string) {
  return jsonFetch<{ ok: boolean; price: BookingPrice }>(
    `/bookings/${encodeURIComponent(publicId)}/price`,
    { method: "GET" }
  );
}

export function setBookingFinalPrice(publicId: string, finalPriceCents: number) {
  return jsonFetch<{ ok: boolean; price: BookingPrice }>(
    `/bookings/${encodeURIComponent(publicId)}/price`,
    { method: "PATCH", body: JSON.stringify({ final_price_cents: finalPriceCents }) }
  );
}