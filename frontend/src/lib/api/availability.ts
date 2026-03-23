import { jsonFetch } from "./http";

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