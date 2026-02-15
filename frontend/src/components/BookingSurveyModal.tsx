"use client";

import { useMemo } from "react";
import type { SurveyCode } from "../lib/api/survey";

type Props = {
  open: boolean;
  onClose: () => void;
  onSkip: () => void;

  heardFrom: SurveyCode | "";
  setHeardFrom: (v: SurveyCode | "") => void;

  referrerName: string;
  setReferrerName: (v: string) => void;

  otherText: string;
  setOtherText: (v: string) => void;

  submitting?: boolean;
  onSubmit: () => void;
};

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function BookingSurveyModal(props: Props) {
  const {
    open,
    onClose,
    onSkip,
    heardFrom,
    setHeardFrom,
    referrerName,
    setReferrerName,
    otherText,
    setOtherText,
    submitting,
    onSubmit,
  } = props;

  const needsOther = heardFrom === "other";
  const needsRef = heardFrom === "referred";

  const canSubmit = useMemo(() => {
    if (!heardFrom) return false;
    if (needsOther) return otherText.trim().length >= 2;
    if (needsRef) return referrerName.trim().length >= 2;
    return true;
  }, [heardFrom, needsOther, otherText, needsRef, referrerName]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
        aria-label="Close survey"
      />

      {/* modal */}
      <div className="relative mx-auto mt-24 w-[92%] max-w-lg">
        <div
          className="rounded-2xl border p-5 sm:p-6 shadow-lg"
          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
          role="dialog"
          aria-modal="true"
          aria-label="Quick survey"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-base font-semibold">Quick question</div>
              <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
                Where did you hear about us? (one-time)
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border px-2 py-1 text-sm hover:opacity-90"
              style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <RadioRow label="LinkedIn" value="linkedin" checked={heardFrom === "linkedin"} onChange={setHeardFrom} />
            <RadioRow label="Google" value="google" checked={heardFrom === "google"} onChange={setHeardFrom} />
            <RadioRow label="Instagram" value="instagram" checked={heardFrom === "instagram"} onChange={setHeardFrom} />
            <RadioRow label="Facebook" value="facebook" checked={heardFrom === "facebook"} onChange={setHeardFrom} />
            <RadioRow label="Referred" value="referred" checked={heardFrom === "referred"} onChange={setHeardFrom} />
            <RadioRow label="Other" value="other" checked={heardFrom === "other"} onChange={setHeardFrom} />

            {needsRef ? (
              <div className="space-y-1 pt-2">
                <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                  Who referred you? (optional for now)
                </div>
                <input
                  value={referrerName}
                  onChange={(e) => setReferrerName(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
                  placeholder="Name"
                />
              </div>
            ) : null}

            {needsOther ? (
              <div className="space-y-1 pt-2">
                <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
                  Please specify
                </div>
                <input
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.35)" }}
                  placeholder="e.g., Yelp, flyer, neighbor…"
                />
              </div>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onSkip}
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              style={{ borderColor: "rgb(var(--border))", background: "transparent" }}
              disabled={!!submitting}
            >
              Skip
            </button>

            <button
              type="button"
              onClick={onSubmit}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
              )}
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
              disabled={!!submitting || !canSubmit}
              title={!canSubmit ? "Select an option (and fill required field if needed)" : "Submit"}
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RadioRow({
  label,
  value,
  checked,
  onChange,
}: {
  label: string;
  value: SurveyCode;
  checked: boolean;
  onChange: (v: SurveyCode) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm"
      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)" }}
    >
      <span>{label}</span>
      <input
        type="radio"
        name="heard_from"
        checked={checked}
        onChange={() => onChange(value)}
      />
    </label>
  );
}