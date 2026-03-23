// frontend/src/lib/api/messages.ts
export { ApiError } from "./http";
import { jsonFetch } from "./http";

export type BookingMessage = {
  id: number;
  booking_id: number;
  sender_user_id: number | null;
  sender_role: "customer" | "admin" | "worker" | "superuser";
  body: string;
  created_at: string;
  updated_at: string | null;
  delivered_at: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export function listBookingMessages(publicId: string) {
  return jsonFetch<{ ok: boolean; messages: BookingMessage[] }>(
    `/admin/bookings/${encodeURIComponent(publicId)}/messages`,
    { method: "GET" }
  );
}

export function sendBookingMessage(publicId: string, body: string) {
  return jsonFetch<{ ok: boolean; message: BookingMessage }>(
    `/admin/bookings/${encodeURIComponent(publicId)}/messages`,
    { method: "POST", body: JSON.stringify({ body }) }
  );
}

export function editBookingMessage(publicId: string, messageId: number, body: string) {
  return jsonFetch<{ ok: boolean; message: BookingMessage }>(
    `/admin/bookings/${encodeURIComponent(publicId)}/messages/${messageId}`,
    { method: "PATCH", body: JSON.stringify({ body }) }
  );
}