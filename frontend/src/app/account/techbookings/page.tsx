"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getAdminTechBookings,
  getAdminTechBookingDetail,
  type TechRow,
  type TechBookingDetail,
} from "../../../lib/api/adminTechBookings";

import { me as apiMe } from "../../../lib/api/auth";

import AssignTechCards from "../../../components/cards/AssignTechCards";
import BookingInfoCard from "../../../components/cards/BookingInfoCard";
import Messenger, { type MessengerMessage } from "../../../components/messenger/Messenger";

import {
  listBookingMessages,
  sendBookingMessage,
  editBookingMessage,
  ApiError as MsgApiError,
} from "../../../lib/api/messages";

type MeShape = { id: number; first_name?: string | null; last_name?: string | null };

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

function safeToNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
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

export default function TechBookingsPage() {
  const [technicians, setTechnicians] = useState<TechRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState<string | null>(null);

  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TechBookingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);

  const [me, setMe] = useState<MeShape | null>(null);

  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgErr, setMsgErr] = useState<string | null>(null);
  const [msgSending, setMsgSending] = useState(false);

  async function refresh() {
    setPageErr(null);
    setLoading(true);
    try {
      const data = await getAdminTechBookings();
      setTechnicians(data.technicians ?? []);
    } catch (error: unknown) {
      setPageErr(getErrorMessage(error, "Failed to load technician bookings"));
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(publicId: string) {
    setMsgErr(null);
    setMsgLoading(true);
    try {
      const res = (await listBookingMessages(publicId)) as ListBookingMessagesResponse;

      const mapped = (res.messages ?? [])
        .map(toMessengerMessage)
        .filter((m): m is MessengerMessage => m !== null);

      setMessages(mapped);
    } catch (error: unknown) {
      if (error instanceof MsgApiError && error.status === 403) {
        setMsgErr("You no longer have access to this booking chat.");
      } else {
        setMsgErr(getErrorMessage(error, "Failed to load messages"));
      }
      setMessages([]);
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
      const res = await getAdminTechBookingDetail(publicId);
      setDetail(res.booking);
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
      sender_role: "admin",
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
      setMsgErr(getErrorMessage(error, "Failed to send message"));
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
      prev.map((m) =>
        m.id === messageId ? { ...m, body: trimmed, updated_at: new Date().toISOString() } : m
      )
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
      setMsgErr(getErrorMessage(error, "Failed to edit message"));
      setMessages(before);
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await refresh();

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
      } catch {
        if (!alive) return;
        setMe(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const techOptions = useMemo(() => technicians, [technicians]);

  if (loading && view === "list") {
    return (
      <div className="p-4 text-sm" style={{ color: "rgb(var(--muted))" }}>
        Loading…
      </div>
    );
  }

  if (pageErr && view === "list") {
    return (
      <div className="p-4 space-y-3">
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
          {pageErr}
        </div>
        <button
          type="button"
          className="rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90"
          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
          onClick={refresh}
        >
          Retry
        </button>
      </div>
    );
  }

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
                ← Back to Tech Bookings
              </button>
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
          />
        </section>
      </main>
    );
  }

  return (
    <AssignTechCards
      technicians={technicians}
      techOptions={techOptions}
      onRefresh={refresh}
      onExpand={(publicId) => {
        void openDetail(publicId);
      }}
    />
  );
}