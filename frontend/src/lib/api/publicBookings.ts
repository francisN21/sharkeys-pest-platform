// frontend/src/lib/api/publicBookings.ts
type ApiErrorShape = { message?: string; error?: string; ok?: boolean };

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE;

function resolveUrl(path: string) {
  if (!API_BASE && !path.startsWith("http")) {
    throw new Error("Missing NEXT_PUBLIC_AUTH_API_BASE. Set it in .env.local.");
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
    throw new Error(data?.message || data?.error || `Request failed (${res.status})`);
  }

  return data as T;
}

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