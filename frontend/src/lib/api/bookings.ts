type BookingStatus = "pending" | "accepted" | "assigned" | "completed" | "cancelled";

export type BookingCard = {
  public_id: string;
  status: BookingStatus;
  starts_at: string;
  ends_at: string;
  address: string;
  created_at?: string;
  completed_at?: string | null;
  cancelled_at?: string | null;
  service_title: string;
};

export type MyBookingsResponse = {
  ok: boolean;
  upcoming: BookingCard[];
  history: BookingCard[];
};

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE;

function resolveUrl(path: string) {
  if (!API_BASE && !path.startsWith("http")) {
    throw new Error("Missing NEXT_PUBLIC_AUTH_API_BASE in .env.local");
  }
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(resolveUrl(path), {
    ...init,
    headers: {
      ...(init?.headers || {}),
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  const data = (await res.json().catch(() => ({}))) as unknown;

  if (!res.ok) {
    const msg =
      typeof data === "object" && data !== null && "message" in data
        ? String((data as { message?: unknown }).message || "")
        : `Request failed (${res.status})`;
    throw new Error(msg || `Request failed (${res.status})`);
  }

  return data as T;
}

export function getMyBookings() {
  return jsonFetch<MyBookingsResponse>("/bookings/me", { method: "GET" });
}
export type CreateBookingInput = {
  servicePublicId: string;
  startsAt: string; // ISO
  endsAt: string;   // ISO
  address: string;
  notes?: string;
};

export type CreateBookingResponse = {
  ok: boolean;
  booking: {
    public_id: string;
    status: string;
    starts_at: string;
    ends_at: string;
    address: string;
    created_at: string;
  };
};

export function createBooking(input: CreateBookingInput) {
  return jsonFetch<CreateBookingResponse>("/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
};

export type CancelBookingResponse = {
  ok: boolean;
  booking: {
    public_id: string;
    status: string;
    cancelled_at: string | null;
  };
};

export function cancelBooking(publicId: string) {
  return jsonFetch<CancelBookingResponse>(`/bookings/${publicId}/cancel`, {
    method: "PATCH",
  });
}