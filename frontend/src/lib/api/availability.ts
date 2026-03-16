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

export type AvailabilityBlockType =
  | "manual"
  | "closed"
  | "holiday"
  | "travel_buffer"
  | "time_off";

export type AvailabilityBlock = {
  public_id: string;
  scope: "business";
  starts_at: string;
  ends_at: string;
  block_type: AvailabilityBlockType;
  reason?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export function listAvailabilityBlocks(params: {
  date?: string;
  tzOffsetMinutes?: number;
  startsAt?: string;
  endsAt?: string;
}) {
  const qs = new URLSearchParams();

  if (params.date) qs.set("date", params.date);
  if (typeof params.tzOffsetMinutes === "number") {
    qs.set("tzOffsetMinutes", String(params.tzOffsetMinutes));
  }
  if (params.startsAt) qs.set("startsAt", params.startsAt);
  if (params.endsAt) qs.set("endsAt", params.endsAt);

  return jsonFetch<{ ok: boolean; blocks: AvailabilityBlock[] }>(
    `/admin/availability/blocks?${qs.toString()}`
  );
}

export function createAvailabilityBlock(input: {
  startsAt: string;
  endsAt: string;
  blockType?: AvailabilityBlockType;
  reason?: string;
  notes?: string;
}) {
  return jsonFetch<{ ok: boolean; block: AvailabilityBlock }>(`/admin/availability/blocks`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteAvailabilityBlock(publicId: string) {
  return jsonFetch<{ ok: boolean }>(`/admin/availability/blocks/${publicId}`, {
    method: "DELETE",
  });
}