export type Service = {
  public_id: string;
  title: string;
  description: string;
  duration_minutes?: number | null;
  base_price_cents?: number | null;
};

export type ServicesResponse = { ok: boolean; services: Service[] };

export type AdminServiceResponse = { ok: boolean; service: Service };

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

// OWNER list (admin)
export function getOwnerServices() {
  return jsonFetch<ServicesResponse>("/admin/services", { method: "GET" });
}

export function createOwnerService(input: {
  title: string;
  description: string;
  duration_minutes?: number | null;
}) {
  return jsonFetch<AdminServiceResponse>("/admin/services", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateOwnerService(
  publicId: string,
  patch: Partial<Pick<Service, "title" | "description" | "duration_minutes">>
) {
  return jsonFetch<AdminServiceResponse>(`/admin/services/${encodeURIComponent(publicId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}