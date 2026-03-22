// frontend/src/components/su-dashboard/SurveyReferrals.tsx
"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { getSurveyReferrals, type SurveyReferralRow } from "../../lib/api/adminMetrics";

function fmtDate(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function typeBadge(type: string | null) {
  if (!type) return null;
  const label = type === "business" ? "Business" : "Residential";
  const bg = type === "business" ? "rgba(99,102,241,0.12)" : "rgba(16,185,129,0.12)";
  const color = type === "business" ? "rgb(99,102,241)" : "rgb(16,185,129)";
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  );
}

// Group referrals by who referred them, so we can see top referrers
function groupByReferrer(referrals: SurveyReferralRow[]) {
  const map = new Map<string, SurveyReferralRow[]>();
  for (const r of referrals) {
    const key = r.referred_by.toLowerCase().trim();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  // Sort by count desc, then alphabetically
  return Array.from(map.entries())
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([, rows]) => rows);
}

export default function SurveyReferrals() {
  const [referrals, setReferrals] = useState<SurveyReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await getSurveyReferrals();
        if (!alive) return;
        setReferrals(res.referrals ?? []);
      } catch (e: unknown) {
        if (!alive) return;
        setErr(e instanceof Error ? e.message : "Failed to load referrals");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, []);

  const groups = groupByReferrer(referrals);

  return (
    <div
      className="rounded-2xl border p-5 space-y-4"
      style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4" style={{ color: "rgb(var(--muted))" }} />
            Referrals
          </div>
          <div className="mt-0.5 text-xs" style={{ color: "rgb(var(--muted))" }}>
            Customers who said a friend or family referred them — all time
          </div>
        </div>
        {!loading && referrals.length > 0 && (
          <div
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: "rgba(var(--fg), 0.07)" }}
          >
            {referrals.length} total
          </div>
        )}
      </div>

      {err ? (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
          {err}
        </div>
      ) : loading ? (
        <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
          Loading referrals…
        </div>
      ) : referrals.length === 0 ? (
        <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
          No referral responses yet.
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            const referrer = group[0].referred_by;
            const key = referrer.toLowerCase().trim();
            const isOpen = expanded === key;

            return (
              <div
                key={key}
                className="rounded-2xl border overflow-hidden"
                style={{ borderColor: "rgb(var(--border))" }}
              >
                {/* Referrer header — click to expand */}
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : key)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:opacity-90 transition-opacity"
                  style={{ background: "rgba(var(--fg), 0.04)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar-like initial circle */}
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: "rgba(var(--fg), 0.10)",
                        color: "rgb(var(--fg))",
                      }}
                    >
                      {referrer.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{referrer}</div>
                      <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                        referred {group.length} customer{group.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-bold"
                      style={{ background: "rgba(var(--fg), 0.08)" }}
                    >
                      {group.length}
                    </span>
                    <span
                      className="text-xs transition-transform duration-200"
                      style={{
                        color: "rgb(var(--muted))",
                        display: "inline-block",
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    >
                      ▾
                    </span>
                  </div>
                </button>

                {/* Expanded customer list */}
                {isOpen && (
                  <div
                    className="divide-y"
                    style={{ borderColor: "rgb(var(--border))" }}
                  >
                    {group.map((r, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-4 py-3"
                        style={{ background: "rgb(var(--card))" }}
                      >
                        {/* Customer initials */}
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{
                            background: "rgba(var(--fg), 0.06)",
                            color: "rgb(var(--fg))",
                          }}
                        >
                          {initials(r.customer_first_name, r.customer_last_name)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">
                              {r.customer_first_name} {r.customer_last_name}
                            </span>
                            {typeBadge(r.customer_type)}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>
                            Submitted {fmtDate(r.submitted_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
