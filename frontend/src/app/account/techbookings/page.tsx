// frontend/src/app/account/techbookings/page.tsx
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

import { listBookingMessages, sendBookingMessage, editBookingMessage } from "../../../lib/api/messages";

type MeShape = { id: number; first_name?: string | null; last_name?: string | null };

function safeToNumber(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  if (!Number.isFinite(n) || n <= 0) return null;
  if (!Number.isSafeInteger(n)) return null;
  return n;
}

export default function TechBookingsPage() {
  const [technicians, setTechnicians] = useState<TechRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageErr, setPageErr] = useState<string | null>(null);

  // view state
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TechBookingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);

  // me
  const [me, setMe] = useState<MeShape | null>(null);

  // messages (for detail view)
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
    } catch (e: unknown) {
      setPageErr(e instanceof Error ? e.message : "Failed to load technician bookings");
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(publicId: string) {
    setMsgErr(null);
    setMsgLoading(true);
    try {
      const res = await listBookingMessages(publicId);

      const mapped: MessengerMessage[] = (res.messages ?? [])
        .map((m) => {
          const senderId = Number(m.sender_user_id);
          if (!Number.isFinite(senderId) || senderId <= 0) return null; // guard
          return {
            id: Number(m.id),
            sender_user_id: senderId, // ✅ always number
            sender_role: m.sender_role,
            body: m.body,
            created_at: m.created_at,
            updated_at: m.updated_at ?? null,
            delivered_at: m.delivered_at ?? null,
            first_name: m.first_name ?? null,
            last_name: m.last_name ?? null,
          } as MessengerMessage;
        })
        .filter(Boolean) as MessengerMessage[];

      setMessages(mapped);
    } catch (e: any) {
      setMsgErr(e?.message || "Failed to load messages");
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

    // also load messages in parallel
    loadMessages(publicId);

    try {
      const res = await getAdminTechBookingDetail(publicId);
      setDetail(res.booking);
    } catch (e: unknown) {
      setDetailErr(e instanceof Error ? e.message : "Failed to load booking detail");
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

    // reset messages
    setMessages([]);
    setMsgErr(null);
    setMsgLoading(false);
    setMsgSending(false);
  }

  async function onSendMessage(body: string) {
  const publicId = selectedBookingId;
  if (!publicId) return;

  const senderId = me?.id; // <- number | undefined
  if (!senderId) {
    setMsgErr("You must be signed in to send messages.");
    return;
  }

  const trimmed = body.trim();
  if (!trimmed) return;

  setMsgErr(null);
  setMsgSending(true);

  // optimistic insert (TEMP NEGATIVE ID)
  const tempId = -Math.floor(Math.random() * 1_000_000);

  const optimistic: MessengerMessage = {
    id: tempId,
    sender_user_id: senderId, // ✅ number (not nullable)
    sender_role: "worker",
    body: trimmed,
    created_at: new Date().toISOString(),
    updated_at: null,
    delivered_at: new Date().toISOString(),
    first_name: me?.first_name ?? null,
    last_name: me?.last_name ?? null,
  };

  setMessages((prev): MessengerMessage[] => [...prev, optimistic]);

  try {
    const res = await sendBookingMessage(publicId, trimmed);
    const saved = res.message;

    setMessages((prev): MessengerMessage[] =>
      prev.map((m) =>
        m.id === tempId
          ? {
              id: saved.id,
              sender_user_id: Number(saved.sender_user_id), // ✅ force number
              sender_role: saved.sender_role,
              body: saved.body,
              created_at: saved.created_at,
              updated_at: saved.updated_at ?? null,
              delivered_at: saved.delivered_at ?? null,
              first_name: saved.first_name ?? me?.first_name ?? null,
              last_name: saved.last_name ?? me?.last_name ?? null,
            }
          : m
      )
    );
  } catch (e: any) {
    setMsgErr(e?.message || "Failed to send message");
    setMessages((prev): MessengerMessage[] => prev.filter((m) => m.id !== tempId));
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

    // optimistic update
    const before = messages;
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, body: trimmed, updated_at: new Date().toISOString() } : m)));

    try {
      const res = await editBookingMessage(publicId, messageId, trimmed);
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
    } catch (e: any) {
      setMsgErr(e?.message || "Failed to edit message");
      setMessages(before); // rollback
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        await refresh();

        const res = await apiMe();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const techOptions = useMemo(() => technicians, [technicians]);

  // LIST loading/error
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

  // DETAIL VIEW
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

  // LIST VIEW
  return (
    <AssignTechCards
      technicians={technicians}
      techOptions={techOptions}
      onRefresh={refresh}
      onExpand={(publicId) => openDetail(publicId)}
    />
  );
}