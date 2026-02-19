"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createOwnerService,
  getOwnerServices,
  updateOwnerService,
  type Service,
} from "../../lib/api/adminServices";

function minutesLabel(m?: number | null) {
  if (!m) return "—";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

export default function ServicesOverview() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Add form
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDuration, setNewDuration] = useState<string>(""); // keep as string for input

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const editing = useMemo(
    () => services.find((s) => s.public_id === editId) || null,
    [editId, services]
  );
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDuration, setEditDuration] = useState<string>("");

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

  useEffect(() => {
    refresh();
  }, []);

  // When opening edit modal, populate inputs
  useEffect(() => {
    if (!editing) return;
    setEditTitle(editing.title ?? "");
    setEditDesc(editing.description ?? "");
    setEditDuration(
      typeof editing.duration_minutes === "number" ? String(editing.duration_minutes) : ""
    );
  }, [editing]);

  async function onCreate() {
    setErr(null);

    const title = newTitle.trim();
    const description = newDesc.trim();

    const dur =
      newDuration.trim() === ""
        ? null
        : Number.isFinite(Number(newDuration))
          ? Number(newDuration)
          : NaN;

    if (!title) return setErr("Title is required.");
    if (!description) return setErr("Description is required.");
    if (dur !== null && (!Number.isInteger(dur) || dur <= 0)) {
      return setErr("Duration must be a positive whole number of minutes (or blank).");
    }

    setSavingId("__create__");
    try {
      const res = await createOwnerService({
        title,
        description,
        duration_minutes: dur,
      });

      const created = res.service;
      setServices((prev) => [created, ...prev]);
      setNewTitle("");
      setNewDesc("");
      setNewDuration("");
      setAddOpen(false);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to create service");
    } finally {
      setSavingId(null);
    }
  }

  async function onSaveEdit() {
    if (!editing) return;

    setErr(null);

    const title = editTitle.trim();
    const description = editDesc.trim();

    const dur =
      editDuration.trim() === ""
        ? null
        : Number.isFinite(Number(editDuration))
          ? Number(editDuration)
          : NaN;

    if (!title) return setErr("Title is required.");
    if (!description) return setErr("Description is required.");
    if (dur !== null && (!Number.isInteger(dur) || dur <= 0)) {
      return setErr("Duration must be a positive whole number of minutes (or blank).");
    }

    setSavingId(editing.public_id);
    try {
      const res = await updateOwnerService(editing.public_id, {
        title,
        description,
        duration_minutes: dur,
      });

      const updated = res.service;
      setServices((prev) =>
        prev.map((s) => (s.public_id === updated.public_id ? updated : s))
      );
      setEditId(null);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to update service");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-base font-semibold">Services</div>
          <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Add and edit service title, description, and duration.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAddOpen((v) => !v)}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
            style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
          >
            {addOpen ? "Close" : "Add service"}
          </button>

          <button
            type="button"
            onClick={refresh}
            className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            disabled={loading}
            title="Refresh list"
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

      {addOpen ? (
        <div
          className="rounded-2xl border p-5 space-y-3"
          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
        >
          <div className="text-sm font-semibold">New service</div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                Title
              </div>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                placeholder="e.g., General Pest Treatment"
              />
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                Duration (minutes)
              </div>
              <input
                value={newDuration}
                onChange={(e) => setNewDuration(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                placeholder="e.g., 60"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
              Description
            </div>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full min-h-[110px] rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
              placeholder="Describe what’s included, coverage, expectations, etc."
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setAddOpen(false);
                setNewTitle("");
                setNewDesc("");
                setNewDuration("");
                setErr(null);
              }}
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
              disabled={savingId === "__create__"}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onCreate}
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
              disabled={savingId === "__create__"}
              title="Create service"
            >
              {savingId === "__create__" ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          Loading services…
        </div>
      ) : (
        <div className="space-y-2">
          {services.length === 0 ? (
            <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
              No services found.
            </div>
          ) : (
            services.map((s) => (
              <div
                key={s.public_id}
                className="rounded-2xl border p-4"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold truncate">{s.title}</div>
                      <span
                        className="text-xs rounded-full border px-2 py-1"
                        style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--muted))" }}
                      >
                        {minutesLabel(s.duration_minutes)}
                      </span>
                    </div>
                    <div className="mt-2 text-sm" style={{ color: "rgb(var(--muted))" }}>
                      {s.description}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditId(s.public_id)}
                    className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
                    style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit modal */}
      {editing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.45)" }}
            onClick={() => setEditId(null)}
          />

          <div
            className="relative w-full max-w-2xl rounded-2xl border p-5"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-semibold">Edit service</div>
                <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                  Update title, description, and duration.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditId(null)}
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                  Title
                </div>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                />
              </div>

              <div className="space-y-1">
                <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                  Duration (minutes)
                </div>
                <input
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                  inputMode="numeric"
                  placeholder="Blank = none"
                />
              </div>
            </div>

            <div className="mt-3 space-y-1">
              <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                Description
              </div>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full min-h-[140px] rounded-xl border px-3 py-2 text-sm"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
              />
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditId(null)}
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                disabled={savingId === editing.public_id}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={onSaveEdit}
                className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                disabled={savingId === editing.public_id}
              >
                {savingId === editing.public_id ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}