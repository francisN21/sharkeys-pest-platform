"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RefreshCcw, ShieldAlert, KeyRound, Users, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import Navbar from "../../../components/Navbar";
import OwnerRouteTabs from "../_components/owner-route-tabs";
import { me, type MeResponse } from "../../../lib/api/auth";
import {
  getSessions,
  getTokens,
  getSuspiciousLog,
  clearUserSessions,
  revokeToken,
  type SessionRow,
  type EmployeeInviteToken,
  type LeadInviteToken,
  type PasswordResetToken,
  type SuspiciousLogEntry,
} from "../../../lib/api/systemLogs";

type MeResponseWithRoles = MeResponse & {
  user?: NonNullable<MeResponse["user"]> & { roles?: string[] | null };
  roles?: string[] | null;
};

function isSuperUser(res: MeResponse | null) {
  if (!res) return false;
  const r = res as MeResponseWithRoles;
  const roles = (r.user?.roles ?? r.roles ?? [])
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim().toLowerCase());
  return roles.includes("superuser");
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function roleBadge(role: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    superuser: { label: "Super", color: "rgb(139,92,246)", bg: "rgba(139,92,246,0.12)" },
    admin:     { label: "Admin", color: "rgb(99,102,241)",  bg: "rgba(99,102,241,0.12)" },
    worker:    { label: "Tech",  color: "rgb(59,130,246)",  bg: "rgba(59,130,246,0.12)" },
    customer:  { label: "Cust",  color: "rgb(var(--muted))", bg: "rgba(var(--fg),0.07)" },
  };
  const m = map[role] ?? { label: role, color: "rgb(var(--muted))", bg: "rgba(var(--fg),0.07)" };
  return (
    <span key={role} className="rounded-md px-1.5 py-0.5 text-xs font-semibold"
      style={{ background: m.bg, color: m.color }}>
      {m.label}
    </span>
  );
}

function patternBadge(pattern: string) {
  const colors: Record<string, string> = {
    or_true:      "rgb(239,68,68)",
    sql_comment:  "rgb(234,179,8)",
    union_select: "rgb(239,68,68)",
    ddl_dml:      "rgb(239,68,68)",
  };
  return (
    <span key={pattern} className="rounded-md px-1.5 py-0.5 text-xs font-mono font-semibold"
      style={{ background: "rgba(239,68,68,0.1)", color: colors[pattern] ?? "rgb(239,68,68)" }}>
      {pattern}
    </span>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, subtitle, icon, count, children, loading, onRefresh, refreshing }: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  count?: number;
  children: React.ReactNode;
  loading?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "rgba(var(--fg),0.06)", color: "rgb(var(--muted))" }}>
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold">{title}</span>
              {count !== undefined && (
                <span className="rounded-full px-2 py-0.5 text-xs font-semibold"
                  style={{ background: "rgba(var(--fg),0.08)", color: "rgb(var(--muted))" }}>
                  {count}
                </span>
              )}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>{subtitle}</div>
          </div>
        </div>
        {onRefresh && (
          <button type="button" onClick={onRefresh} disabled={refreshing || loading}
            title="Refresh"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border hover:opacity-80 disabled:opacity-50 transition-opacity"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
            <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              style={{ color: "rgb(var(--muted))" }} />
          </button>
        )}
      </div>
      {loading ? (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: "rgb(var(--border))" }}>
          Loading…
        </div>
      ) : children}
    </div>
  );
}

// ─── Active Sessions ──────────────────────────────────────────────────────────

