"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { WorkerBookingRow } from "../../../lib/api/workerBookings";
import {
  workerCompleteBooking,
  workerListAssignedBookings,
  workerListJobHistory,
} from "../../../lib/api/workerBookings";
import { sendBookingMessage } from "../../../lib/api/messages";
import CompleteWithPriceModal, {
  dollarsStringFromCents,
  parseDollarInputToCents,
} from "../../../app/account/technician/CompleteWithPriceModal";

import type { GroupKey } from "./types";
import { buildAssignedGroups, fmtMoneyFromCents, fmtNum, getErrorMessage } from "./helpers";
import { getBookingPrice, setFinalPrice } from "./api";
import JobGroupSection from "./components/JobGroupSection";
import HistoryBookingCard from "./components/HistoryBookingCard";

const HISTORY_PAGE_SIZE = 30;

export default function WorkerJobsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [tab, setTab] = useState<"assigned" | "history">("assigned");

  const [assignedRows, setAssignedRows] = useState<WorkerBookingRow[]>([]);
  const [historyRows, setHistoryRows] = useState<WorkerBookingRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<"created" | "scheduled">("scheduled");

  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalBookingId, setModalBookingId] = useState<string | null>(null);
  const [modalBookingTitle, setModalBookingTitle] = useState<string | null>(null);
  const [, setModalInitialPriceCents] = useState<number | null>(null);
  const [modalPriceLoading, setModalPriceLoading] = useState(false);
  const [modalPriceInput, setModalPriceInput] = useState("");
  const [modalPriceTouched, setModalPriceTouched] = useState(false);

  const [assignedExpanded, setAssignedExpanded] = useState<Record<GroupKey, boolean>>({
    needs_attention: true,
    starting_soon: true,
    today: true,
    tomorrow: false,
    this_week: false,
    later: false,
  });

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
      } catch (error: unknown) {
        setErr((prev) => prev ?? getErrorMessage(error, "Completed, but failed to post completion message in chat."));
      }

      await refresh({ historyPage: 1 });
      closeModal();
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
      } catch (error: unknown) {
        if (!alive) return;
        setErr(getErrorMessage(error, "Failed to load jobs"));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (tab !== "history") return;
    refresh().catch((error: unknown) => {
      setErr(getErrorMessage(error, "Failed to load history"));
    });
  }, [tab]);

  const assignedGroups = useMemo(() => buildAssignedGroups(assignedRows), [assignedRows]);

  useEffect(() => {
    setAssignedExpanded((prev) => {
      const next = { ...prev };
      for (const g of assignedGroups) {
        if (!(g.key in next)) next[g.key] = g.defaultExpanded;
      }
      return next;
    });
  }, [assignedGroups]);

  const sortedHistory = useMemo(() => {
    const copy = [...historyRows];
    copy.sort((a, b) => {
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return sortBy === "scheduled"
        ? new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
        : bt - at;
    });
    return copy;
  }, [historyRows, sortBy]);

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

  return (
    <div className="space-y-4 sm:space-y-6">
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Jobs</h2>
          <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Assigned jobs require a final price before you can complete them. Completed jobs appear in Job History.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
              className="rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            >
              <option value="scheduled">Scheduled</option>
              <option value="created">Created</option>
            </select>
          </div>

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
      ) : null}

      {!loading && tab === "assigned" ? (
        assignedGroups.every((g) => g.rows.length === 0) ? (
          <div
            className="rounded-2xl border p-6 text-sm space-y-2"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
          >
            <div className="font-semibold">No assigned jobs</div>
            <div style={{ color: "rgb(var(--muted))" }}>
              When an admin assigns you a booking, it will appear here.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {assignedGroups.map((group) => (
              <JobGroupSection
                key={group.key}
                group={group}
                expanded={assignedExpanded[group.key] ?? group.defaultExpanded}
                busyId={busyId}
                onToggle={() =>
                  setAssignedExpanded((prev) => ({
                    ...prev,
                    [group.key]: !(prev[group.key] ?? group.defaultExpanded),
                  }))
                }
                onOpenDetail={(publicId) => router.push(`/account/technician/bookings/${publicId}`)}
                onOpenComplete={openCompleteModal}
              />
            ))}
          </div>
        )
      ) : null}

      {!loading && tab === "history" ? (
        sortedHistory.length === 0 ? (
          <div
            className="rounded-2xl border p-6 text-sm space-y-2"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
          >
            <div className="font-semibold">No job history</div>
            <div style={{ color: "rgb(var(--muted))" }}>
              Completed jobs will appear here after you complete them.
            </div>
          </div>
        ) : (
          <section className="space-y-3">
            <div className="grid gap-3">
              {sortedHistory.map((b) => (
                <HistoryBookingCard
                  key={b.public_id}
                  booking={b}
                  busyId={busyId}
                  onOpenDetail={(publicId) => router.push(`/account/technician/bookings/${publicId}`)}
                />
              ))}
            </div>

            {historyTotalPages > 1 ? (
              <div className="flex items-center justify-between gap-2 pt-2">
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

                <div className="text-center text-xs" style={{ color: "rgb(var(--muted))" }}>
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
        )
      ) : null}
    </div>
  );
}