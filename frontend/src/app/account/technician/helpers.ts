import type { WorkerBookingRow } from "../../../lib/api/workerBookings";
import type { MessengerMessage } from "../../../components/messenger/Messenger";
import type {
  BookeeKind,
  GroupedAssigned,
  GroupKey,
  MeApiUser,
  RawBookingMessage,
} from "./types";

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function safeToNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

export function clampNonNegInt(n: number) {
  if (!Number.isFinite(n)) return 0;
  const x = Math.floor(n);
  return x < 0 ? 0 : x;
}

export function fmtMoneyFromCents(cents: number) {
  const n = Number.isFinite(cents) ? cents : 0;
  return `$${(n / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function fmtNum(n: number) {
  return Number.isFinite(n) ? n.toLocaleString() : "0";
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

export function formatNotes(notes: string | null) {
  const n = (notes ?? "").trim();
  return n.length ? n : null;
}

export function formatRelativeToNow(startsAt: string) {
  const t = new Date(startsAt).getTime();
  if (Number.isNaN(t)) return "—";

  const diffMs = t - Date.now();
  const absMinutes = Math.floor(Math.abs(diffMs) / 60000);
  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;

  const human = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  if (diffMs < 0) return `Started ${human} ago`;
  return `Starts in ${human}`;
}

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function getBookeeKind(b: WorkerBookingRow): BookeeKind {
  return b.lead_public_id ? "lead" : "registered";
}

export function pickDisplayName(b: WorkerBookingRow) {
  const kind = getBookeeKind(b);

  const leadName = `${(b.lead_first_name ?? "").trim()} ${(b.lead_last_name ?? "").trim()}`.trim();
  const customerName = `${(b.customer_first_name ?? "").trim()} ${(b.customer_last_name ?? "").trim()}`.trim();

  const name = (kind === "lead" ? leadName : customerName) || customerName || leadName || "";

  const email = (kind === "lead" ? b.lead_email : b.customer_email) ?? b.customer_email ?? b.lead_email ?? null;
  const phone = (kind === "lead" ? b.lead_phone : b.customer_phone) ?? b.customer_phone ?? b.lead_phone ?? null;
  const accountType =
    (kind === "lead" ? b.lead_account_type : b.customer_account_type) ??
    b.customer_account_type ??
    b.lead_account_type ??
    null;

  const displayName = (name || email || "—").trim() || "—";

  return {
    kind,
    displayName,
    email: email ?? "—",
    phone: phone ?? "—",
    accountType: accountType ?? "—",
    customerAddress: b.customer_address ?? null,
  };
}

export function toMessengerMessage(m: RawBookingMessage): MessengerMessage | null {
  const senderId = typeof m.sender_user_id === "string" ? Number(m.sender_user_id) : (m.sender_user_id ?? NaN);
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

export function buildAssignedGroups(rows: WorkerBookingRow[]): GroupedAssigned[] {
  const now = new Date();
  const nowMs = now.getTime();
  const twoHoursMs = 2 * 60 * 60 * 1000;

  const todayStart = startOfDay(now).getTime();
  const todayEnd = endOfDay(now).getTime();

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStart = startOfDay(tomorrow).getTime();
  const tomorrowEnd = endOfDay(tomorrow).getTime();

  const weekEnd = endOfDay(new Date(now));
  weekEnd.setDate(now.getDate() + (7 - now.getDay()));

  const buckets: Record<GroupKey, WorkerBookingRow[]> = {
    needs_attention: [],
    starting_soon: [],
    today: [],
    tomorrow: [],
    this_week: [],
    later: [],
  };

  for (const row of rows) {
    const startMs = new Date(row.starts_at).getTime();

    if (Number.isNaN(startMs)) {
      buckets.later.push(row);
      continue;
    }

    if (startMs < nowMs) {
      buckets.needs_attention.push(row);
      continue;
    }

    if (startMs <= nowMs + twoHoursMs) {
      buckets.starting_soon.push(row);
      continue;
    }

    if (startMs >= todayStart && startMs <= todayEnd) {
      buckets.today.push(row);
      continue;
    }

    if (startMs >= tomorrowStart && startMs <= tomorrowEnd) {
      buckets.tomorrow.push(row);
      continue;
    }

    if (startMs <= weekEnd.getTime()) {
      buckets.this_week.push(row);
      continue;
    }

    buckets.later.push(row);
  }

  const sortSoonest = (a: WorkerBookingRow, b: WorkerBookingRow) =>
    new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();

  for (const key of Object.keys(buckets) as GroupKey[]) {
    buckets[key].sort(sortSoonest);
  }

  return [
    {
      key: "needs_attention",
      title: "Needs Attention",
      subtitle: "Jobs whose start time already passed and still need action.",
      rows: buckets.needs_attention,
      tone: "danger",
      defaultExpanded: true,
    },
    {
      key: "starting_soon",
      title: "Starting Soon",
      subtitle: "Jobs starting within the next 2 hours.",
      rows: buckets.starting_soon,
      defaultExpanded: true,
    },
    {
      key: "today",
      title: "Today",
      subtitle: "Remaining jobs scheduled for today.",
      rows: buckets.today,
      defaultExpanded: true,
    },
    {
      key: "tomorrow",
      title: "Tomorrow",
      subtitle: "Your jobs for tomorrow.",
      rows: buckets.tomorrow,
      defaultExpanded: buckets.tomorrow.length > 0 && buckets.tomorrow.length <= 3,
    },
    {
      key: "this_week",
      title: "Later This Week",
      subtitle: "Upcoming jobs scheduled later this week.",
      rows: buckets.this_week,
      defaultExpanded: false,
    },
    {
      key: "later",
      title: "Later",
      subtitle: "Future jobs beyond this week.",
      rows: buckets.later,
      defaultExpanded: false,
    },
  ];
}