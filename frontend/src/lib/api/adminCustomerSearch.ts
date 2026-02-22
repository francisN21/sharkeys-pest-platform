import { jsonFetch } from "../api/bookings";

export type SearchPersonKind = "registered" | "lead";

export type AdminSearchRow = {
  public_id: string;           // uuid string
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  address?: string | null;
  created_at?: string | null;
  kind: SearchPersonKind;
};

export async function adminSearchCustomersAndLeads(args: { q?: string; limit?: number }) {
  const qs = new URLSearchParams();
  if (args.q && args.q.trim()) qs.set("q", args.q.trim());
  if (args.limit) qs.set("limit", String(args.limit));

  return jsonFetch(`/admin/customerSearch?${qs.toString()}`, {
    method: "GET",
  }) as Promise<{ ok: true; results: AdminSearchRow[] }>;
}