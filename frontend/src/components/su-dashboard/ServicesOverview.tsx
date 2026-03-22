// frontend/src/components/su-dashboard/ServicesOverview.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, Plus, X } from "lucide-react";
import {
  createOwnerService,
  getOwnerServices,
  updateOwnerService,
  deleteOwnerService,
  type Service,
} from "../../lib/api/adminServices";

function minutesLabel(m?: number | null) {
  if (!m) return "—";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

function digitsOnly(v: string) {
  return v.replace(/[^\d]/g, "");
}

function centsLabel(cents?: number | null) {
  const n = typeof cents === "number" && Number.isFinite(cents) ? cents : 0;
  return `$${(n / 100).toFixed(2)}`;
}

export default function ServicesOverview() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDuration, setNewDuration] = useState<string>("");
  const [newBasePrice, setNewBasePrice] = useState<string>("");

  const [editId, setEditId] = useState<string | null>(null);
  const editing = useMemo(() => services.find((s) => s.public_id === editId) || null, [editId, services]);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDuration, setEditDuration] = useState<string>("");
  const [editBasePrice, setEditBasePrice] = useState<string>("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    setErr(null);
    try {
      const res = await getOwnerServices();
      setServices(res?.services ?? []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to load services");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    if (!editing) return;
    setEditTitle(editing.title ?? "");
    setEditDesc(editing.description ?? "");
    setEditDuration(typeof editing.duration_minutes === "number" ? String(editing.duration_minutes) : "");
    setEditBasePrice(typeof editing.base_price_cents === "number" ? String(editing.base_price_cents) : "");
  }, [editing]);

  async function onCreate() {
    setErr(null);
    const title = newTitle.trim();
    const description = newDesc.trim();
    const dur = newDuration.trim() === "" ? null : Number.isFinite(Number(newDuration)) ? Number(newDuration) : NaN;
    const priceStr = newBasePrice.trim();
    const priceCents = priceStr === "" ? undefined : Number.isFinite(Number(priceStr)) ? Number(priceStr) : NaN;
    if (!title) return setErr("Title is required.");
    if (!description) return setErr("Description is required.");
    if (dur !== null && (!Number.isInteger(dur) || dur <= 0)) return setErr("Duration must be a positive whole number of minutes (or blank).");
    if (typeof priceCents !== "undefined" && (!Number.isInteger(priceCents) || priceCents < 0)) return setErr("Base price must be a whole number of cents (0 or more), or blank.");
    setSavingId("__create__");
    try {
      const res = await createOwnerService({ title, description, duration_minutes: dur, ...(typeof priceCents === "number" ? { base_price_cents: priceCents } : {}) });
      setServices((prev) => [res.service, ...prev]);
      setNewTitle(""); setNewDesc(""); setNewDuration(""); setNewBasePrice("");
      setAddOpen(false);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to create service");
    } finally {
      setSavingId(null);
    }
  }

  async function onConfirmDelete() {
    if (!editing) return;
    setErr(null);
    setSavingId(`__delete__:${editing.public_id}`);
    try {
      await deleteOwnerService(editing.public_id);
      setServices((prev) => prev.filter((s) => s.public_id !== editing.public_id));
      setConfirmDeleteOpen(false);
      setEditId(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to delete service");
    } finally {
      setSavingId(null);
    }
  }

  async function onSaveEdit() {
    if (!editing) return;
    setErr(null);
    const title = editTitle.trim();
    const description = editDesc.trim();
    const dur = editDuration.trim() === "" ? null : Number.isFinite(Number(editDuration)) ? Number(editDuration) : NaN;
    const priceStr = editBasePrice.trim();
    const priceCents = priceStr === "" ? 0 : Number.isFinite(Number(priceStr)) ? Number(priceStr) : NaN;
    if (!title) return setErr("Title is required.");
    if (!description) return setErr("Description is required.");
    if (dur !== null && (!Number.isInteger(dur) || dur <= 0)) return setErr("Duration must be a positive whole number of minutes (or blank).");
    if (!Number.isInteger(priceCents) || priceCents < 0) return setErr("Base price must be a whole number of cents (0 or more).");
    setSavingId(editing.public_id);
    try {
      const res = await updateOwnerService(editing.public_id, { title, description, duration_minutes: dur, base_price_cents: priceCents });
      setServices((prev) => prev.map((s) => (s.public_id === res.service.public_id ? res.service : s)));
      setEditId(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to update service");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="space-y-3">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-base font-semibold">Services</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Manage service offerings — title, description, duration, and base price
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setAddOpen((v) => !v)}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
            style={{ borderColor: addOpen ? "rgb(var(--border))" : "rgba(16,185,129,0.4)", background: addOpen ? "rgba(var(--bg), 0.25)" : "rgba(16,185,129,0.1)", color: addOpen ? undefined : "rgb(16,185,129)" }}>
            <span className="inline-flex items-center gap-2">
              {addOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {addOpen ? "Cancel" : "Add service"}
            </span>
          </button>
          <button type="button" onClick={refresh} disabled={loading}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
            <span className="inline-flex items-center gap-2">
              <RefreshCcw className="h-4 w-4" />
              {loading ? "Loading…" : "Refresh"}
            </span>
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>{err}</div>
      )}

      {/* Add form */}
      {addOpen && (
        <div className="rounded-2xl border p-5 space-y-4"
          style={{ borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.04)" }}>
          <div className="text-sm font-semibold">New Service</div>
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="space-y-1">
              <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>Title</div>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                placeholder="e.g., General Pest Treatment" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>Duration (minutes)</div>
              <input value={newDuration} onChange={(e) => setNewDuration(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                placeholder="e.g., 60" inputMode="numeric" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>Base price (cents)</div>
              <input value={newBasePrice} onChange={(e) => setNewBasePrice(digitsOnly(e.target.value))}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                placeholder="e.g., 12999" inputMode="numeric" />
              <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                Preview: {centsLabel(newBasePrice === "" ? 0 : Number(newBasePrice))}
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>Description</div>
            <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
              className="w-full min-h-[100px] rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
              placeholder="What's included, coverage, expectations…" />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button type="button" onClick={() => { setAddOpen(false); setNewTitle(""); setNewDesc(""); setNewDuration(""); setNewBasePrice(""); setErr(null); }}
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
              disabled={savingId === "__create__"}>
              Cancel
            </button>
            <button type="button" onClick={onCreate}
              className="rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              style={{ borderColor: "rgba(16,185,129,0.4)", background: "rgba(16,185,129,0.12)", color: "rgb(16,185,129)" }}
              disabled={savingId === "__create__"}>
              {savingId === "__create__" ? "Creating…" : "Create service"}
            </button>
          </div>
        </div>
      )}

      {/* Services list */}
      {loading ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          Loading services…
        </div>
      ) : (
        <div className="space-y-2">
          {services.length === 0 ? (
            <div className="rounded-2xl border p-8 text-center text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))", color: "rgb(var(--muted))" }}>
              No services found. Add your first service above.
            </div>
          ) : services.map((s) => (
            <div key={s.public_id} className="rounded-2xl border p-4 hover:opacity-95 transition-opacity"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold">{s.title}</div>
                    <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
                      style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--muted))" }}>
                      {minutesLabel(s.duration_minutes)}
                    </span>
                    <span className="rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                      style={{ borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.08)", color: "rgb(16,185,129)" }}>
                      {centsLabel(s.base_price_cents ?? 0)}
                    </span>
                  </div>
                  <div className="mt-1.5 text-sm leading-relaxed" style={{ color: "rgb(var(--muted))" }}>
                    {s.description}
                  </div>
                </div>
                <button type="button" onClick={() => setEditId(s.public_id)}
                  className="rounded-xl border px-3 py-1.5 text-xs font-semibold hover:opacity-90 flex-shrink-0"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}>
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={() => setEditId(null)} />
          <div className="relative w-full max-w-2xl rounded-2xl border p-6 shadow-2xl"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
            <div className="flex items-start justify-between gap-3 mb-5">
              <div>
                <div className="text-base font-semibold">Edit Service</div>
                <div className="text-sm mt-0.5" style={{ color: "rgb(var(--muted))" }}>
                  Update title, description, duration, and base price.
                </div>
              </div>
              <button type="button" onClick={() => setEditId(null)}
                className="rounded-xl border px-3 py-1.5 text-sm font-semibold hover:opacity-90"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}>
                Close
              </button>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <div className="space-y-1">
                <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>Title</div>
                <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }} />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>Duration (minutes)</div>
                <input value={editDuration} onChange={(e) => setEditDuration(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                  inputMode="numeric" placeholder="Blank = none" />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>Base price (cents)</div>
                <input value={editBasePrice} onChange={(e) => setEditBasePrice(digitsOnly(e.target.value))}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                  inputMode="numeric" placeholder="Blank = 0" />
                <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                  Preview: {centsLabel(editBasePrice === "" ? 0 : Number(editBasePrice))}
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>Description</div>
              <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                className="w-full min-h-[140px] rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }} />
            </div>

            <div className="mt-5 flex items-center justify-between gap-2">
              <button type="button" onClick={() => setConfirmDeleteOpen(true)}
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                style={{ borderColor: "rgb(239,68,68)", background: "rgba(239,68,68,0.1)", color: "rgb(239,68,68)" }}
                disabled={savingId === editing.public_id || savingId === `__delete__:${editing.public_id}`}>
                Delete
              </button>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setEditId(null)}
                  className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                  disabled={savingId === editing.public_id}>
                  Cancel
                </button>
                <button type="button" onClick={onSaveEdit}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                  style={{ borderColor: "rgba(59,130,246,0.4)", background: "rgba(59,130,246,0.1)", color: "rgb(59,130,246)" }}
                  disabled={savingId === editing.public_id}>
                  {savingId === editing.public_id ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {editing && confirmDeleteOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setConfirmDeleteOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border p-6 shadow-2xl"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
            <div className="text-base font-semibold">Delete service?</div>
            <div className="mt-1.5 text-sm" style={{ color: "rgb(var(--muted))" }}>
              This will deactivate <span className="font-semibold">{editing.title}</span> from the services list (soft delete).
            </div>
            <div className="mt-4 rounded-xl border p-3 text-sm"
              style={{ borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.06)", color: "rgb(239,68,68)" }}>
              Customers will no longer see this service for new bookings.
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setConfirmDeleteOpen(false)}
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                disabled={savingId === `__delete__:${editing.public_id}`}>
                Cancel
              </button>
              <button type="button" onClick={onConfirmDelete}
                className="rounded-xl border px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                style={{ borderColor: "rgb(239,68,68)", background: "rgb(239,68,68)", color: "white" }}
                disabled={savingId === `__delete__:${editing.public_id}`}>
                {savingId === `__delete__:${editing.public_id}` ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
