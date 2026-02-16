// frontend/src/lib/api/adminTechBookings.ts
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

export type TechBookingRow = {
  public_id: string;
  status: "assigned";
  starts_at: string;
  ends_at: string;
  address: string;
  notes: string | null;

  service_title: string;

  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_account_type: string | null;
};

export type TechRow = {
  user_id: number;                // ✅ make it a number
  public_id: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  bookings: TechBookingRow[];
};

export type AdminTechBookingsResponse = {
  ok: boolean;
  technicians: TechRow[];
  generated_at?: string;
};

export function getAdminTechBookings() {
  return jsonFetch<AdminTechBookingsResponse>("/admin/tech-bookings", { method: "GET" });
}

export function reassignBooking(publicId: string, workerUserId: number) {
  return jsonFetch<{ ok: boolean }>(`/admin/tech-bookings/${encodeURIComponent(publicId)}/reassign`, {
    method: "POST",
    body: JSON.stringify({ worker_user_id: workerUserId }), // ✅ matches backend zod schema
  });
}