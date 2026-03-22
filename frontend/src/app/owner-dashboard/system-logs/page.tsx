"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  RefreshCcw, ShieldAlert, KeyRound, Users, Trash2,
  ChevronDown, ChevronUp, Search, Shield, Activity, BookOpen, Clock,
} from "lucide-react";
import Navbar from "../../../components/Navbar";
import OwnerRouteTabs from "../_components/owner-route-tabs";
import { me, type MeResponse } from "../../../lib/api/auth";
import {
  getSessions, clearUserSessions,
  getTokens, revokeToken, getTokenHistory,
  getSuspiciousLog, getBlockedIps, unblockIp,
  getLoginAttempts, getAccessLog, getAuditLog,
  type SessionRow, type EmployeeInviteToken, type LeadInviteToken,
  type PasswordResetToken, type SuspiciousLogEntry, type BlockedIpEntry,
  type LoginAttempt, type AccessLogEvent, type AuditLogEntry,
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
    superuser: { label: "Super",  color: "rgb(139,92,246)", bg: "rgba(139,92,246,0.12)" },
    admin:     { label: "Admin",  color: "rgb(99,102,241)",  bg: "rgba(99,102,241,0.12)" },
    worker:    { label: "Tech",   color: "rgb(59,130,246)",  bg: "rgba(59,130,246,0.12)" },
    customer:  { label: "Cust",   color: "rgb(var(--muted))", bg: "rgba(var(--fg),0.07)" },
  };
  const m = map[role] ?? { label: role, color: "rgb(var(--muted))", bg: "rgba(var(--fg),0.07)" };
  return (
    <span key={role} className="rounded-md px-1.5 py-0.5 text-xs font-semibold"
      style={{ background: m.bg, color: m.color }}>{m.label}</span>
  );
}

function patternBadge(pattern: string) {
  return (
    <span key={pattern} className="rounded-md px-1.5 py-0.5 text-xs font-mono font-semibold"
      style={{ background: "rgba(239,68,68,0.1)", color: "rgb(239,68,68)" }}>
      {pattern}
    </span>
  );
}

function statusColor(code: number | null) {
  if (!code) return "rgb(var(--muted))";
  if (code < 300) return "rgb(16,185,129)";
  if (code < 400) return "rgb(59,130,246)";
  if (code < 500) return "rgb(234,179,8)";
  return "rgb(239,68,68)";
}

function ActionBadge({ action }: { action: string }) {
  const color = action.startsWith("session") ? "rgb(59,130,246)"
    : action.startsWith("token") ? "rgb(234,179,8)"
    : action.startsWith("ip") ? "rgb(239,68,68)"
    : action.startsWith("employee") ? "rgb(99,102,241)"
    : "rgb(var(--muted))";
  return (
    <span className="rounded-md px-1.5 py-0.5 text-xs font-mono font-semibold"
      style={{ background: `${color}1a`, color }}>
      {action}
    </span>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, count, onRefresh, loading }: {
  title: string; subtitle: string; count?: number;
  onRefresh?: () => void; loading?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          {count !== undefined && (
            <span className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ background: "rgba(var(--fg),0.08)", color: "rgb(var(--muted))" }}>
              {count}
            </span>
          )}
        </div>
        <div className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>{subtitle}</div>
      </div>
      {onRefresh && (
        <button type="button" onClick={onRefresh} disabled={loading}
          title="Refresh"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border hover:opacity-80 disabled:opacity-50 transition-opacity"
          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            style={{ color: "rgb(var(--muted))" }} />
        </button>
      )}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="rounded-2xl border p-5 text-sm text-center"
      style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--muted))" }}>
      {msg}
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239,68,68)", color: "rgb(239,68,68)" }}>
      {msg}
    </div>
  );
}

function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {children}
    </div>
  );
}

function FilterInput({ placeholder, value, onChange }: {
  placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none"
        style={{ color: "rgb(var(--muted))" }} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border pl-8 pr-3 py-1.5 text-xs"
        style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))", color: "rgb(var(--fg))", minWidth: "160px" }}
      />
    </div>
  );
}

