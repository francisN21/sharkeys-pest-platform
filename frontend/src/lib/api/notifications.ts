import { jsonFetch } from "./http";

export type AppNotification = {
  id: number;
  kind: string;
  title: string;
  body: string | null;
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