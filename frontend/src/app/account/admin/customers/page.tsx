"use client";

import { useEffect, useMemo, useState } from "react";
import {
  adminListCustomers,
  adminGetCustomerDetail,
  adminSetCustomerTag,
  type AdminCustomerRow,
  type AdminCustomerDetailResponse,
  type AdminCustomerKind,
  type AdminCustomerBookingRow,
} from "../../../../lib/api/adminCustomers";

function formatCreated(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

function formatRange(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return `${startsAt} → ${endsAt}`;
  const date = s.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const start = s.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const end = e.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} • ${start}–${end}`;
}

function displayName(c: { first_name: string | null; last_name: string | null; email?: string | null }) {
  const fn = (c.first_name ?? "").trim();
  const ln = (c.last_name ?? "").trim();
  const name = [fn, ln].filter(Boolean).join(" ");
  return name || (c.email ?? "—") || "—";
}

function KindPill({ kind }: { kind: AdminCustomerKind }) {
  const isLead = kind === "lead";
  return (
    <span
      className="rounded-full border px-2 py-1 text-xs font-semibold"
      style={{
        borderColor: "rgb(var(--border))",
        background: isLead ? "rgba(245, 158, 11, 0.18)" : "rgba(var(--bg), 0.20)",
      }}
      title={isLead ? "Unregistered lead" : "Registered customer"}
    >
      {isLead ? "Lead" : "Registered"}
    </span>
  );
}

function BookingCard({ b }: { b: AdminCustomerBookingRow }) {
  return (
    <div className="rounded-2xl border p-4 space-y-2" style={{ borderColor: "rgb(var(--border))" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{b.service_title}</div>
          <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
            {formatRange(b.starts_at, b.ends_at)}
          </div>
          <div className="mt-2 text-sm" style={{ color: "rgb(var(--muted))" }}>
            Location: {b.address || "—"}
          </div>
          <div className="mt-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
            Booking ID: <span className="font-mono">{b.public_id}</span>
          </div>
          <div className="mt-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
            Created: {formatCreated(b.created_at)}
          </div>
          {b.notes ? (
            <div
              className="mt-2 rounded-xl border p-3 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            >
              <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                Notes:
              </div>
              <div className="mt-1 whitespace-pre-wrap break-words">{b.notes}</div>
            </div>
          ) : null}
        </div>

        <span className="rounded-full border px-2 py-1 text-xs" style={{ borderColor: "rgb(var(--border))" }}>
          {b.status}
        </span>
      </div>
    </div>
  );
}

export default function AdminCustomersPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<AdminCustomerRow[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(30);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [qInput, setQInput] = useState("");
  const [qApplied, setQApplied] = useState("");

  // view state
  const [view, setView] = useState<"list" | "detail">("list");
  const [selected, setSelected] = useState<{ kind: AdminCustomerKind; public_id: string } | null>(null);
  const [detail, setDetail] = useState<AdminCustomerDetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // tag editing
  const [tagValue, setTagValue] = useState<string>(""); // "" => none
  const [tagNote, setTagNote] = useState<string>("");
  const [tagBusy, setTagBusy] = useState(false);

  async function refresh(opts?: { page?: number; q?: string }) {
    const nextPage = opts?.page ?? page;
    const nextQ = opts?.q ?? qApplied;

    const res = await adminListCustomers({ page: nextPage, pageSize, q: nextQ || undefined });

    setRows(res.customers || []);
    setPage(res.page || nextPage);
    setTotal(res.total || 0);
    setTotalPages(res.totalPages || 1);
  }

  async function openDetail(kind: AdminCustomerKind, publicId: string) {
    setErr(null);
    setView("detail");
    setSelected({ kind, public_id: publicId });
    setDetail(null);
    setDetailLoading(true);

    try {
      const d = await adminGetCustomerDetail(kind, publicId);
      setDetail(d);

      // initialize tag controls
      setTagValue(d.tag?.tag ?? "");
      setTagNote(d.tag?.note ?? "");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load customer detail");
    } finally {
      setDetailLoading(false);
    }
  }

  function backToList() {
    setView("list");
    setSelected(null);
    setDetail(null);
    setTagValue("");
    setTagNote("");
  }

  async function saveTag() {
    if (!selected) return;
    try {
      setTagBusy(true);
      setErr(null);
      await adminSetCustomerTag(selected.kind, selected.public_id, tagValue ? tagValue : null, tagNote ? tagNote : null);

      // refresh detail tag
      const d = await adminGetCustomerDetail(selected.kind, selected.public_id);
      setDetail(d);
      setTagValue(d.tag?.tag ?? "");
      setTagNote(d.tag?.note ?? "");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save tag");
    } finally {
      setTagBusy(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        await refresh({ page: 1 });
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load customers");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canPrev = page > 1;
  const canNext = page < totalPages;
  const sorted = useMemo(() => rows, [rows]);

  /* -------------------------
     DETAIL VIEW
  -------------------------- */
  if (view === "detail") {
    const c = detail?.customer ?? null;

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <button
              type="button"
              onClick={backToList}
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
            >
              ← Back to Customers
            </button>

            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{c ? displayName(c) : "Customer"}</h2>
              {c ? <KindPill kind={c.kind} /> : null}
            </div>

            <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
              Customer profile, tag, lifetime value, and full booking history.
            </p>
          </div>

          <button
            type="button"
            onClick={() => selected && openDetail(selected.kind, selected.public_id)}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            disabled={detailLoading || !selected}
          >
            Refresh
          </button>
        </div>

        {err ? (
          <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
            {err}
          </div>
        ) : null}

        {detailLoading ? (
          <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
            Loading…
          </div>
        ) : null}

        {!detailLoading && detail && c ? (
          <>
            {/* Profile + Tag */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border p-4 space-y-2" style={{ borderColor: "rgb(var(--border))" }}>
                <div className="text-sm font-semibold">Profile</div>

                <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                  Email: {c.email || "—"} • Phone: {c.phone || "—"}
                </div>
                <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                  Address: {c.address || "—"}
                </div>
                <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                  Account type: {c.account_type || "—"}
                </div>
                <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                  {c.kind === "lead" ? "Lead ID" : "Customer ID"}: <span className="font-mono">{c.public_id}</span>
                </div>
                <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                  Created: {formatCreated(c.created_at)}
                </div>
              </div>

              <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "rgb(var(--border))" }}>
                <div className="text-sm font-semibold">Tag</div>

                <div className="grid gap-2">
                  <select
                    value={tagValue}
                    onChange={(e) => setTagValue(e.target.value)}
                    className="rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                    disabled={tagBusy}
                  >
                    <option value="">None</option>
                    <option value="regular">Regular</option>
                    <option value="good">Good</option>
                    <option value="bad">Bad</option>
                    <option value="vip">VIP</option>
                  </select>

                  <textarea
                    value={tagNote}
                    onChange={(e) => setTagNote(e.target.value)}
                    placeholder="Optional note (visible to admins)…"
                    className="rounded-lg border px-3 py-2 text-sm"
                    style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                    rows={3}
                    disabled={tagBusy}
                  />

                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                      Last updated: {detail.tag?.updated_at ? formatCreated(detail.tag.updated_at) : "—"}
                    </div>

                    <button
                      type="button"
                      onClick={saveTag}
                      disabled={tagBusy}
                      className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                      style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                    >
                      {tagBusy ? "Saving…" : "Save Tag"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div
              className="rounded-2xl border p-4 space-y-2"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.15)" }}
            >
              <div className="text-sm font-semibold">Summary</div>

              <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                In-progress: <span className="font-semibold">{detail.summary.counts.in_progress}</span> • Completed:{" "}
                <span className="font-semibold">{detail.summary.counts.completed}</span> • Cancelled:{" "}
                <span className="font-semibold">{detail.summary.counts.cancelled}</span>
              </div>

              <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                Lifetime value: <span className="font-semibold">${detail.summary.lifetime_value.toFixed(2)}</span>{" "}
                <span className="text-xs">(will reflect pricing once booking totals exist)</span>
              </div>
            </div>

            {/* Bookings grouped */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">In-Progress Bookings</h3>
                  <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                    pending • accepted • assigned
                  </div>
                </div>
                {detail.bookings.in_progress.length === 0 ? (
                  <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
                    No in-progress bookings.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {detail.bookings.in_progress.map((b) => (
                      <BookingCard key={b.public_id} b={b} />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold">Completed Bookings</h3>
                {detail.bookings.completed.length === 0 ? (
                  <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
                    No completed bookings.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {detail.bookings.completed.map((b) => (
                      <BookingCard key={b.public_id} b={b} />
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-semibold">Cancelled Bookings</h3>
                {detail.bookings.cancelled.length === 0 ? (
                  <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
                    No cancelled bookings.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {detail.bookings.cancelled.map((b) => (
                      <BookingCard key={b.public_id} b={b} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  /* -------------------------
     LIST VIEW (existing)
  -------------------------- */

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Customers</h2>
          <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Registered customers and leads. Click a card to open the customer record.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refresh({ page: 1 })}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "rgb(var(--border))" }}>
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search name, email, phone, address…"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          />
          <button
            type="button"
            onClick={async () => {
              const next = qInput.trim();
              setQApplied(next);
              setPage(1);
              await refresh({ page: 1, q: next });
            }}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            Go
          </button>

          <button
            type="button"
            onClick={async () => {
              setQInput("");
              setQApplied("");
              setPage(1);
              await refresh({ page: 1, q: "" });
            }}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
          >
            Clear
          </button>
        </div>

        <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
          Showing {sorted.length} of {total} • Page {page}/{totalPages}
          {qApplied ? ` • Search: “${qApplied}”` : ""}
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
          <div className="font-semibold">No customers found</div>
          <div style={{ color: "rgb(var(--muted))" }}>Try clearing search.</div>
        </div>
      ) : null}

      {!loading && sorted.length > 0 ? (
        <section className="space-y-3">
          <div className="grid gap-3">
            {sorted.map((c) => (
              <button
                key={`${c.kind}:${c.public_id}`}
                type="button"
                onClick={() => openDetail(c.kind, c.public_id)}
                className="text-left rounded-2xl border p-4 space-y-3 hover:opacity-95"
                style={{ borderColor: "rgb(var(--border))" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">
                      {displayName(c)}
                      <span className="ml-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
                        ({c.account_type || "—"})
                      </span>
                    </div>

                    <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
                      Phone: {c.phone || "—"} • Email: {c.email || "—"}
                    </div>

                    <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
                      Location: {c.address || "—"}
                    </div>

                    <div className="mt-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
                      {c.kind === "lead" ? "Lead ID" : "Customer ID"}:{" "}
                      <span className="font-mono">{c.public_id}</span>
                    </div>

                    <div className="mt-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
                      Created: {formatCreated(c.created_at)}
                    </div>

                    <div
                      className="mt-2 rounded-xl border p-3 text-sm"
                      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                    >
                      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                        Booking Summary:
                      </div>
                      <div className="mt-1 space-y-1">
                        <div>
                          Open Bookings: <span className="font-semibold">{c.open_bookings}</span>
                        </div>
                        <div>
                          Total completed bookings: <span className="font-semibold">{c.completed_bookings}</span>
                        </div>
                        <div>
                          Cancelled Bookings: <span className="font-semibold">{c.cancelled_bookings}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <KindPill kind={c.kind} />
                </div>
              </button>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={async () => {
                  if (!canPrev) return;
                  const nextPage = page - 1;
                  setPage(nextPage);
                  await refresh({ page: nextPage });
                }}
                disabled={!canPrev}
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
              >
                Prev
              </button>

              <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                Page {page} of {totalPages}
              </div>

              <button
                type="button"
                onClick={async () => {
                  if (!canNext) return;
                  const nextPage = page + 1;
                  setPage(nextPage);
                  await refresh({ page: nextPage });
                }}
                disabled={!canNext}
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