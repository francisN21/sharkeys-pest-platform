"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { WorkerBookingRow } from "../../../../../lib/api/workerBookings";
import { workerCompleteBooking } from "../../../../../lib/api/workerBookings";
import { me as apiMe } from "../../../../../lib/api/auth";
import BookingInfoCard from "../../../../../components/cards/BookingInfoCard";
import Messenger, { type MessengerMessage } from "../../../../../components/messenger/Messenger";
import CompleteWithPriceModal, {
  dollarsStringFromCents,
  parseDollarInputToCents,
} from "../../../../../app/account/technician/CompleteWithPriceModal";
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
import {
  fmtMoneyFromCents,
  getErrorMessage,
  toMessengerMessage,
  userToMe,
} from "../../helpers";
import {
  findWorkerBookingByPublicId,
  getBookingPrice,
  setFinalPrice,
} from "../../api";
import SectionCard from "../../components/SectionCard";

export default function TechnicianBookingDetailPage() {
  const router = useRouter();
  const params = useParams();

  const bookingId = typeof params?.id === "string" ? params.id : "";

  const [booking, setBooking] = useState<WorkerBookingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailErr, setDetailErr] = useState<string | null>(null);

  const [me, setMe] = useState<{ id: number; first_name?: string | null; last_name?: string | null } | null>(null);

  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgErr, setMsgErr] = useState<string | null>(null);
  const [msgSending, setMsgSending] = useState(false);
  const [msgLocked, setMsgLocked] = useState(false);

  const [busy, setBusy] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalBookingTitle, setModalBookingTitle] = useState<string | null>(null);
  const [, setModalInitialPriceCents] = useState<number | null>(null);
  const [modalPriceLoading, setModalPriceLoading] = useState(false);
  const [modalPriceInput, setModalPriceInput] = useState("");
  const [modalPriceTouched, setModalPriceTouched] = useState(false);

  async function loadBooking() {
    if (!bookingId) return;
    setDetailErr(null);
    setLoading(true);

    try {
      const found = await findWorkerBookingByPublicId(bookingId);
      setBooking(found);
      if (!found) {
        setDetailErr("Booking not found.");
      }
    } catch (error: unknown) {
      setDetailErr(getErrorMessage(error, "Failed to load booking"));
    } finally {
      setLoading(false);
    }
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
      const res = (await sendBookingMessage(bookingId, trimmed)) as BookingMessageMutationResponse;
      const saved = toMessengerMessage(res.message);
      if (!saved) throw new Error("Invalid message response");

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
    if (!bookingId) return;
    const trimmed = body.trim();
    if (!trimmed) return;

    setMsgErr(null);
    const before = messages;

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, body: trimmed, updated_at: new Date().toISOString() } : m))
    );

    try {
      const res = (await editBookingMessage(bookingId, messageId, trimmed)) as BookingMessageMutationResponse;
      const saved = res.message;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, body: saved.body, updated_at: saved.updated_at ?? m.updated_at }
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

  async function openCompleteModal() {
    if (!bookingId) return;

    setModalBookingTitle(booking?.service_title ?? "Booking");
    setModalInitialPriceCents(null);
    setModalPriceInput("");
    setModalPriceTouched(false);
    setModalPriceLoading(true);
    setModalOpen(true);

    try {
      const res = await getBookingPrice(bookingId);
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
    if (busy) return;
    setModalOpen(false);
    setModalBookingTitle(null);
    setModalInitialPriceCents(null);
    setModalPriceLoading(false);
    setModalPriceInput("");
    setModalPriceTouched(false);
  }

  async function confirmCompleteWithPrice() {
    if (!bookingId) return;

    setModalPriceTouched(true);
    const finalPriceCents = parseDollarInputToCents(modalPriceInput);
    if (finalPriceCents === null) return;

    const serviceTitle = booking?.service_title ?? modalBookingTitle ?? "Booking";
    const completedAt = new Date().toLocaleString();
    const money = fmtMoneyFromCents(finalPriceCents);

    try {
      setBusy(true);

      await setFinalPrice(bookingId, finalPriceCents);
      await workerCompleteBooking(bookingId);

      const completionMsg = `✅ ${serviceTitle} — completed ${completedAt} — Final price: ${money}`;
      try {
        await sendBookingMessage(bookingId, completionMsg);
      } catch {}

      closeModal();
      await refreshAll();
    } catch (error: unknown) {
      setDetailErr(getErrorMessage(error, "Failed to complete job"));
    } finally {
      setBusy(false);
    }
  }

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
              onClick={() => router.push("/account/technician")}
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
              disabled={loading || busy}
            >
              Refresh
            </button>

            {booking && (
              <button
                type="button"
                onClick={() => void openCompleteModal()}
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                disabled={busy}
              >
                Complete Job
              </button>
            )}
          </div>
        }
      >
        {detailErr ? (
          <div
            className="rounded-xl border p-3 text-sm"
            style={{ borderColor: "rgb(239 68 68 / 0.75)", background: "rgb(127 29 29 / 0.16)" }}
          >
            {detailErr}
          </div>
        ) : null}

        {loading ? (
          <div
            className="rounded-2xl border p-4 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
          >
            Loading…
          </div>
        ) : booking ? (
          <BookingInfoCard booking={booking} />
        ) : null}
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
          locked={msgLocked}
          lockedMessage={
            msgLocked ? "You’re no longer part of this booking chat (it may have been reassigned)." : undefined
          }
        />
      </SectionCard>

      <CompleteWithPriceModal
        open={modalOpen}
        busy={busy}
        bookingId={bookingId}
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