import type { BookingPriceResponse } from "./types";
import { clampNonNegInt } from "./helpers";

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE;

function resolveUrl(path: string) {
  if (!API_BASE && !path.startsWith("http")) {
    throw new Error("Missing NEXT_PUBLIC_AUTH_API_BASE. Set it in .env.local (e.g. http://localhost:4000).");
  }
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(resolveUrl(path), {
    ...init,
    headers: { ...(init?.headers || {}), "Content-Type": "application/json" },
    credentials: "include",
  });

  const data = (await res.json().catch(() => ({}))) as T & {
    message?: string;
    error?: string;
  };

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

export async function getBookingPrice(publicId: string) {
  return jsonFetch<BookingPriceResponse>(`/bookings/${encodeURIComponent(publicId)}/price`);
}

export async function setFinalPrice(publicId: string, finalPriceCents: number) {
  const cents = clampNonNegInt(finalPriceCents);
  return jsonFetch<BookingPriceResponse>(`/bookings/${encodeURIComponent(publicId)}/price`, {
    method: "PATCH",
    body: JSON.stringify({ final_price_cents: cents }),
  });
}