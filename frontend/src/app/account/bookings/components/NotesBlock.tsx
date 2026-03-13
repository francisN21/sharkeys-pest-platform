"use client";

import React from "react";
import type { BookingCard } from "../../../../lib/api/bookings";

export default function NotesBlock({
  editing,
  canEditNotes,
  notesLocal,
  setNotesLocal,
  saving,
  notesPretty,
  status,
}: {
  editing: boolean;
  canEditNotes: boolean;
  notesLocal: string;
  setNotesLocal: (v: string) => void;
  saving: boolean;
  notesPretty: string;
  status: BookingCard["status"];
}) {
  return editing && canEditNotes ? (
    <div
      className="mt-2 rounded-xl border p-3 text-sm space-y-2"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
    >
      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
        Notes:
      </div>
      <textarea
        value={notesLocal}
        onChange={(e) => setNotesLocal(e.target.value)}
        rows={3}
        className="w-full rounded-lg border px-3 py-2 text-sm"
        style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
        placeholder="Add notes for the technician (gate code, pets, parking, etc.)"
        disabled={saving}
      />
      <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
        {status === "accepted"
          ? "Schedule is locked because your booking was accepted. You can still update notes."
          : "You can update schedule and notes while pending."}
      </div>
    </div>
  ) : (
    <div
      className="mt-2 rounded-xl border p-3 text-sm"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
    >
      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
        Notes:
      </div>
      <div className="mt-1 whitespace-pre-wrap break-words">{notesPretty}</div>
    </div>
  );
}