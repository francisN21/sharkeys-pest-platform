"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClipboardList, MessageSquare, RefreshCw, X } from "lucide-react";
import {
  getAdminTechBookingDetail,
  type TechBookingDetail,
} from "../../../../../lib/api/adminTechBookings";

import { me as apiMe } from "../../../../../lib/api/auth";
import BookingInfoCard from "../../../../../components/cards/BookingInfoCard";
import Messenger, { type MessengerMessage } from "../../../../../components/messenger/Messenger";

import {
  listBookingMessages,
  sendBookingMessage,
  editBookingMessage,
  ApiError as MsgApiError,
} from "../../../../../lib/api/messages";

import type {
  BookingMessageMutationResponse,
  ListBookingMessagesResponse,
  MeApiResponse,
} from "../../types";
import { getErrorMessage, toMessengerMessage, userToMe } from "../../helpers";
import SectionCard from "../../components/SectionCard";

export default function AdminTechBookingDetailPage() {
  const router = useRouter();
  const params = useParams();

  const bookingId = typeof params?.id === "string" ? params.id : "";

  const [detail, setDetail] = useState<TechBookingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailErr, setDetailErr] = useState<string | null>(null);

  const [me, setMe] = useState<{ id: number; first_name?: string | null; last_name?: string | null } | null>(null);

  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgErr, setMsgErr] = useState<string | null>(null);
  const [msgSending, setMsgSending] = useState(false);

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

  async function loadDetail() {
    if (!bookingId) return;

    setDetailErr(null);
    setDetailLoading(true);

    try {
      const res = await getAdminTechBookingDetail(bookingId);
      setDetail(res.booking);
    } catch (error: unknown) {
      setDetailErr(getErrorMessage(error, "Failed to load booking detail"));
    } finally {
      setDetailLoading(false);
    }
  }

  async function refreshAll() {
    await loadDetail();
    if (bookingId) {
      await loadMessages(bookingId);
    }
  }

  async function onSendMessage(body: string) {
    if (!bookingId) return;

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
      const res = (await sendBookingMessage(bookingId, trimmed)) as BookingMessageMutationResponse;
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
    if (!bookingId) return;

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
      const res = (await editBookingMessage(bookingId, messageId, trimmed)) as BookingMessageMutationResponse;
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
        const res = (await apiMe()) as MeApiResponse;
        if (!alive) return;
        setMe(userToMe(res.user ?? null));
      } catch {
        if (!alive) return;
        setMe(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!bookingId) return;
    void refreshAll();
  }, [bookingId]);

  const shortId = detail?.public_id ? detail.public_id.slice(-8) : bookingId.slice(-8);

  return (
    <main className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => router.push("/account/techbookings")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium transition hover:bg-white/[0.06]"
          >
            ← Back to Tech Bookings
          </button>

          <div>
            <h2 className="text-xl font-bold text-[rgb(var(--fg))]">
              {detail?.service_title ?? "Booking Details"}
            </h2>
            <p className="mt-1 text-sm text-[rgb(var(--muted))]">Booking #{shortId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refreshAll()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium transition hover:bg-white/[0.06] disabled:opacity-60"
            disabled={detailLoading || msgLoading}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {detailErr ? (
        <div className="flex items-center justify-between rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <span>{detailErr}</span>
          <button type="button" onClick={() => setDetailErr(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {msgErr ? (
        <div className="flex items-center justify-between rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <span>{msgErr}</span>
          <button type="button" onClick={() => setMsgErr(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <SectionCard
        title="Booking Information"
        subtitle="Service, customer, schedule, pricing, and status details."
        icon={<ClipboardList className="h-5 w-5" />}
      >
        {detailLoading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 text-sm text-[rgb(var(--muted))]">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Loading booking…
          </div>
        ) : null}

        {!detailLoading && detail ? <BookingInfoCard booking={detail} /> : null}
      </SectionCard>
        <Messenger
          meUserId={me?.id ?? null}
          meFirstName={me?.first_name ?? null}
          meLastName={me?.last_name ?? null}
          messages={messages}
          onSend={onSendMessage}
          onEdit={onEditMessage}
          sending={msgSending || msgLoading}
        />
    </main>
  );
}