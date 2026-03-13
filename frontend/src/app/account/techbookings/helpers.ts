import type { MessengerMessage } from "../../../components/messenger/Messenger";
import type { TechBookingRow, TechRow } from "../../../lib/api/adminTechBookings";
import type { MeApiUser, PersonKind, RawBookingMessage } from "./types";

type TechBookingWithLead = TechBookingRow & {
  crm_tag?: string | null;
  lead_public_id?: string | null;
  lead_first_name?: string | null;
  lead_last_name?: string | null;
  lead_email?: string | null;
  lead_phone?: string | null;
  lead_account_type?: string | null;
};

export function safeToNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function toMessengerMessage(m: RawBookingMessage): MessengerMessage | null {
  const senderId = typeof m.sender_user_id === "string" ? Number(m.sender_user_id) : m.sender_user_id;
  const messageId = typeof m.id === "string" ? Number(m.id) : m.id;

  if (!Number.isFinite(senderId) || senderId <= 0) return null;
  if (!Number.isFinite(messageId) || messageId <= 0) return null;

  return {
    id: Number(messageId),
    sender_user_id: Number(senderId),
    sender_role: m.sender_role,
    body: m.body,
    created_at: m.created_at,
    updated_at: m.updated_at ?? null,
    delivered_at: m.delivered_at ?? null,
    first_name: m.first_name ?? null,
    last_name: m.last_name ?? null,
  };
}

export function userToMe(user: MeApiUser | null | undefined) {
  const idNum = safeToNumber(user?.id);
  if (!user || !idNum) return null;

  return {
    id: idNum,
    first_name: user.first_name ?? null,
    last_name: user.last_name ?? null,
  };
}

export function techLabel(t: TechRow) {
  const name = `${(t.first_name ?? "").trim()} ${(t.last_name ?? "").trim()}`.trim();
  return name || t.email || `Tech #${t.user_id}`;
}

export function normalizeText(v: string | null | undefined) {
  const s = String(v ?? "").trim();
  return s.length ? s : "—";
}

export function formatRange(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `${startsAt} → ${endsAt}`;
  const date = s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const start = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const end = e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} • ${start}–${end}`;
}

export function formatCreated(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

export function getKind(b: TechBookingWithLead): PersonKind {
  return b.lead_public_id ? "lead" : "registered";
}

export function getBookee(b: TechBookingWithLead) {
  const leadName = `${(b.lead_first_name ?? "").trim()} ${(b.lead_last_name ?? "").trim()}`.trim();
  const customerName = String(b.customer_name ?? "").trim();

  const name = customerName || leadName || "";
  const email = b.customer_email ?? b.lead_email ?? null;
  const phone = b.customer_phone ?? b.lead_phone ?? null;
  const accountType = b.customer_account_type ?? b.lead_account_type ?? null;

  return {
    displayName: name.length ? name : email || "—",
    email,
    phone,
    accountType,
  };
}

export function formatAccountTypeLabel(v: string | null | undefined) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return "—";
  if (s === "residential") return "Residential";
  if (s === "business") return "Business";
  return String(v);
}