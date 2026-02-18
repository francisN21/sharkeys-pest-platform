"use client";

import { useEffect, useMemo, useState } from "react";
import type { AdminBookingRow } from "../../../lib/api/adminBookings";
import {
  workerCompleteBooking,
  workerListAssignedBookings,
  workerListJobHistory,
} from "../../../lib/api/workerBookings";

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

function ConfirmWorkerActionModal({
  open,
  title,
  message,
  details,
  busy,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  details?: React.ReactNode;
  busy: boolean;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* overlay */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={onClose}
        disabled={busy}
      />

      {/* modal */}
      <div
        className="relative w-full max-w-md rounded-2xl border p-4 shadow-lg"
        style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold">{title}</div>
            <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
              {message}
            </div>
          </div>

          <button
            type="button"
            className="rounded-lg border px-2 py-1 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            onClick={onClose}
            disabled={busy}
            title="Close"
          >
            ✕
          </button>
        </div>

        {details ? (
          <div
            className="mt-3 rounded-xl border p-3 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
          >
            {details}
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            onClick={onClose}
            disabled={busy}
            title="Cancel"
          >
            {cancelLabel ?? "Cancel"}
          </button>

          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            onClick={onConfirm}
            disabled={busy}
            title={confirmLabel}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WorkerJobsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [tab, setTab] = useState<"assigned" | "history">("assigned");

  const [assignedRows, setAssignedRows] = useState<AdminBookingRow[]>([]);
  const [historyRows, setHistoryRows] = useState<AdminBookingRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<"created" | "scheduled">("scheduled");

  // ✅ pagination (history only)
  const HISTORY_PAGE_SIZE = 30;
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  // Modal state (replaces confirm())
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBookingId, setModalBookingId] = useState<string | null>(null);
  const [modalBookingTitle, setModalBookingTitle] = useState<string | null>(null);

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

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        await refresh({ historyPage: 1 });
        if (!alive) return;
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load jobs");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ when switching to history, load current page
  useEffect(() => {
    if (tab !== "history") return;
    // no need to setLoading global; keep it light
    refresh().catch((e: unknown) => {
      setErr(e instanceof Error ? e.message : "Failed to load history");
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
      return sortBy === "scheduled" ? at - bt : bt - at; // scheduled: soonest first
    });
    return copy;
  }, [assignedRows, sortBy]);

  // History is already ordered by backend (completed_at DESC), but keep your existing sort behavior if you want:
  const sortedHistory = useMemo(() => {
    const copy = [...historyRows];
    copy.sort((a, b) => {
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return bt - at;
    });
    return copy;
  }, [historyRows]);

  function findBookingTitle(publicId: string) {
    const all = [...assignedRows, ...historyRows];
    const found = all.find((x) => x.public_id === publicId);
    return found?.service_title ?? null;
  }

  function openCompleteModal(publicId: string) {
    setModalBookingId(publicId);
    setModalBookingTitle(findBookingTitle(publicId));
    setModalOpen(true);
  }

  function closeModal() {
    if (modalBookingId && busyId === modalBookingId) return;
    setModalOpen(false);
    setModalBookingId(null);
    setModalBookingTitle(null);
  }

  async function confirmComplete() {
    if (!modalBookingId) return;

    try {
      setBusyId(modalBookingId);
      setErr(null);

      await workerCompleteBooking(modalBookingId);

      // ✅ after completing, refresh assigned + history page 1
      await refresh({ historyPage: 1 });

      closeModal();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to complete job");
    } finally {
      setBusyId(null);
    }
  }

  const rows = tab === "assigned" ? sortedAssigned : sortedHistory;

  const canPrev = historyPage > 1;
  const canNext = historyPage < historyTotalPages;

  const modalBusy = !!modalBookingId && busyId === modalBookingId;

  return (
    <div className="space-y-6">
      {/* Modal replaces confirm() */}
      <ConfirmWorkerActionModal
        open={modalOpen}
        title="Mark this job as completed?"
        message="This will move it to Job History."
        busy={modalBusy}
        confirmLabel="Mark Completed"
        cancelLabel="Close"
        onConfirm={confirmComplete}
        onClose={closeModal}
        details={
          <div className="space-y-1">
            <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
              Booking
            </div>
            <div className="font-semibold truncate">{modalBookingTitle ?? "—"}</div>
            <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
              Booking ID: <span className="font-mono">{modalBookingId ?? "—"}</span>
            </div>
          </div>
        }
      />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Jobs</h2>
          <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Assigned jobs can be marked as completed. Completed jobs appear in Job History.
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

      {/* Tabs */}
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
              : "Completed jobs will appear here after you mark them completed."}
          </div>
        </div>
      ) : null}

      {!loading && rows.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">{tab === "assigned" ? "Assigned" : "Job History"}</h3>

            {/* ✅ History meta */}
            {tab === "history" ? (
              <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                Showing {historyRows.length} of {historyTotal} • Page {historyPage} / {historyTotalPages}
              </div>
            ) : null}
          </div>

          <div className="grid gap-3">
            {rows.map((b) => {
              const busy = busyId === b.public_id;
              const notes = formatNotes(b.notes);

              return (
                <div
                  key={b.public_id}
                  className="rounded-2xl border p-4 space-y-3"
                  style={{ borderColor: "rgb(var(--border))" }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{b.service_title}</div>
                      <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
                        {formatRange(b.starts_at, b.ends_at)}
                      </div>

                      <div className="mt-2 text-sm">
                        <div className="font-semibold">
                          {b.customer_first_name} {b.customer_last_name}
                          <span className="ml-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
                            ({b.customer_account_type || "—"})
                          </span>
                        </div>

                        <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                          Phone: {b.customer_phone || "—"} • Email: {b.customer_email}
                        </div>

                        <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                          Location: {b.address || b.customer_address || "—"}
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

                  {tab === "assigned" ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openCompleteModal(b.public_id)}
                        disabled={busy}
                        className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                        style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                        title="Mark as completed"
                      >
                        {busy ? "Working…" : "Mark Completed"}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* ✅ Pagination controls for history */}
          {tab === "history" && historyTotalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={async () => {
                  if (!canPrev) return;
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
                Page {historyPage} of {historyTotalPages}
              </div>

              <button
                type="button"
                onClick={async () => {
                  if (!canNext) return;
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