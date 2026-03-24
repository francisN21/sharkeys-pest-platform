import type { BookingCard } from "../../../lib/api/bookings";
import type { MessengerMessage } from "../../../components/messenger/Messenger";
import type { BookingCardWithOps, PersonLite } from "./types";

export function formatBookingTimeRange(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `${startsAt} → ${endsAt}`;

  const date = s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const start = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const end = e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} • ${start}–${end}`;
}

export function normalizeText(v: string | null | undefined) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

export function toDateTimeLocalValue(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function fromDateTimeLocalValue(v: string) {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function fullName(first?: string | null, last?: string | null) {
  const f = normalizeText(first);
  const l = normalizeText(last);
  const s = `${f ?? ""} ${l ?? ""}`.trim();
  return s.length ? s : null;
}

export function pickAssigned(b: BookingCardWithOps): PersonLite | null {
  const obj = b.assigned_to ?? null;

  const name =
    normalizeText(obj?.name ?? b.assigned_to_name) ??
    fullName(b.assigned_worker_first_name, b.assigned_worker_last_name);

  const phone = normalizeText(obj?.phone ?? b.assigned_to_phone ?? b.assigned_worker_phone);
  const email = normalizeText(obj?.email ?? b.assigned_to_email ?? b.assigned_worker_email);
  const role = normalizeText(obj?.role);

  if (!name && !phone && !email && !role) return null;
  return { name, phone, email, role };
}

export function pickCompleted(b: BookingCardWithOps): PersonLite | null {
  const obj = b.completed_by ?? null;

  const name =
    normalizeText(obj?.name ?? b.completed_by_name) ??
    fullName(b.completed_by_first_name, b.completed_by_last_name);

  const phone = normalizeText(obj?.phone ?? b.completed_by_phone);
  const email = normalizeText(obj?.email ?? b.completed_by_email);
  const role = normalizeText(obj?.role);

  if (!name && !phone && !email && !role) return null;
  return { name, phone, email, role };
}

export function safeToNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

export function splitUpcoming(list: BookingCard[]) {
  const p = list.filter((b) => b.status === "pending");
  const u = list.filter((b) => b.status !== "pending");
  return { p, u };
}

export function toMessengerMessage(input: {
  id: number | string;
  sender_user_id: number | string | null;
  sender_role: string;
  body: string;
  created_at: string;
  updated_at?: string | null;
  delivered_at?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): MessengerMessage | null {
  const senderId = Number(input.sender_user_id);
  const messageId = Number(input.id);

  if (!Number.isFinite(senderId) || senderId <= 0) return null;
  if (!Number.isFinite(messageId) || messageId <= 0) return null;

  return {
    id: messageId,
    sender_user_id: senderId,
    sender_role: input.sender_role,
    body: input.body,
    created_at: input.created_at,
    updated_at: input.updated_at ?? null,
    delivered_at: input.delivered_at ?? null,
    first_name: input.first_name ?? null,
    last_name: input.last_name ?? null,
  };
}