function SessionsSection() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [clearing, setClearing] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setErr(null);
      const res = await getSessions();
      setSessions(res.sessions);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleClear(userId: number) {
    if (!confirm("Force sign-out this user from all devices?")) return;
    try {
      setClearing(userId);
      await clearUserSessions(userId);
      setSessions((prev) => prev.filter((s) => s.user_id !== userId));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to clear sessions");
    } finally {
      setClearing(null);
    }
  }

  // Group by user
  const byUser = sessions.reduce<Record<number, SessionRow[]>>((acc, s) => {
    (acc[s.user_id] ??= []).push(s);
    return acc;
  }, {});

  return (
    <Section
      title="Active Sessions"
      subtitle="Live sessions — force sign-out any user"
      icon={<Users className="h-4 w-4" />}
      count={sessions.length}
      loading={loading}
      onRefresh={load}
      refreshing={loading}
    >
      {err && (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239,68,68)" }}>{err}</div>
      )}
      {Object.keys(byUser).length === 0 ? (
        <div className="rounded-2xl border p-5 text-sm text-center" style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--muted))" }}>
          No active sessions.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "rgb(var(--border))" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgb(var(--card))" }}>
                {["User", "Roles", "Sessions", "Last seen", "Expires", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap"
                    style={{ color: "rgb(var(--muted))" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(byUser).map(([uid, rows], i) => {
                const first = rows[0];
                const userId = Number(uid);
                return (
                  <tr key={uid} style={{
                    background: i % 2 === 0 ? "rgb(var(--card))" : "rgba(var(--bg),0.25)",
                    borderTop: "1px solid rgb(var(--border))",
                  }}>
                    <td className="px-4 py-3">
                      <div className="font-medium whitespace-nowrap">
                        {first.first_name || first.last_name
                          ? `${first.first_name ?? ""} ${first.last_name ?? ""}`.trim()
                          : first.email}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>{first.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(first.roles ?? []).map(roleBadge)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold">{rows.length}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: "rgb(var(--muted))" }}>
                      {fmtRelative(rows.reduce((a, b) => a.last_seen_at > b.last_seen_at ? a : b).last_seen_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: "rgb(var(--muted))" }}>
                      {fmtDate(rows.reduce((a, b) => a.expires_at > b.expires_at ? a : b).expires_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleClear(userId)}
                        disabled={clearing === userId}
                        className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold hover:opacity-80 disabled:opacity-40 transition-opacity"
                        style={{ borderColor: "rgba(239,68,68,0.4)", color: "rgb(239,68,68)", background: "rgba(239,68,68,0.06)" }}
                      >
                        <Trash2 className="h-3 w-3" />
                        {clearing === userId ? "Clearing…" : "Force sign-out"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}

// ─── Pending Tokens ───────────────────────────────────────────────────────────

function TokensSection() {
  const [data, setData] = useState<{
    employee_invites: EmployeeInviteToken[];
    lead_invites: LeadInviteToken[];
    password_resets: PasswordResetToken[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [tab, setTab] = useState<"employee" | "lead" | "reset">("employee");

  const load = useCallback(async () => {
    try {
      setLoading(true); setErr(null);
      const res = await getTokens();
      setData(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load tokens");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRevoke(type: "employee-invite" | "lead-invite" | "password-reset", id: number) {
    if (!confirm("Revoke this token? The link will stop working immediately.")) return;
    const key = `${type}-${id}`;
    try {
      setRevoking(key);
      await revokeToken(type, id);
      // Remove from local state
      setData((prev) => {
        if (!prev) return prev;
        return {
          employee_invites: type === "employee-invite" ? prev.employee_invites.filter((t) => t.id !== id) : prev.employee_invites,
          lead_invites:     type === "lead-invite"     ? prev.lead_invites.filter((t) => t.id !== id)     : prev.lead_invites,
          password_resets:  type === "password-reset"  ? prev.password_resets.filter((t) => t.id !== id)  : prev.password_resets,
        };
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to revoke token");
    } finally {
      setRevoking(null);
    }
  }

  const total = data
    ? data.employee_invites.length + data.lead_invites.length + data.password_resets.length
    : 0;

  const tabs: Array<{ key: typeof tab; label: string; count: number }> = [
    { key: "employee", label: "Employee Invites", count: data?.employee_invites.length ?? 0 },
    { key: "lead",     label: "Lead Invites",     count: data?.lead_invites.length ?? 0 },
    { key: "reset",    label: "Password Resets",  count: data?.password_resets.length ?? 0 },
  ];

  return (
    <Section
      title="Pending Tokens"
      subtitle="Unconsumed, non-expired invite and reset links"
      icon={<KeyRound className="h-4 w-4" />}
      count={total}
      loading={loading}
      onRefresh={load}
      refreshing={loading}
    >
      {err && (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239,68,68)" }}>{err}</div>
      )}
      {data && (
        <>
          {/* Sub-tabs */}
          <div className="flex gap-1 rounded-xl p-1" style={{ background: "rgba(var(--fg),0.06)" }}>
            {tabs.map((t) => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all"
                style={tab === t.key
                  ? { background: "rgb(var(--card))", color: "rgb(var(--fg))", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }
                  : { color: "rgb(var(--muted))" }}>
                {t.label}
                {t.count > 0 && (
                  <span className="ml-1.5 rounded-full px-1.5 py-0.5"
                    style={{ background: "rgba(var(--fg),0.1)", fontSize: "10px" }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Employee invites */}
          {tab === "employee" && (
            data.employee_invites.length === 0 ? (
              <div className="rounded-2xl border p-5 text-sm text-center"
                style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--muted))" }}>
                No pending employee invites.
              </div>
            ) : (
              <div className="space-y-2">
                {data.employee_invites.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
                    style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">
                        {t.first_name || t.last_name ? `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim() : t.user_email}
                      </div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: "rgb(var(--muted))" }}>
                        {t.user_email} · {roleBadge(t.invited_role)} · invited by {t.invited_by_email}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>
                        Expires {fmtDate(t.expires_at)}
                      </div>
                    </div>
                    <button type="button"
                      onClick={() => handleRevoke("employee-invite", t.id)}
                      disabled={revoking === `employee-invite-${t.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold hover:opacity-80 disabled:opacity-40 transition-opacity flex-shrink-0"
                      style={{ borderColor: "rgba(239,68,68,0.4)", color: "rgb(239,68,68)", background: "rgba(239,68,68,0.06)" }}>
                      <Trash2 className="h-3 w-3" />
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Lead invites */}
          {tab === "lead" && (
            data.lead_invites.length === 0 ? (
              <div className="rounded-2xl border p-5 text-sm text-center"
                style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--muted))" }}>
                No pending lead invites.
              </div>
            ) : (
              <div className="space-y-2">
                {data.lead_invites.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
                    style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">
                        {t.first_name || t.last_name ? `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim() : t.lead_email}
                      </div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: "rgb(var(--muted))" }}>
                        {t.lead_email}
                        {t.sent_by_email ? ` · sent by ${t.sent_by_email}` : ""}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>
                        Expires {fmtDate(t.expires_at)}
                      </div>
                    </div>
                    <button type="button"
                      onClick={() => handleRevoke("lead-invite", t.id)}
                      disabled={revoking === `lead-invite-${t.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold hover:opacity-80 disabled:opacity-40 transition-opacity flex-shrink-0"
                      style={{ borderColor: "rgba(239,68,68,0.4)", color: "rgb(239,68,68)", background: "rgba(239,68,68,0.06)" }}>
                      <Trash2 className="h-3 w-3" />
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Password resets */}
          {tab === "reset" && (
            data.password_resets.length === 0 ? (
              <div className="rounded-2xl border p-5 text-sm text-center"
                style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--muted))" }}>
                No pending password resets.
              </div>
            ) : (
              <div className="space-y-2">
                {data.password_resets.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
                    style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">
                        {t.first_name || t.last_name ? `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim() : t.email}
                      </div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: "rgb(var(--muted))" }}>{t.email}</div>
                      <div className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>
                        Expires {fmtDate(t.expires_at)}
                      </div>
                    </div>
                    <button type="button"
                      onClick={() => handleRevoke("password-reset", t.id)}
                      disabled={revoking === `password-reset-${t.id}`}
                      className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold hover:opacity-80 disabled:opacity-40 transition-opacity flex-shrink-0"
                      style={{ borderColor: "rgba(239,68,68,0.4)", color: "rgb(239,68,68)", background: "rgba(239,68,68,0.06)" }}>
                      <Trash2 className="h-3 w-3" />
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </Section>
  );
}

// ─── Suspicious Activity Log ──────────────────────────────────────────────────

function SuspiciousLogSection() {
  const [entries, setEntries] = useState<SuspiciousLogEntry[]>([]);
  const [totalLines, setTotalLines] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setErr(null);
      const res = await getSuspiciousLog(100);
      setEntries(res.entries);
      setTotalLines(res.total_lines);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load log");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <Section
      title="Suspicious Activity"
      subtitle="SQL injection attempts and other flagged inputs (last 100)"
      icon={<ShieldAlert className="h-4 w-4" />}
      count={entries.length}
      loading={loading}
      onRefresh={load}
      refreshing={loading}
    >
      {err && (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239,68,68)" }}>{err}</div>
      )}
      {totalLines > 100 && (
        <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
          Showing latest 100 of {totalLines.toLocaleString()} total log entries.
        </div>
      )}
      {entries.length === 0 ? (
        <div className="rounded-2xl border p-5 text-sm text-center"
          style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--muted))" }}>
          No suspicious activity recorded yet.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <div key={i} className="rounded-xl border overflow-hidden"
              style={{ borderColor: "rgba(239,68,68,0.25)", background: "rgb(var(--card))" }}>
              <button type="button" onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex-shrink-0 h-2 w-2 rounded-full" style={{ background: "rgb(239,68,68)" }} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold">{e.method} {e.path}</span>
                      <span className="text-xs" style={{ color: "rgb(var(--muted))" }}>{e.ip}</span>
                      {(e.hits ?? []).slice(0, 3).map((h) => patternBadge(h.pattern))}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>
                      {fmtDate(e.ts)} · {e.hits?.length ?? 0} hit{e.hits?.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                {expanded === i
                  ? <ChevronUp className="h-4 w-4 flex-shrink-0" style={{ color: "rgb(var(--muted))" }} />
                  : <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: "rgb(var(--muted))" }} />
                }
              </button>
              {expanded === i && (
                <div className="border-t px-4 py-3 space-y-2"
                  style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)" }}>
                  {e.userAgent && (
                    <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                      <span className="font-semibold">User-Agent:</span> {e.userAgent}
                    </div>
                  )}
                  {(e.hits ?? []).map((h, hi) => (
                    <div key={hi} className="rounded-lg p-3 space-y-1"
                      style={{ background: "rgba(var(--fg),0.04)", border: "1px solid rgba(var(--border))" }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        {patternBadge(h.pattern)}
                        <span className="text-xs font-mono" style={{ color: "rgb(var(--muted))" }}>
                          field: {h.field}
                        </span>
                        {h.sensitive && (
                          <span className="text-xs font-semibold" style={{ color: "rgb(234,179,8)" }}>sensitive</span>
                        )}
                      </div>
                      <div className="text-xs font-mono rounded p-2 break-all"
                        style={{ background: "rgba(var(--fg),0.06)", color: "rgb(var(--fg))" }}>
                        {h.excerpt}
                      </div>
                    </div>
                  ))}
                  {e.raw && (
                    <div className="text-xs font-mono rounded p-2 break-all"
                      style={{ background: "rgba(var(--fg),0.06)", color: "rgb(var(--muted))" }}>
                      {e.raw}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LogsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [meRes, setMeRes] = useState<MeResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    me().then((res) => {
      setMeRes(res);
      if (!isSuperUser(res)) router.replace("/account");
    }).catch(() => {
      router.replace("/login");
    }).finally(() => {
      setAuthLoading(false);
    });
  }, [router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "rgb(var(--bg))" }}>
        <RefreshCcw className="h-6 w-6 animate-spin" style={{ color: "rgb(var(--muted))" }} />
      </div>
    );
  }

  if (!meRes || !isSuperUser(meRes)) return null;

  return (
    <div className="min-h-screen" style={{ background: "rgb(var(--bg))", color: "rgb(var(--fg))" }}>
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Header */}
        <div className="border-b pb-5" style={{ borderColor: "rgb(var(--border))" }}>
          <div className="flex items-center gap-3 mb-1">
            <ShieldAlert className="h-5 w-5" style={{ color: "rgb(var(--muted))" }} />
            <h1 className="text-xl font-bold">System Logs</h1>
          </div>
          <p className="text-sm" style={{ color: "rgb(var(--muted))" }}>
            Active sessions, pending tokens, and security events
          </p>
        </div>

        <OwnerRouteTabs pathname={pathname} />

        {/* Divider helper */}
        <div className="h-px" style={{ background: "rgb(var(--border))" }} />

        <SessionsSection />
        <div className="h-px" style={{ background: "rgb(var(--border))" }} />
        <TokensSection />
        <div className="h-px" style={{ background: "rgb(var(--border))" }} />
        <SuspiciousLogSection />
      </div>
    </div>
  );
}
