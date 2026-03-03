// frontend/src/lib/api/bookingPrices.ts
type ApiErrorShape = { message?: string; error?: string; ok?: boolean };

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE;

function resolveUrl(path: string) {
  if (!API_BASE && !path.startsWith("http")) {
    throw new Error("Missing NEXT_PUBLIC_AUTH_API_BASE. Set it in .env.local (e.g. http://localhost:4000).");
  }
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
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
    throw new Error(msg);
  }

  return data as T;
}

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