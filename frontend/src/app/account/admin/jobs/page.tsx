"use client";

import { useEffect, useMemo, useState } from "react";
import {
  adminAcceptBooking,
  adminCancelBooking,
  getAdminBookings,
  type AdminBookingRow,
  adminListTechnicians,
  adminAssignBooking,
  type TechnicianRow,
} from "../../../../lib/api/adminBookings";

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

function formatNotes(notes: string | null) {
  const n = (notes ?? "").trim();
  return n.length ? n : null;
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

export default function AdminJobsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Pending + Accepted sections
  const [pendingRows, setPendingRows] = useState<AdminBookingRow[]>([]);
  const [acceptedRows, setAcceptedRows] = useState<AdminBookingRow[]>([]);

  const [busyId, setBusyId] = useState<string | null>(null);

  // sort toggle: created vs scheduled
  const [sortBy, setSortBy] = useState<"created" | "scheduled">("created");

  // technicians for dropdown
  const [techs, setTechs] = useState<TechnicianRow[]>([]);
  const [selectedTech, setSelectedTech] = useState<Record<string, number | "">>({});

  async function refresh() {
    const [p, a] = await Promise.all([getAdminBookings("pending"), getAdminBookings("accepted")]);
    setPendingRows(p.bookings || []);
    setAcceptedRows(a.bookings || []);
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // load tech list + both booking lists
        const [t] = await Promise.all([adminListTechnicians()]);
        if (!alive) return;

        setTechs(t.technicians || []);
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

  const sortedPending = useMemo(() => {
    const copy = [...pendingRows];
    copy.sort((a, b) => {
      const aKey = sortBy === "created" ? a.created_at : a.starts_at;
      const bKey = sortBy === "created" ? b.created_at : b.starts_at;
      const at = new Date(aKey).getTime();
      const bt = new Date(bKey).getTime();
      return bt - at; // newest first
    });
    return copy;
  }, [pendingRows, sortBy]);

  const sortedAccepted = useMemo(() => {
    const copy = [...acceptedRows];
    copy.sort((a, b) => {
      const aKey = sortBy === "created" ? a.created_at : a.starts_at;
      const bKey = sortBy === "created" ? b.created_at : b.starts_at;
      const at = new Date(aKey).getTime();
      const bt = new Date(bKey).getTime();
      return bt - at; // newest first
    });
    return copy;
  }, [acceptedRows, sortBy]);

  async function onAccept(publicId: string) {
    const ok = confirm("Accept this booking?");
    if (!ok) return;

    try {
      setBusyId(publicId);
      setErr(null);

      await adminAcceptBooking(publicId);
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to accept booking");
    } finally {
      setBusyId(null);
    }
  }

  async function onCancel(publicId: string) {
    const ok = confirm(
      "Cancel (delete) this booking?\n\nThis will mark it as cancelled (recommended) instead of hard deleting."
    );
    if (!ok) return;

    try {
      setBusyId(publicId);
      setErr(null);

      await adminCancelBooking(publicId);
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to cancel booking");
    } finally {
      setBusyId(null);
    }
  }

  async function onAssign(publicId: string) {
    const workerUserIdStr = selectedTech[publicId] ?? "";
    if (!workerUserIdStr) {
      setErr("Select a technician first.");
      return;
    }

    const workerUserId = Number(workerUserIdStr);
    if (!Number.isFinite(workerUserId) || workerUserId <= 0) {
      setErr("Invalid technician selected.");
      return;
    }

    try {
      setBusyId(publicId);
      setErr(null);

      await adminAssignBooking(publicId, workerUserId);
      await refresh();

      setSelectedTech((prev) => ({ ...prev, [publicId]: "" }));
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to assign technician");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Jobs</h2>
          <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Pending customer bookings. Accept or cancel. Accepted bookings can be assigned to a technician.
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
              setSortBy(v === "scheduled" ? "scheduled" : "created");
            }}
            className="rounded-lg border px-2 py-1 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            <option value="created">Created</option>
            <option value="scheduled">Scheduled</option>
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

      {/* ======================
          Pending section
         ====================== */}
      {!loading && sortedPending.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm space-y-2" style={{ borderColor: "rgb(var(--border))" }}>
          <div className="font-semibold">No pending bookings</div>
          <div style={{ color: "rgb(var(--muted))" }}>When customers book services, they’ll appear here.</div>
        </div>
      ) : null}

      {!loading && sortedPending.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Pending</h3>

          <div className="grid gap-3">
            {sortedPending.map((b) => {
              const busy = busyId === b.public_id;
              const notes = formatNotes(b.notes); // ✅ only change

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
                      Pending
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onCancel(b.public_id)}
                      disabled={busy}
                      className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                      title="Cancel booking"
                    >
                      {busy ? "Working…" : "Delete"}
                    </button>

                    <button
                      type="button"
                      onClick={() => onAccept(b.public_id)}
                      disabled={busy}
                      className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                      style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                      title="Accept booking"
                    >
                      {busy ? "Working…" : "Accept"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ======================
          Accepted section
         ====================== */}
      {!loading ? (
        <section className="space-y-3">
          <h3 className="text-base font-semibold">Accepted (Assign technician)</h3>

          {sortedAccepted.length === 0 ? (
            <div className="rounded-2xl border p-6 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
              <div className="font-semibold">No accepted bookings</div>
              <div className="mt-1" style={{ color: "rgb(var(--muted))" }}>
                Accepted bookings will appear here until assigned to a technician.
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {sortedAccepted.map((b) => {
                const busy = busyId === b.public_id;
                const notes = formatNotes(b.notes); // ✅ only change

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
                        Accepted
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <select
                        className="rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                        value={selectedTech[b.public_id] ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSelectedTech((prev) => ({ ...prev, [b.public_id]: v ? Number(v) : "" }));
                        }}
                        disabled={busy}
                      >
                        <option value="">Select technician…</option>
                        {techs.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.last_name}, {t.first_name}
                            {t.phone ? ` • ${t.phone}` : ""}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => onAssign(b.public_id)}
                        disabled={busy}
                        className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                        style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                        title="Assign selected technician"
                      >
                        {busy ? "Working…" : "Assign"}
                      </button>

                      <button
                        type="button"
                        onClick={() => onCancel(b.public_id)}
                        disabled={busy}
                        className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                        style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                        title="Cancel booking"
                      >
                        {busy ? "Working…" : "Cancel"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}