// frontend/src/lib/api/adminTechBookings.ts
type ApiErrorShape = { message?: string; error?: string; ok?: boolean };

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE;

function resolveUrl(path: string) {
  if (!API_BASE && !path.startsWith("http")) {
    throw new Error(
      "Missing NEXT_PUBLIC_AUTH_API_BASE. Set it in .env.local (e.g. http://localhost:4000)."
    );
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

  // unified / legacy fields used by UI
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_account_type: string | null;

  // lead fields (nullable for registered customers)
  lead_public_id: string | null;
  lead_first_name: string | null;
  lead_last_name: string | null;
  lead_email: string | null;
  lead_phone: string | null;
  lead_account_type: string | null;

  crm_tag: string | null;
};

export type TechRow = {
  // Your API payload currently returns user_id as a string ("23"), so accept both.
  user_id: number | string;
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
  return jsonFetch<{ ok: boolean }>(
    `/admin/tech-bookings/${encodeURIComponent(publicId)}/reassign`,
    {
      method: "POST",
      body: JSON.stringify({ worker_user_id: workerUserId }),
    }
  );
}

/** booking detail for Expand page */
export type TechBookingDetail = {
  public_id: string;
  status: string | null;
  starts_at: string | null;
  ends_at: string | null;

  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;

  booking_notes: string | null;
  initial_notes: string | null;

  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
};

export function getAdminTechBookingDetail(publicId: string) {
  return jsonFetch<{ ok: boolean; booking: TechBookingDetail }>(
    `/admin/tech-bookings/${encodeURIComponent(publicId)}`,
    { method: "GET" }
  );
}