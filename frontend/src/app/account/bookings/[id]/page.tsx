"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  getMyBookings,
  type BookingCard,
} from "../../../../lib/api/bookings";

import BookingInfoCard from "../../../../components/cards/BookingInfoCard";
import Messenger, { type MessengerMessage } from "../../../../components/messenger/Messenger";
import { listBookingMessages, sendBookingMessage, editBookingMessage } from "../../../../lib/api/messages";
import { me as apiMe } from "../../../../lib/api/auth";

import type { MeShape } from "../types";
import { safeToNumber, splitUpcoming, toMessengerMessage } from "../helpers";
import SectionCard from "../components/SectionCard";

type MeApiUser = {
  id?: unknown;
  first_name?: string | null;
  last_name?: string | null;
  role?: unknown;
};

type MeApiResponse = {
  user?: MeApiUser | null;
};

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();

  const bookingId = typeof params?.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [booking, setBooking] = useState<BookingCard | null>(null);
  const [me, setMe] = useState<MeShape | null>(null);

  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgErr, setMsgErr] = useState<string | null>(null);
  const [msgSending, setMsgSending] = useState(false);

  async function loadBooking() {
    const res = await getMyBookings();
    const split = splitUpcoming(res.upcoming || []);
    const all = [...split.p, ...split.u, ...(res.history || [])];
    const found = all.find((x) => x.public_id === bookingId) ?? null;
    setBooking(found);
  }

  async function loadMessages(publicId: string) {
    setMsgErr(null);
    setMsgLoading(true);
    try {
      const res = await listBookingMessages(publicId);

      const mapped: MessengerMessage[] = (res.messages ?? [])
        .map(toMessengerMessage)
        .filter((x): x is MessengerMessage => x !== null);

      setMessages(mapped);
    } catch (e: unknown) {
      setMsgErr(e instanceof Error ? e.message : "Failed to load messages");
      setMessages([]);
    } finally {
      setMsgLoading(false);
    }
  }

  async function refreshAll() {
    await loadBooking();
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
      sender_role: "customer",
      body: trimmed,
      created_at: new Date().toISOString(),
      updated_at: null,
      delivered_at: new Date().toISOString(),
      first_name: me.first_name ?? null,
      last_name: me.last_name ?? null,
    };

    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await sendBookingMessage(bookingId, trimmed);
      const saved = res.message;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? {
                id: Number(saved.id),
                sender_user_id: Number(saved.sender_user_id),
                sender_role: saved.sender_role,
                body: saved.body,
                created_at: saved.created_at,
                updated_at: saved.updated_at ?? null,
                delivered_at: saved.delivered_at ?? null,
                first_name: saved.first_name ?? me.first_name ?? null,
                last_name: saved.last_name ?? me.last_name ?? null,
              }
            : m
        )
      );
    } catch (e: unknown) {
      setMsgErr(e instanceof Error ? e.message : "Failed to send message");
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
      prev.map((m) => (m.id === messageId ? { ...m, body: trimmed, updated_at: new Date().toISOString() } : m))
    );

    try {
      const res = await editBookingMessage(bookingId, messageId, trimmed);
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
    } catch (e: unknown) {
      setMsgErr(e instanceof Error ? e.message : "Failed to edit message");
      setMessages(before);
    }
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const meRes = (await apiMe()) as MeApiResponse;
        if (!alive) return;

        const user = meRes.user ?? null;
        const idNum = safeToNumber(user?.id);
        const role = String(user?.role ?? "").trim().toLowerCase();

        if (user && idNum) {
          setMe({
            id: idNum,
            first_name: user.first_name ?? null,
            last_name: user.last_name ?? null,
            role: role || null,
          });
        } else {
          setMe(null);
        }

        if (role !== "customer") {
          router.replace("/account");
          return;
        }

        await loadBooking();
        if (!alive) return;

        if (bookingId) {
          await loadMessages(bookingId);
        }
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load booking");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [bookingId, router]);

  const shortId = booking?.public_id ? booking.public_id.slice(-8) : bookingId.slice(-8);

  return (
    <main className="space-y-4 sm:space-y-6">
      <SectionCard
        title={booking?.service_title ?? "Booking Details"}
        subtitle={`Booking #${shortId}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/account/bookings")}
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            >
              ← Back
            </button>

            <button
              type="button"
              onClick={() => void refreshAll()}
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
              disabled={loading || msgLoading || msgSending}
            >
              Refresh
            </button>
          </div>
        }
      >
        {err ? (
          <div
            className="rounded-xl border p-3 text-sm"
            style={{ borderColor: "rgb(239 68 68 / 0.75)", background: "rgb(127 29 29 / 0.16)" }}
          >
            {err}
          </div>
        ) : null}

        {loading ? (
          <div
            className="rounded-2xl border p-4 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
          >
            Loading…
          </div>
        ) : !booking ? (
          <div
            className="rounded-2xl border p-4 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
          >
            This booking could not be found. It may have been removed or changed.
          </div>
        ) : (
          <BookingInfoCard booking={booking} />
        )}
      </SectionCard>

      <SectionCard title="Messages" subtitle="Message thread for this booking.">
        {msgErr ? (
          <div
            className="rounded-xl border p-3 text-sm"
            style={{ borderColor: "rgb(239 68 68 / 0.75)", background: "rgb(127 29 29 / 0.16)" }}
          >
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
      </SectionCard>
    </main>
  );
}