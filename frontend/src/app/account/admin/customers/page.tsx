"use client";

import { useEffect, useMemo, useState } from "react";
import { adminListCustomers, type AdminCustomerRow } from "../../../../lib/api/adminCustomers";

function formatCreated(ts: string) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

function displayName(c: AdminCustomerRow) {
  const fn = (c.first_name ?? "").trim();
  const ln = (c.last_name ?? "").trim();
  const name = [fn, ln].filter(Boolean).join(" ");
  return name || "—";
}

export default function AdminCustomersPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [rows, setRows] = useState<AdminCustomerRow[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize] = useState(30); // keep simple like you asked
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [qInput, setQInput] = useState("");
  const [qApplied, setQApplied] = useState("");

  async function refresh(opts?: { page?: number; q?: string }) {
    const nextPage = opts?.page ?? page;
    const nextQ = opts?.q ?? qApplied;

    const res = await adminListCustomers({ page: nextPage, pageSize, q: nextQ || undefined });

    setRows(res.customers || []);
    setPage(res.page || nextPage);
    setTotal(res.total || 0);
    setTotalPages(res.totalPages || 1);
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Customers</h2>
          <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Customer-only accounts (excludes admin/technician). Includes booking counts.
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
              <div
                key={c.public_id}
                className="rounded-2xl border p-4 space-y-3"
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
                      Phone: {c.phone || "—"} • Email: {c.email}
                    </div>

                    <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
                      Location: {c.address || "—"}
                    </div>

                    <div className="mt-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
                      Customer ID: <span className="font-mono">{c.public_id}</span>
                    </div>

                    <div className="mt-2 text-xs" style={{ color: "rgb(var(--muted))" }}>
                      Created: {formatCreated(c.created_at)}
                    </div>

                    {/* Stats box (same style as notes/metadata blocks) */}
                    <div
                      className="mt-2 rounded-xl border p-3 text-sm"
                      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                    >
                      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                        Booking Summary:
                      </div>
                      <div className="mt-1 space-y-1">
                        <div>Open Bookings: <span className="font-semibold">{c.open_bookings}</span></div>
                        <div>Total completed bookings: <span className="font-semibold">{c.completed_bookings}</span></div>
                        <div>Cancelled Bookings: <span className="font-semibold">{c.cancelled_bookings}</span></div>
                      </div>
                    </div>
                  </div>

                  <span className="rounded-full border px-2 py-1 text-xs" style={{ borderColor: "rgb(var(--border))" }}>
                    Customer
                  </span>
                </div>
              </div>
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