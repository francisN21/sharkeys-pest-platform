type ApiErrorShape = { message?: string; error?: string; ok?: boolean };

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE;

function resolveUrl(path: string) {
  if (!API_BASE && !path.startsWith("http")) {
    throw new Error("Missing NEXT_PUBLIC_AUTH_API_BASE.");
  }
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = resolveUrl(path);

  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  const data = (await res.json().catch(() => ({}))) as T & ApiErrorShape;

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

export type AppNotification = {
  id: number;
  kind: string;
  title: string;
  body: string | null;
  booking_id: number | null;
  booking_public_id: string | null;
  message_id: number | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export async function listNotifications(limit = 20, unreadOnly = false) {
  return jsonFetch<{ ok: true; notifications: AppNotification[] }>(
    `/notifications?limit=${limit}&unreadOnly=${unreadOnly ? "true" : "false"}`
  );
}

export async function getUnreadNotificationCount() {
  return jsonFetch<{ ok: true; unread_count: number }>(`/notifications/unread-count`);
}

export async function markNotificationRead(id: number) {
  return jsonFetch<{ ok: true; notification: { id: number; read_at: string } }>(
    `/notifications/${id}/read`,
    { method: "PATCH" }
  );
}

export async function markAllNotificationsRead() {
  return jsonFetch<{ ok: true }>(`/notifications/read-all`, {
    method: "PATCH",
  });
}