function RevokeBtn({ onClick, disabled, loading }: { onClick: () => void; disabled: boolean; loading: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled || loading}
      className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold hover:opacity-80 disabled:opacity-40 transition-opacity flex-shrink-0"
      style={{ borderColor: "rgba(239,68,68,0.4)", color: "rgb(239,68,68)", background: "rgba(239,68,68,0.06)" }}>
      <Trash2 className="h-3 w-3" />
      {loading ? "…" : "Revoke"}
    </button>
  );
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabKey = "sessions" | "tokens" | "logins" | "access" | "audit" | "security";

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: "sessions",  label: "Sessions",   icon: <Users className="h-3.5 w-3.5" /> },
  { key: "tokens",    label: "Tokens",     icon: <KeyRound className="h-3.5 w-3.5" /> },
  { key: "logins",    label: "Login Fails",icon: <Shield className="h-3.5 w-3.5" /> },
  { key: "access",    label: "Access Log", icon: <Activity className="h-3.5 w-3.5" /> },
  { key: "audit",     label: "Audit Log",  icon: <BookOpen className="h-3.5 w-3.5" /> },
  { key: "security",  label: "Security",   icon: <ShieldAlert className="h-3.5 w-3.5" /> },
];

// ─── Sessions tab ─────────────────────────────────────────────────────────────

