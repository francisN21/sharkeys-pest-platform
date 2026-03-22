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
    <div className="mt-2 space-y-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-3 text-sm">
      <div className="text-xs font-semibold text-[rgb(var(--muted))]">Notes:</div>
      <textarea
        value={notesLocal}
        onChange={(e) => setNotesLocal(e.target.value)}
        rows={3}
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-[rgb(var(--fg))] placeholder:text-[rgb(var(--muted))] focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10 transition disabled:opacity-60"
        placeholder="Add notes for the technician (gate code, pets, parking, etc.)"
        disabled={saving}
      />
      <div className="text-xs text-[rgb(var(--muted))]">
        {status === "accepted"
          ? "Schedule is locked because your booking was accepted. You can still update notes."
          : "You can update schedule and notes while pending."}
      </div>
    </div>
  ) : (
    <div className="mt-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 py-3 text-sm">
      <div className="text-xs font-semibold text-[rgb(var(--muted))]">Notes:</div>
      <div className="mt-1 whitespace-pre-wrap break-words text-[rgb(var(--fg))]">{notesPretty}</div>
    </div>
  );
}
