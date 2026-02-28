// frontend/src/lib/api/messages.ts
type ApiErrorShape = { message?: string; error?: string; ok?: boolean };

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE;

function resolveUrl(path: string) {
  if (!API_BASE && !path.startsWith("http")) {
    throw new Error("Missing NEXT_PUBLIC_AUTH_API_BASE. Set it in .env.local (e.g. http://localhost:4000).");
  }
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = resolveUrl(path);

  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.headers || {}), "Content-Type": "application/json" },
    credentials: "include",
  });

  const data = (await res.json().catch(() => ({}))) as T & ApiErrorShape;

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }

  return data as T;
}

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