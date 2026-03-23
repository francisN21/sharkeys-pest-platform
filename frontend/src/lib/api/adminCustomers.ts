import { jsonFetch } from "./http";

export type AdminCustomerKind = "registered" | "lead";
export type CrmTag = "vip" | "regular" | "good" | "bad" | null;

/** Backend may return tag as 'VIP'/'vip'/etc. Normalize to our union. */
function normalizeCrmTag(input: unknown): CrmTag {
  if (input == null) return null;
  const s = String(input).trim().toLowerCase();
  if (s === "vip") return "vip";
  if (s === "regular") return "regular";
  if (s === "good") return "good";
  if (s === "bad") return "bad";
  return null;
}

/** ---------- LIST ---------- */

export type AdminCustomerRow = {
  kind: AdminCustomerKind;
  public_id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  account_type: string | null;
  created_at: string;

  open_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  lifetime_value_cents: number;

  // from backend LEFT JOIN customer_tags
  crm_tag?: CrmTag;
  crm_tag_note?: string | null;
  crm_tag_updated_at?: string | null;
  crm_tag_updated_by_user_id?: number | null;
};

export type AdminListCustomersResponse = {
  ok: boolean;
  customers: AdminCustomerRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  q?: string;
};

type RawAdminCustomerRow = Omit<AdminCustomerRow, "crm_tag"> & {
  crm_tag?: unknown;
  lifetime_value_cents?: number | string | null;
};

type RawAdminListCustomersResponse = Omit<AdminListCustomersResponse, "customers"> & {
  customers: RawAdminCustomerRow[];
};

export async function adminListCustomers(opts: { page?: number; pageSize?: number; q?: string }) {
  const qs = new URLSearchParams();
  if (opts.page) qs.set("page", String(opts.page));
  if (opts.pageSize) qs.set("pageSize", String(opts.pageSize));
  if (opts.q) qs.set("q", opts.q);

  const res = await jsonFetch<RawAdminListCustomersResponse>(`/admin/customers?${qs.toString()}`);

  return {
    ...res,
    customers: (res.customers || []).map((c) => ({
      ...c,
      open_bookings: Number(c.open_bookings) || 0,
      completed_bookings: Number(c.completed_bookings) || 0,
      cancelled_bookings: Number(c.cancelled_bookings) || 0,
      lifetime_value_cents: Number(c.lifetime_value_cents) || 0,
      crm_tag: normalizeCrmTag(c.crm_tag),
    })) as AdminCustomerRow[],
  } satisfies AdminListCustomersResponse;
}

/** ---------- DETAIL ---------- */

export type AdminCustomerBookingRow = {
  public_id: string;
  status: string;
  starts_at: string;
  ends_at: string;
  address: string | null;
  notes: string | null;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  service_title: string;
    effective_price_cents?: number | null;
};

export type AdminCustomerDetailResponse = {
  ok: boolean;
  customer: {
    kind: AdminCustomerKind;
    public_id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    account_type: string | null;
    created_at: string;
  };
  tag: {
    // backend returns string|null; normalize to CrmTag for the UI
    tag: CrmTag;
    note: string | null;
    updated_at: string | null;
    updated_by_user_id: number | null;
  };
  summary: {
    lifetime_value: number;
    lifetime_value_cents: number;
    counts: {
      in_progress: number;
      completed: number;
      cancelled: number;
    };
  };
  bookings: {
    in_progress: AdminCustomerBookingRow[];
    completed: AdminCustomerBookingRow[];
    cancelled: AdminCustomerBookingRow[];
  };
  generated_at?: string;
};

type RawAdminCustomerDetailResponse = Omit<AdminCustomerDetailResponse, "tag" | "summary"> & {
  tag: {
    tag: unknown;
    note: string | null;
    updated_at: string | null;
    updated_by_user_id: number | null;
  };
  summary: {
    lifetime_value: number | string | null;
    lifetime_value_cents?: number | string | null;
    counts: {
      in_progress: number | string | null;
      completed: number | string | null;
      cancelled: number | string | null;
    };
  };
};

