// frontend/src/lib/api/adminServices.ts
export type Service = {
  public_id: string;
  title: string;
  description: string;
  duration_minutes?: number | null;
  base_price_cents?: number | null;
};

export type ServicesResponse = { ok: boolean; services: Service[] };

export type AdminServiceResponse = { ok: boolean; service: Service };

export type OkResponse = { ok: boolean };

import { jsonFetch } from "./http";

// OWNER list (admin)
export function getOwnerServices() {
  return jsonFetch<ServicesResponse>("/admin/services", { method: "GET" });
}

export function createOwnerService(input: {
  title: string;
  description: string;
  duration_minutes?: number | null;
  base_price_cents?: number; // NEW
}) {
  return jsonFetch<AdminServiceResponse>("/admin/services", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateOwnerService(
  publicId: string,
  patch: Partial<Pick<Service, "title" | "description" | "duration_minutes" | "base_price_cents">>
) {
  return jsonFetch<AdminServiceResponse>(`/admin/services/${encodeURIComponent(publicId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function deleteOwnerService(publicId: string) {
  return jsonFetch<OkResponse>(`/admin/services/${encodeURIComponent(publicId)}`, {
    method: "DELETE",
  });
}