function SessionsTab() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [clearing, setClearing] = useState<number | null>(null);

  const load = useCallback(async () => {
    try { setLoading(true); setErr(null); const res = await getSessions(); setSessions(res.sessions); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const byUser = sessions.reduce<Record<number, SessionRow[]>>((acc, s) => {
    (acc[s.user_id] ??= []).push(s); return acc;
  }, {});

  async function handleClear(userId: number) {
    if (!confirm("Force sign-out this user from all devices?")) return;
    try {
      setClearing(userId);
      await clearUserSessions(userId);
      setSessions((prev) => prev.filter((s) => s.user_id !== userId));
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setClearing(null); }
  }

  return (
    <div>
      <SectionHeader title="Active Sessions" subtitle="Live sessions — force sign-out any user"
        count={sessions.length} onRefresh={load} loading={loading} />
      {err && <Err msg={err} />}
      {loading ? <Empty msg="Loading…" /> : Object.keys(byUser).length === 0 ? <Empty msg="No active sessions." /> : (
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
                        {first.first_name || first.last_name ? `${first.first_name ?? ""} ${first.last_name ?? ""}`.trim() : first.email}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>{first.email}</div>
                    </td>
                    <td className="px-4 py-3"><div className="flex flex-wrap gap-1">{(first.roles ?? []).map(roleBadge)}</div></td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold">{rows.length}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: "rgb(var(--muted))" }}>
                      {fmtRelative(rows.reduce((a, b) => a.last_seen_at > b.last_seen_at ? a : b).last_seen_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: "rgb(var(--muted))" }}>
                      {fmtDate(rows.reduce((a, b) => a.expires_at > b.expires_at ? a : b).expires_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button type="button" onClick={() => handleClear(userId)} disabled={clearing === userId}
                        className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold hover:opacity-80 disabled:opacity-40 transition-opacity"
                        style={{ borderColor: "rgba(239,68,68,0.4)", color: "rgb(239,68,68)", background: "rgba(239,68,68,0.06)" }}>
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
    </div>
  );
}

// ─── Tokens tab ───────────────────────────────────────────────────────────────

function TokenRow({ label, email, role, expiry, onRevoke, revoking, showStatus, status }: {
  label: string; email: string; role?: string; expiry: string;
  onRevoke?: () => void; revoking?: boolean;
  showStatus?: boolean; status?: string;
}) {
  const statusMeta = status === "consumed"
    ? { label: "Consumed", color: "rgb(16,185,129)", bg: "rgba(16,185,129,0.1)" }
    : { label: "Expired", color: "rgb(var(--muted))", bg: "rgba(var(--fg),0.08)" };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
      style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
      <div className="min-w-0">
        <div className="font-medium text-sm truncate">{label}</div>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <span className="text-xs" style={{ color: "rgb(var(--muted))" }}>{email}</span>
          {role && roleBadge(role)}
        </div>
        <div className="text-xs mt-0.5" style={{ color: "rgb(var(--muted))" }}>
          {showStatus ? `${status === "consumed" ? "Used" : "Expired"}: ` : "Expires: "}{fmtDate(expiry)}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {showStatus && (
          <span className="rounded-md px-2 py-0.5 text-xs font-semibold"
            style={{ background: statusMeta.bg, color: statusMeta.color }}>
            {statusMeta.label}
          </span>
        )}
        {onRevoke && <RevokeBtn onClick={onRevoke} disabled={false} loading={!!revoking} />}
      </div>
    </div>
  );
}

function TokensTab() {
  const [pending, setPending] = useState<{
    employee_invites: EmployeeInviteToken[];
    lead_invites: LeadInviteToken[];
    password_resets: PasswordResetToken[];
  } | null>(null);
  const [history, setHistory] = useState<{
    employee_invites: EmployeeInviteToken[];
    lead_invites: LeadInviteToken[];
    password_resets: PasswordResetToken[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<"employee" | "lead" | "reset">("employee");
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true); setErr(null);
      const [p, h] = await Promise.all([getTokens(), getTokenHistory()]);
      setPending(p); setHistory(h);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRevoke(type: "employee-invite" | "lead-invite" | "password-reset", id: number) {
    if (!confirm("Revoke this token? The link will stop working immediately.")) return;
    const key = `${type}-${id}`;
    try {
      setRevoking(key);
      await revokeToken(type, id);
      setPending((prev) => {
        if (!prev) return prev;
        return {
          employee_invites: type === "employee-invite" ? prev.employee_invites.filter((t) => t.id !== id) : prev.employee_invites,
          lead_invites:     type === "lead-invite"     ? prev.lead_invites.filter((t) => t.id !== id)     : prev.lead_invites,
          password_resets:  type === "password-reset"  ? prev.password_resets.filter((t) => t.id !== id)  : prev.password_resets,
        };
      });
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setRevoking(null); }
  }

  const subTabs = [
    { key: "employee" as const, label: "Employee Invites",
      pending: pending?.employee_invites.length ?? 0,
      history: history?.employee_invites.length ?? 0 },
    { key: "lead"     as const, label: "Lead Invites",
      pending: pending?.lead_invites.length ?? 0,
      history: history?.lead_invites.length ?? 0 },
    { key: "reset"    as const, label: "Password Resets",
      pending: pending?.password_resets.length ?? 0,
      history: history?.password_resets.length ?? 0 },
  ];

  const cur = subTabs.find((s) => s.key === subTab)!;
  const totalPending = (pending?.employee_invites.length ?? 0) + (pending?.lead_invites.length ?? 0) + (pending?.password_resets.length ?? 0);

  return (
    <div>
      <SectionHeader title="Tokens" subtitle="Pending invites and reset links" count={totalPending} onRefresh={load} loading={loading} />
      {err && <Err msg={err} />}
      {loading ? <Empty msg="Loading…" /> : (
        <>
          {/* Sub-tabs */}
          <div className="flex gap-1 rounded-xl p-1 mb-4" style={{ background: "rgba(var(--fg),0.06)" }}>
            {subTabs.map((t) => (
              <button key={t.key} type="button" onClick={() => setSubTab(t.key)}
                className="flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-all"
                style={subTab === t.key
                  ? { background: "rgb(var(--card))", color: "rgb(var(--fg))", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }
                  : { color: "rgb(var(--muted))" }}>
                {t.label}
                {t.pending > 0 && (
                  <span className="ml-1.5 rounded-full px-1.5 py-0.5"
                    style={{ background: "rgba(var(--fg),0.1)", fontSize: "10px" }}>{t.pending}</span>
                )}
              </button>
            ))}
          </div>

          {/* Pending */}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>
              PENDING ({cur.pending})
            </span>
          </div>
          {(() => {
            const items = subTab === "employee" ? pending?.employee_invites ?? []
              : subTab === "lead" ? pending?.lead_invites ?? []
              : pending?.password_resets ?? [];
            if (items.length === 0) return <Empty msg={`No pending ${cur.label.toLowerCase()}.`} />;
            return (
              <div className="space-y-2 mb-4">
                {subTab === "employee" && (pending?.employee_invites ?? []).map((t) => (
                  <TokenRow key={t.id}
                    label={t.first_name || t.last_name ? `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim() : t.user_email}
                    email={t.user_email} role={t.invited_role} expiry={t.expires_at}
                    onRevoke={() => handleRevoke("employee-invite", t.id)}
                    revoking={revoking === `employee-invite-${t.id}`} />
                ))}
                {subTab === "lead" && (pending?.lead_invites ?? []).map((t) => (
                  <TokenRow key={t.id}
                    label={t.first_name || t.last_name ? `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim() : t.lead_email}
                    email={t.lead_email} expiry={t.expires_at}
                    onRevoke={() => handleRevoke("lead-invite", t.id)}
                    revoking={revoking === `lead-invite-${t.id}`} />
                ))}
                {subTab === "reset" && (pending?.password_resets ?? []).map((t) => (
                  <TokenRow key={t.id}
                    label={t.first_name || t.last_name ? `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim() : t.email}
                    email={t.email} expiry={t.expires_at}
                    onRevoke={() => handleRevoke("password-reset", t.id)}
                    revoking={revoking === `password-reset-${t.id}`} />
                ))}
              </div>
            );
          })()}

          {/* History toggle */}
          <button type="button" onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold mb-2 hover:opacity-70 transition-opacity"
            style={{ color: "rgb(var(--muted))" }}>
            <Clock className="h-3.5 w-3.5" />
            HISTORY ({cur.history}) {showHistory ? "▲" : "▼"}
          </button>
          {showHistory && (() => {
            const items = subTab === "employee" ? history?.employee_invites ?? []
              : subTab === "lead" ? history?.lead_invites ?? []
              : history?.password_resets ?? [];
            if (items.length === 0) return <Empty msg="No history yet." />;
            return (
              <div className="space-y-2">
                {subTab === "employee" && (history?.employee_invites ?? []).map((t) => (
                  <TokenRow key={t.id}
                    label={t.first_name || t.last_name ? `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim() : t.user_email}
                    email={t.user_email} role={t.invited_role}
                    expiry={t.consumed_at ?? t.expires_at}
                    showStatus status={t.status} />
                ))}
                {subTab === "lead" && (history?.lead_invites ?? []).map((t) => (
                  <TokenRow key={t.id}
                    label={t.first_name || t.last_name ? `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim() : t.lead_email}
                    email={t.lead_email} expiry={t.consumed_at ?? t.expires_at}
                    showStatus status={t.status} />
                ))}
                {subTab === "reset" && (history?.password_resets ?? []).map((t) => (
                  <TokenRow key={t.id}
                    label={t.first_name || t.last_name ? `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim() : t.email}
                    email={t.email} expiry={t.consumed_at ?? t.expires_at}
                    showStatus status={t.status} />
                ))}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

// ─── Login Failures tab ───────────────────────────────────────────────────────

function LoginsTab() {
  const [attempts, setAttempts] = useState<LoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [emailFilter, setEmailFilter] = useState("");
  const [ipFilter, setIpFilter] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true); setErr(null);
      const res = await getLoginAttempts({
        email: emailFilter || undefined,
        ip: ipFilter || undefined,
        limit: 200,
      });
      setAttempts(res.attempts);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, [emailFilter, ipFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <SectionHeader title="Login Failures" subtitle="Failed login attempts tracked by email and IP"
        count={attempts.length} onRefresh={load} loading={loading} />
      {err && <Err msg={err} />}
      <FilterBar>
        <FilterInput placeholder="Filter by email…" value={emailFilter} onChange={setEmailFilter} />
        <FilterInput placeholder="Filter by IP…" value={ipFilter} onChange={setIpFilter} />
      </FilterBar>
      {loading ? <Empty msg="Loading…" /> : attempts.length === 0 ? <Empty msg="No login failures recorded." /> : (
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "rgb(var(--border))" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgb(var(--card))" }}>
                {["Email", "IP", "Reason", "Time", "User-Agent"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap"
                    style={{ color: "rgb(var(--muted))" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {attempts.map((a, i) => (
                <tr key={a.id} style={{
                  background: i % 2 === 0 ? "rgb(var(--card))" : "rgba(var(--bg),0.25)",
                  borderTop: "1px solid rgb(var(--border))",
                }}>
                  <td className="px-4 py-2.5 font-medium whitespace-nowrap">{a.email}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap font-mono text-xs"
                    style={{ color: "rgb(var(--muted))" }}>{a.ip ?? "—"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <span className="rounded-md px-1.5 py-0.5 text-xs font-semibold"
                      style={{
                        background: a.reason === "wrong_password" ? "rgba(234,179,8,0.1)" : "rgba(239,68,68,0.1)",
                        color: a.reason === "wrong_password" ? "rgb(234,179,8)" : "rgb(239,68,68)",
                      }}>
                      {a.reason === "wrong_password" ? "Wrong password" : "User not found"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-xs" style={{ color: "rgb(var(--muted))" }}>
                    {fmtRelative(a.created_at)}
                  </td>
                  <td className="px-4 py-2.5 text-xs max-w-xs truncate" style={{ color: "rgb(var(--muted))" }}>
                    {a.user_agent ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Access Log tab ───────────────────────────────────────────────────────────

function AccessTab() {
  const [events, setEvents] = useState<AccessLogEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [pathFilter, setPathFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true); setErr(null);
      const res = await getAccessLog({
        path: pathFilter || undefined,
        email: emailFilter || undefined,
        status: statusFilter ? parseInt(statusFilter, 10) : undefined,
        limit: 200,
      });
      setEvents(res.events);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, [pathFilter, emailFilter, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <SectionHeader title="Access Log" subtitle="All HTTP requests recorded on the server"
        count={events.length} onRefresh={load} loading={loading} />
      {err && <Err msg={err} />}
      <FilterBar>
        <FilterInput placeholder="Filter by path…" value={pathFilter} onChange={setPathFilter} />
        <FilterInput placeholder="Filter by email…" value={emailFilter} onChange={setEmailFilter} />
        <FilterInput placeholder="Status code…" value={statusFilter} onChange={setStatusFilter} />
      </FilterBar>
      {loading ? <Empty msg="Loading…" /> : events.length === 0 ? <Empty msg="No access events found." /> : (
        <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "rgb(var(--border))" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgb(var(--card))" }}>
                {["Time", "Method", "Path", "Status", "User", "IP", "ms"].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold whitespace-nowrap"
                    style={{ color: "rgb(var(--muted))" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={e.id} style={{
                  background: i % 2 === 0 ? "rgb(var(--card))" : "rgba(var(--bg),0.25)",
                  borderTop: "1px solid rgb(var(--border))",
                }}>
                  <td className="px-3 py-2 whitespace-nowrap text-xs" style={{ color: "rgb(var(--muted))" }}>
                    {fmtRelative(e.occurred_at)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="text-xs font-mono font-semibold">{e.method}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs max-w-xs truncate">{e.path}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="text-xs font-bold" style={{ color: statusColor(e.status_code) }}>
                      {e.status_code ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: "rgb(var(--muted))" }}>
                    {e.email ?? "anon"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs whitespace-nowrap" style={{ color: "rgb(var(--muted))" }}>
                    {e.ip ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap" style={{ color: "rgb(var(--muted))" }}>
                    {e.duration_ms ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Audit Log tab ────────────────────────────────────────────────────────────

function AuditTab() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setErr(null);
      const res = await getAuditLog({ action: actionFilter || undefined, limit: 200 });
      setEntries(res.entries);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, [actionFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <SectionHeader title="Audit Log" subtitle="Admin actions — session clears, token revocations, IP unblocks"
        count={entries.length} onRefresh={load} loading={loading} />
      {err && <Err msg={err} />}
      <FilterBar>
        <FilterInput placeholder="Filter by action…" value={actionFilter} onChange={setActionFilter} />
      </FilterBar>
      {loading ? <Empty msg="Loading…" /> : entries.length === 0 ? <Empty msg="No audit entries yet." /> : (
        <div className="space-y-2">
          {entries.map((e, i) => (
            <div key={e.id} className="rounded-xl border overflow-hidden"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
              <button type="button" onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-3 min-w-0 flex-wrap">
                  <ActionBadge action={e.action} />
                  <span className="text-xs font-medium truncate">
                    {e.actor_first || e.actor_last
                      ? `${e.actor_first ?? ""} ${e.actor_last ?? ""}`.trim()
                      : e.actor_email}
                  </span>
                  {e.target_type && (
                    <span className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                      → {e.target_type} {e.target_id}
                    </span>
                  )}
                  <span className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                    {fmtRelative(e.created_at)}
                  </span>
                </div>
                {expanded === i
                  ? <ChevronUp className="h-4 w-4 flex-shrink-0" style={{ color: "rgb(var(--muted))" }} />
                  : <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: "rgb(var(--muted))" }} />
                }
              </button>
              {expanded === i && (
                <div className="border-t px-4 py-3 space-y-1"
                  style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--fg),0.02)" }}>
                  <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                    <span className="font-semibold">Actor:</span> {e.actor_email}
                  </div>
                  <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                    <span className="font-semibold">Time:</span> {fmtDate(e.created_at)}
                  </div>
                  {Object.keys(e.metadata ?? {}).length > 0 && (
                    <div className="text-xs font-mono rounded p-2 mt-1 break-all"
                      style={{ background: "rgba(var(--fg),0.06)", color: "rgb(var(--fg))" }}>
                      {JSON.stringify(e.metadata, null, 2)}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Security tab (suspicious log + blocked IPs) ──────────────────────────────

function SecurityTab() {
  const [entries, setEntries] = useState<SuspiciousLogEntry[]>([]);
  const [totalLines, setTotalLines] = useState(0);
  const [blockedIps, setBlockedIps] = useState<BlockedIpEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setErr(null);
      const [log, ips] = await Promise.all([getSuspiciousLog(100), getBlockedIps()]);
      setEntries(log.entries);
      setTotalLines(log.total_lines);
      setBlockedIps(ips.entries);
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUnblock(ip: string) {
    if (!confirm(`Unblock ${ip}?`)) return;
    try {
      setUnblocking(ip);
      await unblockIp(ip);
      setBlockedIps((prev) => prev.filter((e) => e.ip !== ip));
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
    finally { setUnblocking(null); }
  }

  const blocked = blockedIps.filter((e) => e.blocked);

  return (
    <div className="space-y-6">
      {err && <Err msg={err} />}

      {/* Blocked IPs */}
      <div>
        <SectionHeader title="Blocked IPs" subtitle="IPs throttled by the suspicious input filter"
          count={blocked.length} onRefresh={load} loading={loading} />
        {loading ? <Empty msg="Loading…" /> : blocked.length === 0 ? (
          <Empty msg="No IPs currently blocked." />
        ) : (
          <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "rgb(var(--border))" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgb(var(--card))" }}>
                  {["IP", "Total hits", "Window hits", "Blocked until", "Last seen", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap"
                      style={{ color: "rgb(var(--muted))" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {blocked.map((ip, i) => (
                  <tr key={ip.ip} style={{
                    background: i % 2 === 0 ? "rgb(var(--card))" : "rgba(var(--bg),0.25)",
                    borderTop: "1px solid rgb(var(--border))",
                  }}>
                    <td className="px-4 py-2.5 font-mono font-semibold whitespace-nowrap">{ip.ip}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{ip.total_count}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{ip.window_count}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs" style={{ color: "rgb(239,68,68)" }}>
                      {ip.blocked_until ? fmtDate(ip.blocked_until) : "—"}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs" style={{ color: "rgb(var(--muted))" }}>
                      {ip.last_seen ? fmtRelative(ip.last_seen) : "—"}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <button type="button" onClick={() => handleUnblock(ip.ip)}
                        disabled={unblocking === ip.ip}
                        className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold hover:opacity-80 disabled:opacity-40 transition-opacity"
                        style={{ borderColor: "rgba(16,185,129,0.4)", color: "rgb(16,185,129)", background: "rgba(16,185,129,0.06)" }}>
                        {unblocking === ip.ip ? "…" : "Unblock"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="h-px" style={{ background: "rgb(var(--border))" }} />

      {/* Suspicious log */}
      <div>
        <SectionHeader title="Suspicious Input Log" subtitle={`SQL injection attempts and flagged inputs — last 100 of ${totalLines.toLocaleString()}`}
          count={entries.length} />
        {loading ? <Empty msg="Loading…" /> : entries.length === 0 ? (
          <Empty msg="No suspicious activity recorded yet." />
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
                        style={{ background: "rgba(var(--fg),0.04)", border: "1px solid rgb(var(--border))" }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          {patternBadge(h.pattern)}
                          <span className="text-xs font-mono" style={{ color: "rgb(var(--muted))" }}>field: {h.field}</span>
                          {h.sensitive && <span className="text-xs font-semibold" style={{ color: "rgb(234,179,8)" }}>sensitive</span>}
                        </div>
                        <div className="text-xs font-mono rounded p-2 break-all"
                          style={{ background: "rgba(var(--fg),0.06)", color: "rgb(var(--fg))" }}>
                          {h.excerpt}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LogsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [meRes, setMeRes] = useState<MeResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("sessions");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await me();
        if (!alive) return;
        if (!res?.ok || !res.user) { router.replace("/login"); return; }
        setMeRes(res);
        if (!isSuperUser(res)) { router.replace("/account"); return; }
      } finally {
        if (alive) setAuthLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router]);

  if (authLoading) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 animate-spin"
              style={{ borderColor: "rgb(var(--border))", borderTopColor: "transparent" }} />
            <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>Loading…</div>
          </div>
        </main>
      </>
    );
  }

  if (!meRes || !isSuperUser(meRes)) return null;

  return (
    <div className="min-h-screen" style={{ background: "rgb(var(--background))" }}>
      <Navbar />

      {/* Page header */}
      <div className="border-b" style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border"
                style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--fg), 0.05)" }}>
                <i className="fa-solid fa-shield-halved text-sm" style={{ color: "rgb(var(--muted))" }} />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">System Logs</h1>
                <p className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                  Sharkeys Pest Control · Sessions, tokens &amp; security events
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.push("/account")}
                className="rounded-xl border px-3 py-1.5 text-xs font-semibold hover:opacity-80 transition-opacity"
                style={{ borderColor: "rgb(var(--border))", background: "transparent" }}>
                ← Back to Account
              </button>
            </div>
          </div>

          {/* Route tabs */}
          <div className="mt-4 -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
            <div className="min-w-max">
              <OwnerRouteTabs pathname={pathname} loading={false} />
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Inner log tabs */}
        <div className="flex gap-1 rounded-xl p-1 mb-6 overflow-x-auto"
          style={{ background: "rgba(var(--fg),0.06)" }}>
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold whitespace-nowrap transition-all"
              style={activeTab === t.key
                ? { background: "rgb(var(--card))", color: "rgb(var(--fg))", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }
                : { color: "rgb(var(--muted))" }}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "sessions"  && <SessionsTab />}
        {activeTab === "tokens"    && <TokensTab />}
        {activeTab === "logins"    && <LoginsTab />}
        {activeTab === "access"    && <AccessTab />}
        {activeTab === "audit"     && <AuditTab />}
        {activeTab === "security"  && <SecurityTab />}
      </main>
    </div>
  );
}
