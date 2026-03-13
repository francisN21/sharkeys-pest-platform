"use client";

import React, { type ReactNode } from "react";
import { normalizeText } from "../helpers";
import type { PersonLite } from "../types";

export default function PersonRow({
  title,
  person,
  showEvenIfEmpty,
  footer,
}: {
  title: string;
  person: PersonLite | null;
  showEvenIfEmpty?: boolean;
  footer?: ReactNode;
}) {
  if (!person && !showEvenIfEmpty && !footer) return null;

  const name = normalizeText(person?.name);
  const phone = normalizeText(person?.phone);
  const email = normalizeText(person?.email);
  const role = normalizeText(person?.role);

  const hasAny = !!(name || phone || email || role);

  return (
    <div
      className="rounded-xl border p-3 text-sm"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
    >
      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
        {title}
      </div>

      {hasAny ? (
        <div className="mt-1">
          <div className="font-semibold">{name ?? "—"}</div>
          <div className="text-xs break-words" style={{ color: "rgb(var(--muted))" }}>
            {role ? `${role} • ` : ""}
            {phone ?? "—"}
            {email ? ` • ${email}` : ""}
          </div>
        </div>
      ) : (
        <div className="mt-1" style={{ color: "rgb(var(--muted))" }}>
          —
        </div>
      )}

      {footer ? <div className="mt-2">{footer}</div> : null}
    </div>
  );
}