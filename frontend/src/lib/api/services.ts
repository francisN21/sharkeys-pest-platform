// src/lib/api/services.ts
import { jsonFetch } from "./http";

export type Service = {
  public_id: string;
  title: string;
  description: string;
  duration_minutes?: number | null;
  base_price_cents?: number | null;
};

export type ServicesResponse = {
  ok: boolean;
  services: Service[];
};

export function getServices() {
  return jsonFetch<ServicesResponse>("/services", { method: "GET" });
}

