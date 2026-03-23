export type Service = {
  public_id: string;
  title: string;
  description: string;
  duration_minutes?: number | null;
  base_price_cents?: number | null;
};

export type ServicesResponse = { ok: boolean; services: Service[] };

import { jsonFetch } from "./http";

export function getServices() {
  return jsonFetch<ServicesResponse>("/services", { method: "GET" });
}