export async function adminGetCustomerDetail(kind: AdminCustomerKind, publicId: string) {
  const res = await jsonFetch<RawAdminCustomerDetailResponse>(
    `/admin/customers/${kind}/${encodeURIComponent(publicId)}`
  );

  return {
    ...res,
    tag: {
      ...res.tag,
      tag: normalizeCrmTag(res.tag?.tag),
    },
    summary: {
      lifetime_value: Number(res.summary?.lifetime_value) || 0,
      lifetime_value_cents: Number(res.summary?.lifetime_value_cents) || 0,
      counts: {
        in_progress: Number(res.summary?.counts?.in_progress) || 0,
        completed: Number(res.summary?.counts?.completed) || 0,
        cancelled: Number(res.summary?.counts?.cancelled) || 0,
      },
    },
    bookings: {
      in_progress: (res.bookings?.in_progress || []).map((b) => ({
        ...b,
        effective_price_cents: Number(b.effective_price_cents) || 0,
      })),
      completed: (res.bookings?.completed || []).map((b) => ({
        ...b,
        effective_price_cents: Number(b.effective_price_cents) || 0,
      })),
      cancelled: (res.bookings?.cancelled || []).map((b) => ({
        ...b,
        effective_price_cents: Number(b.effective_price_cents) || 0,
      })),
    },
  } satisfies AdminCustomerDetailResponse;
}

export type SearchPersonKind = "registered" | "lead";

export type AdminSearchRow = {
  public_id: string; // uuid string (as text)
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  kind: SearchPersonKind;
  account_type?: "residential" | "business" | null;

  crm_tag?: CrmTag;
  crm_tag_note?: string | null;
  crm_tag_updated_at?: string | null;
  crm_tag_updated_by_user_id?: number | null;
};

export type AdminSearchCustomersAndLeadsResponse = {
  ok: boolean;
  results: AdminSearchRow[];
};

type RawAdminSearchRow = Omit<AdminSearchRow, "crm_tag"> & { crm_tag?: unknown };
type RawAdminSearchCustomersAndLeadsResponse = Omit<AdminSearchCustomersAndLeadsResponse, "results"> & {
  results: RawAdminSearchRow[];
};

export async function adminSearchCustomersAndLeads(args?: { q?: string; limit?: number }) {
  const qs = new URLSearchParams();
  if (args?.q && args.q.trim()) qs.set("q", args.q.trim());
  if (args?.limit) qs.set("limit", String(args.limit));

  const res = await jsonFetch<RawAdminSearchCustomersAndLeadsResponse>(
    `/admin/customers/search?${qs.toString()}`
  );

  return {
    ...res,
    results: (res.results || []).map((r) => ({
      ...r,
      crm_tag: normalizeCrmTag(r.crm_tag),
    })) as AdminSearchRow[],
  } satisfies AdminSearchCustomersAndLeadsResponse;
}

export function adminSetCustomerTag(
  kind: AdminCustomerKind,
  publicId: string,
  tag: string | null,
  note?: string | null
) {
  return jsonFetch<{ ok: boolean }>(`/admin/customers/${kind}/${encodeURIComponent(publicId)}/tag`, {
    method: "PATCH",
    body: JSON.stringify({ tag, note: note ?? null }),
  });
}

export function adminSetCustomerCrmTag(
  kind: AdminCustomerKind,
  publicId: string,
  tag: CrmTag,
  note?: string | null
) {
  return adminSetCustomerTag(kind, publicId, tag, note);
}

export function adminSendInvite(kind: AdminCustomerKind, publicId: string) {
  return jsonFetch<{ ok: boolean; message?: string; invite?: { expiresAt?: string | null } }>(
    `/admin/customers/${kind}/${publicId}/send-invite`,
    { method: "POST" }
  );
}