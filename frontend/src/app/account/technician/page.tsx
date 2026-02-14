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

export default function WorkerJobsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [tab, setTab] = useState<"assigned" | "history">("assigned");

  const [assignedRows, setAssignedRows] = useState<AdminBookingRow[]>([]);
  const [historyRows, setHistoryRows] = useState<AdminBookingRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<"created" | "scheduled">("scheduled");

  async function refresh() {
    const [a, h] = await Promise.all([workerListAssignedBookings(), workerListJobHistory()]);
    setAssignedRows(a.bookings || []);
    setHistoryRows(h.bookings || []);
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        await refresh();
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
  }, []);

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

  const sortedHistory = useMemo(() => {
    const copy = [...historyRows];
    copy.sort((a, b) => {
      // history: newest first (completed_at is not in AdminBookingRow UI currently, so keep it simple)
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return bt - at;
    });
    return copy;
  }, [historyRows]);

  async function onComplete(publicId: string) {
    const ok = confirm("Mark this job as completed?");
    if (!ok) return;

    try {
      setBusyId(publicId);
      setErr(null);
      await workerCompleteBooking(publicId);
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to complete job");
    } finally {
      setBusyId(null);
    }
  }

  const rows = tab === "assigned" ? sortedAssigned : sortedHistory;

  return (
    <div className="space-y-6">
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
          <h3 className="text-base font-semibold">{tab === "assigned" ? "Assigned" : "Job History"}</h3>

          <div className="grid gap-3">
            {rows.map((b) => {
              const busy = busyId === b.public_id;

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

                      {formatNotes(b.notes) ? (
                        <div
                          className="mt-2 rounded-xl border p-3 text-sm"
                          style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                        >
                          <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                            Customer Notes:
                          </div>
                          <div className="mt-1 whitespace-pre-wrap break-words">{b.notes}</div>
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
                        onClick={() => onComplete(b.public_id)}
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
        </section>
      ) : null}
    </div>
  );
}