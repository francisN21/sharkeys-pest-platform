"use client";

import { useEffect, useMemo, useState } from "react";
import { assignBookingAdmin, getAdminTechBookings, type AdminTechBookingsResponse, type TechBookingRow, type TechRow } from "../../../lib/api/adminTechBookings";

function fmtRange(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `${startsAt} → ${endsAt}`;
  const date = s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const start = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const end = e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} • ${start}–${end}`;
}

function normalizeText(v: unknown) {
  const s = String(v ?? "").trim();
  return s.length ? s : "—";
}

function fullName(t: TechRow) {
  const first = (t.first_name ?? "").trim();
  const last = (t.last_name ?? "").trim();
  const name = `${first} ${last}`.trim();
  return name || t.email || "Technician";
}

export default function TechBookingsPage() {
  const [data, setData] = useState<AdminTechBookingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // per-booking UI state
  const [reassignTo, setReassignTo] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  async function refresh() {
    const res = await getAdminTechBookings();
    setData(res);
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await getAdminTechBookings();
        if (!alive) return;
        setData(res);
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load technician bookings");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const techs = useMemo(() => data?.technicians ?? [], [data?.technicians]);
  const allTechOptions = useMemo(() => techs.map((t) => ({ id: String(t.user_id), label: fullName(t) })), [techs]);

  async function onReassign(bookingPublicId: string) {
    const workerUserId = reassignTo[bookingPublicId];
    if (!workerUserId) {
      setErr("Select a technician first.");
      return;
    }

    const ok = confirm("Re-assign this booking to the selected technician?");
    if (!ok) return;

    try {
      setSavingId(bookingPublicId);
      setErr(null);

      await assignBookingAdmin(bookingPublicId, workerUserId);
      await refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to re-assign booking");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
        Loading technician bookings…
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
        {err}
      </div>
    );
  }

  if (!techs.length) {
    return (
      <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
        No technicians found.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Technician Bookings</h2>
        <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
          View assigned appointments per technician and re-assign in emergencies.
        </p>
      </div>

      <div className="space-y-4">
        {techs.map((t) => (
          <TechSection
            key={String(t.user_id)}
            tech={t}
            allTechOptions={allTechOptions}
            reassignTo={reassignTo}
            setReassignTo={setReassignTo}
            onReassign={onReassign}
            savingId={savingId}
          />
        ))}
      </div>
    </div>
  );
}

function TechSection({
  tech,
  allTechOptions,
  reassignTo,
  setReassignTo,
  onReassign,
  savingId,
}: {
  tech: TechRow;
  allTechOptions: Array<{ id: string; label: string }>;
  reassignTo: Record<string, string>;
  setReassignTo: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onReassign: (bookingPublicId: string) => void;
  savingId: string | null;
}) {
  const bookings: TechBookingRow[] = tech.bookings ?? [];

  return (
    <section
      className="rounded-2xl border p-5 space-y-4"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.12)" }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-base font-semibold truncate">{fullName(tech)}</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            {normalizeText(tech.phone)} • {normalizeText(tech.email)}
          </div>
        </div>

        <span className="rounded-full border px-2 py-1 text-xs self-start" style={{ borderColor: "rgb(var(--border))" }}>
          Assigned: {bookings.length}
        </span>
      </div>

      {bookings.length === 0 ? (
        <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
          No assigned bookings.
        </div>
      ) : (
        <div className="grid gap-3">
          {bookings.map((b) => (
            <BookingCardForTech
              key={b.public_id}
              b={b}
              allTechOptions={allTechOptions}
              selected={reassignTo[b.public_id] ?? ""}
              setSelected={(v) => setReassignTo((prev) => ({ ...prev, [b.public_id]: v }))}
              onReassign={() => onReassign(b.public_id)}
              saving={savingId === b.public_id}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function BookingCardForTech({
  b,
  allTechOptions,
  selected,
  setSelected,
  onReassign,
  saving,
}: {
  b: TechBookingRow;
  allTechOptions: Array<{ id: string; label: string }>;
  selected: string;
  setSelected: (v: string) => void;
  onReassign: () => void;
  saving: boolean;
}) {
  const customerName = normalizeText(b.customer_name ?? b.customer_email ?? "");
  const acctType = normalizeText(b.customer_account_type ?? "");
  const notes = (b.notes ?? "").trim();

  return (
    <div className="rounded-2xl border p-4 space-y-2" style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{normalizeText(b.service_title)}</div>
          <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
            {fmtRange(b.starts_at, b.ends_at)}
          </div>
          <div className="mt-1 text-sm truncate" style={{ color: "rgb(var(--muted))" }}>
            {normalizeText(b.address)}
          </div>

          <div className="mt-2 text-sm">
            <span className="font-semibold">{customerName}</span>{" "}
            <span style={{ color: "rgb(var(--muted))" }}>
              ({acctType})
            </span>
          </div>

          <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
            Phone: {normalizeText(b.customer_phone)} • Email: {normalizeText(b.customer_email)}
          </div>
        </div>

        <span className="rounded-full border px-2 py-1 text-xs" style={{ borderColor: "rgb(var(--border))" }}>
          Assigned
        </span>
      </div>

      {/* Notes (always visible) */}
      <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}>
        <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
          Notes:
        </div>
        <div className="mt-1 whitespace-pre-wrap break-words">{notes.length ? notes : "—"}</div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
          Booking ID: <span className="font-mono">{b.public_id}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
            disabled={saving}
            title="Select technician to re-assign"
          >
            <option value="">Re-assign to…</option>
            {allTechOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onReassign}
            className="rounded-lg border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.20)" }}
            disabled={saving || !selected}
            title={!selected ? "Select a technician first" : "Re-assign booking"}
          >
            {saving ? "Re-assigning…" : "Re-assign"}
          </button>
        </div>
      </div>
    </div>
  );
}