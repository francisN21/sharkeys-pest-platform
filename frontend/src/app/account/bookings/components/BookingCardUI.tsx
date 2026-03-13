"use client";

import React, { useEffect, useState } from "react";
import type { BookingCard } from "../../../../lib/api/bookings";
import { updateMyBooking } from "../../../../lib/api/bookings";
import type { BookingCardWithOps } from "../types";
import {
  formatBookingTimeRange,
  fromDateTimeLocalValue,
  normalizeText,
  pickAssigned,
  pickCompleted,
  toDateTimeLocalValue,
} from "../helpers";
import NotesBlock from "./NotesBlock";
import PersonRow from "./PersonRow";
import StatusPill from "./StatusPill";

export default function BookingCardUI({
  b,
  onCancel,
  cancelling,
  onSaved,
  onOpenDetail,
}: {
  b: BookingCard;
  onCancel?: (publicId: string) => void;
  cancelling?: boolean;
  onSaved?: () => void;
  onOpenDetail: (publicId: string) => void;
}) {
  const bb = b as BookingCardWithOps;

  const canCancel = b.status === "pending" || b.status === "accepted" || b.status === "assigned";
  const canEdit = b.status === "pending" || b.status === "accepted";
  const canEditSchedule = b.status === "pending";
  const canEditNotes = b.status === "pending" || b.status === "accepted";

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);

  const [startsLocal, setStartsLocal] = useState(() => toDateTimeLocalValue(b.starts_at));
  const [endsLocal, setEndsLocal] = useState(() => toDateTimeLocalValue(b.ends_at));
  const [notesLocal, setNotesLocal] = useState(() => b.notes ?? "");

  useEffect(() => {
    if (editing) return;
    setStartsLocal(toDateTimeLocalValue(b.starts_at));
    setEndsLocal(toDateTimeLocalValue(b.ends_at));
    setNotesLocal(b.notes ?? "");
  }, [b.starts_at, b.ends_at, b.notes, editing]);

  async function onSave() {
    setLocalErr(null);

    try {
      setSaving(true);

      const payload: { starts_at?: string; ends_at?: string; notes?: string | null } = {};

      if (canEditSchedule) {
        const sIso = fromDateTimeLocalValue(startsLocal);
        const eIso = fromDateTimeLocalValue(endsLocal);

        if (!sIso || !eIso) {
          setLocalErr("Please enter a valid start and end date/time.");
          return;
        }

        const st = new Date(sIso).getTime();
        const en = new Date(eIso).getTime();
        if (!Number.isFinite(st) || !Number.isFinite(en) || en <= st) {
          setLocalErr("End time must be after start time.");
          return;
        }

        payload.starts_at = sIso;
        payload.ends_at = eIso;
      }

      if (canEditNotes) {
        const trimmed = notesLocal.trim();
        payload.notes = trimmed.length ? trimmed : null;
      }

      await updateMyBooking(b.public_id, payload);

      setEditing(false);
      onSaved?.();
    } catch (e: unknown) {
      setLocalErr(e instanceof Error ? e.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  function onCancelEdit() {
    setLocalErr(null);
    setEditing(false);
    setStartsLocal(toDateTimeLocalValue(b.starts_at));
    setEndsLocal(toDateTimeLocalValue(b.ends_at));
    setNotesLocal(b.notes ?? "");
  }

  const assigned = pickAssigned(bb);
  const completed = pickCompleted(bb);
  const notesPretty = normalizeText(b.notes) ?? "—";
  const completedAtPretty = bb.completed_at ? new Date(bb.completed_at).toLocaleString() : null;

  return (
    <div
      className="rounded-2xl border p-3 sm:p-4"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.10)" }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 truncate text-sm font-semibold sm:text-base">{b.service_title}</div>
              <StatusPill status={b.status} />
            </div>

            <div className="mt-2 text-sm break-words" style={{ color: "rgb(var(--muted))" }}>
              {editing && canEditSchedule ? (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                        Start
                      </div>
                      <input
                        type="datetime-local"
                        value={startsLocal}
                        onChange={(e) => setStartsLocal(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                        disabled={saving}
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                        End
                      </div>
                      <input
                        type="datetime-local"
                        value={endsLocal}
                        onChange={(e) => setEndsLocal(e.target.value)}
                        className="w-full rounded-lg border px-3 py-2 text-sm"
                        style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                        disabled={saving}
                      />
                    </div>
                  </div>

                  <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                    {formatBookingTimeRange(
                      fromDateTimeLocalValue(startsLocal) ?? b.starts_at,
                      fromDateTimeLocalValue(endsLocal) ?? b.ends_at
                    )}
                  </div>
                </div>
              ) : (
                formatBookingTimeRange(b.starts_at, b.ends_at)
              )}
            </div>

            <div className="mt-2 text-sm break-words" style={{ color: "rgb(var(--muted))" }}>
              {b.address}
            </div>
          </div>
        </div>

        <NotesBlock
          editing={editing}
          canEditNotes={canEditNotes}
          notesLocal={notesLocal}
          setNotesLocal={setNotesLocal}
          saving={saving}
          notesPretty={notesPretty}
          status={b.status}
        />

        {b.status !== "completed" ? <PersonRow title="Assigned To:" person={assigned} /> : null}

        <PersonRow
          title="Completed By:"
          person={completed}
          showEvenIfEmpty={!!completedAtPretty}
          footer={
            completedAtPretty ? (
              <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                Completed at: {completedAtPretty}
              </div>
            ) : null
          }
        />

        {localErr ? (
          <div
            className="rounded-xl border p-3 text-sm"
            style={{ borderColor: "rgb(239 68 68 / 0.75)", background: "rgb(127 29 29 / 0.16)" }}
          >
            {localErr}
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs break-words" style={{ color: "rgb(var(--muted))" }}>
            Booking ID: <span className="font-mono">{b.public_id}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
              onClick={() => onOpenDetail(b.public_id)}
              disabled={saving || !!cancelling}
            >
              Details
            </button>

            {canEdit ? (
              editing ? (
                <>
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
                    style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                    onClick={onSave}
                    disabled={saving}
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>

                  <button
                    type="button"
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
                    style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                    onClick={onCancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                  onClick={() => setEditing(true)}
                  disabled={saving}
                >
                  Edit
                </button>
              )
            ) : null}

            {!editing && canCancel && onCancel ? (
              <button
                type="button"
                className="rounded-lg border px-3 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
                onClick={() => onCancel(b.public_id)}
                disabled={!!cancelling || saving}
              >
                {cancelling ? "Cancelling…" : "Cancel"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}