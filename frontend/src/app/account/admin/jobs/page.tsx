"use client";

import { useEffect, useMemo, useState } from "react";
import { adminAcceptBooking, adminCancelBooking, getAdminBookings, type AdminBookingRow } from "../../../../lib/api/adminBookings";

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

export default function AdminJobsPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<AdminBookingRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  // sort toggle: created vs scheduled
  const [sortBy, setSortBy] = useState<"created" | "scheduled">("created");

  async function refresh() {
    const res = await getAdminBookings("pending");
    setRows(res.bookings || []);
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await getAdminBookings("pending");
        if (!alive) return;

        setRows(res.bookings || []);
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

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const aKey = sortBy === "created" ? a.created_at : a.starts_at;
      const bKey = sortBy === "created" ? b.created_at : b.starts_at;
      const at = new Date(aKey).getTime();
      const bt = new Date(bKey).getTime();
      return bt - at; // newest first
    });
    return copy;
  }, [rows, sortBy]);

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
    const ok = confirm("Cancel (delete) this booking?\n\nThis will mark it as cancelled (recommended) instead of hard deleting.");
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

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Jobs</h2>
          <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Pending customer bookings. Accept or cancel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs" style={{ color: "rgb(var(--muted))" }}>
            Sort by
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="rounded-lg border px-2 py-1 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            <option value="created">Created</option>
            <option value="scheduled">Scheduled</option>
          </select>

          <button
            type="button"
            onClick={() => refresh()}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
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

      {!loading && sorted.length === 0 ? (
        <div className="rounded-2xl border p-6 text-sm space-y-2" style={{ borderColor: "rgb(var(--border))" }}>
          <div className="font-semibold">No pending bookings</div>
          <div style={{ color: "rgb(var(--muted))" }}>When customers book services, they’ll appear here.</div>
        </div>
      ) : null}

      {!loading && sorted.length > 0 ? (
        <div className="grid gap-3">
          {sorted.map((b) => {
            const busy = busyId === b.public_id;

            return (
              <div key={b.public_id} className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "rgb(var(--border))" }}>
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
                      Booking ID: <span className="font-mono">{b.public_id}</span> • Created: {formatCreated(b.created_at)}
                    </div>
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
      ) : null}
    </div>
  );
}