"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { WorkerBookingRow } from "../../../lib/api/workerBookings";
import {
  workerCompleteBooking,
  workerListAssignedBookings,
  workerListJobHistory,
} from "../../../lib/api/workerBookings";

import { me as apiMe } from "../../../lib/api/auth";

import BookingInfoCard from "../../../components/cards/BookingInfoCard";
import Messenger, { type MessengerMessage } from "../../../components/messenger/Messenger";
import CompleteWithPriceModal, {
  dollarsStringFromCents,
  parseDollarInputToCents,
} from "../../../app/account/technician/CompleteWithPriceModal";

import {
  listBookingMessages,
  sendBookingMessage,
  editBookingMessage,
  ApiError as MsgApiError,
} from "../../../lib/api/messages";

/** ---------------------------
 * Small shared types/helpers
 ---------------------------- */

type MeShape = { id: number; first_name?: string | null; last_name?: string | null };

type ApiErrorShape = { message?: string; error?: string; ok?: boolean };

type MeApiUser = {
  id?: unknown;
  first_name?: string | null;
  last_name?: string | null;
};

type MeApiResponse = {
  user?: MeApiUser | null;
};

type RawBookingMessage = {
  id: number | string;
  sender_user_id: number | string;
  sender_role: string;
  body: string;
  created_at: string;
  updated_at?: string | null;
  delivered_at?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

type ListBookingMessagesResponse = {
  messages?: RawBookingMessage[];
};

type BookingMessageMutationResponse = {
  message: RawBookingMessage;
};

type BookingPrice = {
  initial_price_cents: number;
  final_price_cents: number | null;
  currency: string;
  set_by_user_id: number | null;
  set_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type BookingPriceResponse = { ok: boolean; price: BookingPrice };

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE;

function resolveUrl(path: string) {
  if (!API_BASE && !path.startsWith("http")) {
    throw new Error("Missing NEXT_PUBLIC_AUTH_API_BASE. Set it in .env.local (e.g. http://localhost:4000).");
  }
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(resolveUrl(path), {
    ...init,
    headers: { ...(init?.headers || {}), "Content-Type": "application/json" },
    credentials: "include",
  });

  const data = (await res.json().catch(() => ({}))) as T & ApiErrorShape;

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function safeToNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

function clampNonNegInt(n: number) {
  if (!Number.isFinite(n)) return 0;
  const x = Math.floor(n);
  return x < 0 ? 0 : x;
}

function fmtMoneyFromCents(cents: number) {
  const n = Number.isFinite(cents) ? cents : 0;
  return `$${(n / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtNum(n: number) {
  return Number.isFinite(n) ? n.toLocaleString() : "0";
}

function toMessengerMessage(m: RawBookingMessage): MessengerMessage | null {
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

/** ---------------------------
 * Booking price API
 ---------------------------- */

async function getBookingPrice(publicId: string) {
  return jsonFetch<BookingPriceResponse>(`/bookings/${encodeURIComponent(publicId)}/price`);
}

async function setFinalPrice(publicId: string, finalPriceCents: number) {
  const cents = clampNonNegInt(finalPriceCents);
  return jsonFetch<BookingPriceResponse>(`/bookings/${encodeURIComponent(publicId)}/price`, {
    method: "PATCH",
    body: JSON.stringify({ final_price_cents: cents }),
  });
}

/** ---------------------------
 * Format helpers
 ---------------------------- */

function formatRange(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `${startsAt} → ${endsAt}`;

  const date = s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const start = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const end = e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} • ${start}–${end}`;
}

function formatCreated(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

function formatElapsedSince(ts: string) {
  const t = new Date(ts).getTime();
  if (Number.isNaN(t)) return "—";

  const diffMs = Date.now() - t;
  if (diffMs < 0) return "—";

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatNotes(notes: string | null) {
  const n = (notes ?? "").trim();
  return n.length ? n : null;
}

/** ---------------------------
 * Lead / Registered helpers
 ---------------------------- */

type BookeeKind = "lead" | "registered";

function getBookeeKind(b: WorkerBookingRow): BookeeKind {
  return b.lead_public_id ? "lead" : "registered";
}

function BookeePill({ kind }: { kind: BookeeKind }) {
  const isLead = kind === "lead";
  return (
    <span
      className="rounded-full border px-2 py-1 text-xs font-semibold"
      style={{
        borderColor: "rgb(var(--border))",
        background: isLead ? "rgba(245, 158, 11, 0.18)" : "rgba(var(--bg), 0.20)",
      }}
      title={isLead ? "Unregistered lead" : "Registered customer"}
    >
      {isLead ? "Lead" : "Registered"}
    </span>
  );
}

function pickDisplayName(b: WorkerBookingRow) {
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

/** ---------------------------
 * Page
 ---------------------------- */

export default function WorkerJobsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [tab, setTab] = useState<"assigned" | "history">("assigned");

  const [assignedRows, setAssignedRows] = useState<WorkerBookingRow[]>([]);
  const [historyRows, setHistoryRows] = useState<WorkerBookingRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<"created" | "scheduled">("scheduled");

  const HISTORY_PAGE_SIZE = 30;
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkerBookingRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);

  const [me, setMe] = useState<MeShape | null>(null);

  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgErr, setMsgErr] = useState<string | null>(null);
  const [msgSending, setMsgSending] = useState(false);
  const [msgLocked, setMsgLocked] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalBookingId, setModalBookingId] = useState<string | null>(null);
  const [modalBookingTitle, setModalBookingTitle] = useState<string | null>(null);
  const [modalInitialPriceCents, setModalInitialPriceCents] = useState<number | null>(null);
  const [modalPriceLoading, setModalPriceLoading] = useState(false);
  const [modalPriceInput, setModalPriceInput] = useState("");
  const [modalPriceTouched, setModalPriceTouched] = useState(false);

  async function refresh(opts?: { historyPage?: number }) {
    const pageToLoad = opts?.historyPage ?? historyPage;

    const [a, h] = await Promise.all([
      workerListAssignedBookings(),
      workerListJobHistory(pageToLoad, HISTORY_PAGE_SIZE),
    ]);

    setAssignedRows(a.bookings || []);
    setHistoryRows(h.bookings || []);
    setHistoryPage(h.page || pageToLoad);
    setHistoryTotalPages(h.totalPages || 1);
    setHistoryTotal(h.total || 0);
  }

  async function loadMessages(publicId: string) {
    setMsgErr(null);
    setMsgLocked(false);
    setMsgLoading(true);

    try {
      const res = (await listBookingMessages(publicId)) as ListBookingMessagesResponse;

      const mapped = (res.messages ?? [])
        .map(toMessengerMessage)
        .filter((m): m is MessengerMessage => m !== null);

      setMessages(mapped);
    } catch (error: unknown) {
      if (error instanceof MsgApiError && error.status === 403) {
        setMsgLocked(true);
        setMsgErr("You’re no longer part of this booking chat (it may have been reassigned).");
        setMessages([]);
      } else {
        setMsgErr(getErrorMessage(error, "Failed to load messages"));
        setMessages([]);
      }
    } finally {
      setMsgLoading(false);
    }
  }

  async function openDetail(publicId: string) {
    setDetailErr(null);
    setView("detail");
    setSelectedBookingId(publicId);

    setDetail(null);
    setDetailLoading(true);

    void loadMessages(publicId);

    try {
      const all = [...assignedRows, ...historyRows];
      const found = all.find((x) => x.public_id === publicId) ?? null;
      setDetail(found);

      if (!found) {
        setDetailErr("Booking not found in current list (try Refresh).");
      }
    } catch (error: unknown) {
      setDetailErr(getErrorMessage(error, "Failed to load booking detail"));
    } finally {
      setDetailLoading(false);
    }
  }

  function backToList() {
    setView("list");
    setSelectedBookingId(null);
    setDetail(null);
    setDetailErr(null);
    setDetailLoading(false);

    setMessages([]);
    setMsgErr(null);
    setMsgLocked(false);
    setMsgLoading(false);
    setMsgSending(false);
  }

  async function onSendMessage(body: string) {
    const publicId = selectedBookingId;
    if (!publicId) return;

    const senderId = me?.id;
    if (!senderId) {
      setMsgErr("You must be signed in to send messages.");
      return;
    }

    const trimmed = body.trim();
    if (!trimmed) return;

    setMsgErr(null);
    setMsgSending(true);

    const tempId = -Math.floor(Math.random() * 1_000_000);

    const optimistic: MessengerMessage = {
      id: tempId,
      sender_user_id: senderId,
      sender_role: "worker",
      body: trimmed,
      created_at: new Date().toISOString(),
      updated_at: null,
      delivered_at: new Date().toISOString(),
      first_name: me?.first_name ?? null,
      last_name: me?.last_name ?? null,
    };

    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = (await sendBookingMessage(publicId, trimmed)) as BookingMessageMutationResponse;
      const saved = toMessengerMessage(res.message);

      if (!saved) {
        throw new Error("Invalid message response");
      }

      setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
    } catch (error: unknown) {
      if (error instanceof MsgApiError && error.status === 403) {
        setMsgLocked(true);
        setMsgErr("You’re no longer part of this booking chat (it may have been reassigned).");
      } else {
        setMsgErr(getErrorMessage(error, "Failed to send message"));
      }
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setMsgSending(false);
    }
  }

  async function onEditMessage(messageId: number, body: string) {
    const publicId = selectedBookingId;
    if (!publicId) return;

    const trimmed = body.trim();
    if (!trimmed) return;

    setMsgErr(null);

    const before = messages;
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, body: trimmed, updated_at: new Date().toISOString() } : m))
    );

    try {
      const res = (await editBookingMessage(publicId, messageId, trimmed)) as BookingMessageMutationResponse;
      const saved = res.message;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                body: saved.body,
                updated_at: saved.updated_at ?? m.updated_at,
              }
            : m
        )
      );
    } catch (error: unknown) {
      if (error instanceof MsgApiError && error.status === 403) {
        setMsgLocked(true);
        setMsgErr("You’re no longer part of this booking chat (it may have been reassigned).");
      } else {
        setMsgErr(getErrorMessage(error, "Failed to edit message"));
      }
      setMessages(before);
    }
  }

  function findBookingTitle(publicId: string) {
    const all = [...assignedRows, ...historyRows];
    const found = all.find((x) => x.public_id === publicId);
    return found?.service_title ?? null;
  }

  async function openCompleteModal(publicId: string) {
    setModalBookingId(publicId);
    setModalBookingTitle(findBookingTitle(publicId));
    setModalInitialPriceCents(null);
    setModalPriceInput("");
    setModalPriceTouched(false);
    setModalPriceLoading(true);
    setModalOpen(true);

    try {
      const res = await getBookingPrice(publicId);
      const price = res.price ?? null;

      const nextCents =
        price?.final_price_cents !== null && price?.final_price_cents !== undefined
          ? Number(price.final_price_cents)
          : Number(price?.initial_price_cents ?? 0);

      const safeCents = Number.isFinite(nextCents) ? nextCents : 0;

      setModalInitialPriceCents(safeCents);
      setModalPriceInput(dollarsStringFromCents(safeCents));
    } catch {
      setModalInitialPriceCents(0);
      setModalPriceInput(dollarsStringFromCents(0));
    } finally {
      setModalPriceLoading(false);
    }
  }

  function closeModal() {
    if (modalBookingId && busyId === modalBookingId) return;
    setModalOpen(false);
    setModalBookingId(null);
    setModalBookingTitle(null);
    setModalInitialPriceCents(null);
    setModalPriceLoading(false);
    setModalPriceInput("");
    setModalPriceTouched(false);
  }

  async function confirmCompleteWithPrice() {
    if (!modalBookingId) return;

    setModalPriceTouched(true);

    const finalPriceCents = parseDollarInputToCents(modalPriceInput);
    if (finalPriceCents === null) return;

    const bookingId = modalBookingId;
    const serviceTitle = modalBookingTitle ?? "Booking";
    const completedAt = new Date().toLocaleString();
    const money = fmtMoneyFromCents(finalPriceCents);

    try {
      setBusyId(bookingId);
      setErr(null);

      await setFinalPrice(bookingId, finalPriceCents);
      await workerCompleteBooking(bookingId);

      const completionMsg = `✅ ${serviceTitle} — completed ${completedAt} — Final price: ${money}`;
      try {
        await sendBookingMessage(bookingId, completionMsg);
        if (view === "detail" && selectedBookingId === bookingId) {
          await loadMessages(bookingId);
        }
      } catch (error: unknown) {
        setErr((prev) => prev ?? getErrorMessage(error, "Completed, but failed to post completion message in chat."));
      }

      await refresh({ historyPage: 1 });
      closeModal();

      if (view === "detail" && selectedBookingId === bookingId) {
        await openDetail(bookingId);
      }
    } catch (error: unknown) {
      setErr(getErrorMessage(error, "Failed to complete job"));
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        await refresh({ historyPage: 1 });

        const res = (await apiMe()) as MeApiResponse;
        if (!alive) return;

        const user = res.user ?? null;
        const idNum = safeToNumber(user?.id);

        if (user && idNum) {
          setMe({
            id: idNum,
            first_name: user.first_name ?? null,
            last_name: user.last_name ?? null,
          });
        } else {
          setMe(null);
        }
      } catch (error: unknown) {
        if (!alive) return;
        setMe(null);
        setErr(getErrorMessage(error, "Failed to load jobs"));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab !== "history") return;
    refresh().catch((error: unknown) => {
      setErr(getErrorMessage(error, "Failed to load history"));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const sortedAssigned = useMemo(() => {
    const copy = [...assignedRows];
    copy.sort((a, b) => {
      const aKey = sortBy === "created" ? a.created_at : a.starts_at;
      const bKey = sortBy === "created" ? b.created_at : b.starts_at;
      const at = new Date(aKey).getTime();
      const bt = new Date(bKey).getTime();
      return sortBy === "scheduled" ? at - bt : bt - at;
    });
    return copy;
  }, [assignedRows, sortBy]);

  const sortedHistory = useMemo(() => {
    const copy = [...historyRows];
    copy.sort((a, b) => {
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return bt - at;
    });
    return copy;
  }, [historyRows]);

  const rows = tab === "assigned" ? sortedAssigned : sortedHistory;

  const canPrev = historyPage > 1;
  const canNext = historyPage < historyTotalPages;

  const modalBusy = !!modalBookingId && busyId === modalBookingId;
  const modalParsedCents = parseDollarInputToCents(modalPriceInput);
  const modalPriceError =
    modalPriceTouched && modalParsedCents === null
      ? "Final price is required. Enter a valid dollar amount like 300 or 300.00."
      : null;

  const handleModalPriceBlur = () => {
    setModalPriceTouched(true);
    const nextCents = parseDollarInputToCents(modalPriceInput);
    if (nextCents !== null) {
      setModalPriceInput(dollarsStringFromCents(nextCents));
    }
  };

  if (view === "detail") {
    const b = detail;

    return (
      <main className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <button
                type="button"
                onClick={backToList}
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
              >
                ← Back to Jobs
              </button>

              <h2 className="text-xl font-bold">{b ? `Booking ${b.public_id}` : "Booking"}</h2>
              <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                Booking details and message thread.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => selectedBookingId && openDetail(selectedBookingId)}
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                disabled={detailLoading || !selectedBookingId}
                title="Refresh booking + messages"
              >
                Refresh
              </button>

              {selectedBookingId && tab === "assigned" ? (
                <button
                  type="button"
                  onClick={() => openCompleteModal(selectedBookingId)}
                  className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                  disabled={!!busyId}
                  title="Complete (requires final price)"
                >
                  Complete Job
                </button>
              ) : null}
            </div>
          </div>

          {detailErr ? (
            <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
              {detailErr}
            </div>
          ) : null}

          {detailLoading ? (
            <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
              Loading…
            </div>
          ) : null}

          {!detailLoading && b ? <BookingInfoCard booking={b} /> : null}
        </section>

        <section className="space-y-3">
          {msgErr ? (
            <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
              {msgErr}
            </div>
          ) : null}

          <Messenger
            meUserId={me?.id ?? null}
            meFirstName={me?.first_name ?? null}
            meLastName={me?.last_name ?? null}
            messages={messages}
            onSend={onSendMessage}
            onEdit={onEditMessage}
            sending={msgSending || msgLoading}
            locked={msgLocked}
            lockedMessage={
              msgLocked ? "You’re no longer part of this booking chat (it may have been reassigned)." : undefined
            }
          />
        </section>

        <CompleteWithPriceModal
          open={modalOpen}
          busy={modalBusy}
          bookingId={modalBookingId}
          bookingTitle={modalBookingTitle}
          priceInput={modalPriceInput}
          priceLoading={modalPriceLoading}
          errorText={modalPriceError}
          onPriceInputChange={setModalPriceInput}
          onPriceInputBlur={handleModalPriceBlur}
          onClose={closeModal}
          onConfirm={confirmCompleteWithPrice}
        />
      </main>
    );
  }

  return (
    <div className="space-y-6">
      <CompleteWithPriceModal
        open={modalOpen}
        busy={modalBusy}
        bookingId={modalBookingId}
        bookingTitle={modalBookingTitle}
        priceInput={modalPriceInput}
        priceLoading={modalPriceLoading}
        errorText={modalPriceError}
        onPriceInputChange={setModalPriceInput}
        onPriceInputBlur={handleModalPriceBlur}
        onClose={closeModal}
        onConfirm={confirmCompleteWithPrice}
      />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Jobs</h2>
          <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Assigned jobs require a final price before you can complete them. Completed jobs appear in Job History.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs" style={{ color: "rgb(var(--muted))" }}>
            Sort by
          </label>

          <select
            value={sortBy}
            onChange={(e) => {
              const v = e.target.value;
              setSortBy(v === "created" ? "created" : "scheduled");
            }}
            className="rounded-lg border px-2 py-1 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            <option value="scheduled">Scheduled</option>
            <option value="created">Created</option>
          </select>

          <button
            type="button"
            onClick={() => refresh()}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            disabled={loading || !!busyId}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="inline-flex rounded-base shadow-xs -space-x-px" role="group">
        <button
          type="button"
          className="text-body bg-neutral-primary-soft border border-default hover:bg-neutral-secondary-medium hover:text-heading focus:ring-3 focus:ring-neutral-tertiary-soft font-medium leading-5 rounded-s-base text-sm px-3 py-2 focus:outline-none"
          onClick={() => setTab("assigned")}
          style={{ opacity: tab === "assigned" ? 1 : 0.75 }}
        >
          Assigned
        </button>
        <button
          type="button"
          className="text-body bg-neutral-primary-soft border border-default hover:bg-neutral-secondary-medium hover:text-heading focus:ring-3 focus:ring-neutral-tertiary-soft font-medium leading-5 rounded-e-base text-sm px-3 py-2 focus:outline-none"
          onClick={() => setTab("history")}
          style={{ opacity: tab === "history" ? 1 : 0.75 }}
        >
          Job History
        </button>
      </div>

      {err ? (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          Loading…
        </div>
      ) : null}

      {!loading && rows.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm space-y-2" style={{ borderColor: "rgb(var(--border))" }}>
          <div className="font-semibold">{tab === "assigned" ? "No assigned jobs" : "No job history"}</div>
          <div style={{ color: "rgb(var(--muted))" }}>
            {tab === "assigned"
              ? "When an admin assigns you a booking, it will appear here."
              : "Completed jobs will appear here after you complete them."}
          </div>
        </div>
      ) : null}

      {!loading && rows.length > 0 ? (
        <section className="space-y-3">
          <div className="grid gap-3">
            {rows.map((b) => {
              const busy = busyId === b.public_id;
              const notes = formatNotes(b.notes);
              const bookee = pickDisplayName(b);

              return (
                <div
                  key={b.public_id}
                  className="rounded-2xl border p-4 space-y-3"
                  style={{ borderColor: "rgb(var(--border))" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-semibold truncate">{b.service_title}</div>
                        <BookeePill kind={bookee.kind} />
                      </div>

                      <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
                        {formatRange(b.starts_at, b.ends_at)}
                      </div>

                      <div className="mt-2 text-sm">
                        <div className="font-semibold">
                          {bookee.displayName}
                          <span className="ml-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
                            ({bookee.accountType})
                          </span>
                        </div>

                        <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                          Phone: {bookee.phone} • Email: {bookee.email}
                        </div>

                        <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                          Location: {b.address || bookee.customerAddress || "—"}
                        </div>
                      </div>

                      <div className="mt-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
                        Booking ID: <span className="font-mono">{b.public_id}</span>
                      </div>
                      <div className="mt-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
                        Created: {formatCreated(b.created_at)} • SLA:{" "}
                        <span className="font-semibold">{formatElapsedSince(b.created_at)}</span>
                      </div>

                      {notes ? (
                        <div
                          className="mt-2 rounded-xl border p-3 text-sm"
                          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                        >
                          <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                            Customer Notes:
                          </div>
                          <div className="mt-1 whitespace-pre-wrap break-words">{notes}</div>
                        </div>
                      ) : null}
                    </div>

                    <span className="rounded-full border px-2 py-1 text-xs" style={{ borderColor: "rgb(var(--border))" }}>
                      {tab === "assigned" ? "Assigned" : "Completed"}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openDetail(b.public_id)}
                      className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                      disabled={!!busyId}
                      title="View details"
                    >
                      Details
                    </button>

                    {tab === "assigned" ? (
                      <button
                        type="button"
                        onClick={() => openCompleteModal(b.public_id)}
                        disabled={busy}
                        className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                        style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                        title="Complete (requires final price)"
                      >
                        {busy ? "Working…" : "Complete Job"}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {tab === "history" && historyTotalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={async () => {
                  if (historyPage <= 1) return;
                  const nextPage = historyPage - 1;
                  setHistoryPage(nextPage);
                  await refresh({ historyPage: nextPage });
                }}
                disabled={!canPrev || !!busyId}
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
              >
                Prev
              </button>

              <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                Page {historyPage} of {historyTotalPages} • {fmtNum(historyTotal)} total
              </div>

              <button
                type="button"
                onClick={async () => {
                  if (historyPage >= historyTotalPages) return;
                  const nextPage = historyPage + 1;
                  setHistoryPage(nextPage);
                  await refresh({ historyPage: nextPage });
                }}
                disabled={!canNext || !!busyId}
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
              >
                Next
              </button>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}