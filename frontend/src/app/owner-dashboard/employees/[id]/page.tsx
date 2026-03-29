"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { CheckCircle2, Clock, AlertCircle, KeyRound, Mail, XCircle, RotateCcw } from "lucide-react";
import Navbar from "../../../../components/Navbar";
import OwnerRouteTabs from "../../_components/owner-route-tabs";
import { me, type MeResponse } from "../../../../lib/api/auth";
import { getEmployee, termEmployee, reinstateEmployee, adjustEmployeeRoles, type Employee } from "../../../../lib/api/employees";

type MeUserWithRoles = NonNullable<MeResponse["user"]> & {
  roles?: string[] | null;
  user_role?: string | null;
};

type MeResponseWithRoles = MeResponse & {
  user?: MeUserWithRoles;
  roles?: string[] | null;
};

function isSuperUser(res: MeResponse | null) {
  if (!res) return false;
  const withRoles = res as MeResponseWithRoles;
  const roles = (withRoles.user?.roles ?? withRoles.roles ?? [])
    .filter((r): r is string => typeof r === "string" && r.trim().length > 0)
    .map((r) => r.trim().toLowerCase());
  return roles.includes("superuser");
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatDateOnly(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function getStatusMeta(employee: Employee | null) {
  if (!employee) return { label: "—", color: "rgb(var(--muted))", bg: "rgba(var(--fg),0.06)", border: "rgb(var(--border))", icon: Clock };
  if (employee.termed_at) return { label: "Termed", color: "rgb(239,68,68)", bg: "rgba(239,68,68,0.1)", border: "rgba(239,68,68,0.3)", icon: XCircle };
  const isActive = employee.status === "active" || !!employee.email_verified_at;
  if (isActive) return { label: "Active", color: "rgb(16,185,129)", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)", icon: CheckCircle2 };
  if (employee.status === "invited") return { label: "Invited — Awaiting Setup", color: "rgb(234,179,8)", bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.3)", icon: Clock };
  return { label: "Pending", color: "rgb(234,179,8)", bg: "rgba(234,179,8,0.1)", border: "rgba(234,179,8,0.3)", icon: Clock };
}

function getRoleMeta(role?: string | null) {
  switch ((role ?? "").toLowerCase()) {
    case "superadmin": return { label: "Super Admin", color: "rgb(139,92,246)", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.3)", icon: "fa-solid fa-shield-halved" };
    case "admin":      return { label: "Admin",       color: "rgb(99,102,241)",  bg: "rgba(99,102,241,0.1)",  border: "rgba(99,102,241,0.3)",  icon: "fa-solid fa-user-tie" };
    default:           return { label: "Technician",  color: "rgb(59,130,246)",  bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.3)",  icon: "fa-solid fa-wrench" };
  }
}

function getInitials(employee: Employee | null) {
  if (!employee) return "?";
  const first = employee.first_name?.trim()[0] ?? "";
  const last = employee.last_name?.trim()[0] ?? "";
  return (first + last).toUpperCase() || employee.email[0].toUpperCase();
}

const AVATAR_COLORS = [
  "rgb(59,130,246)", "rgb(99,102,241)", "rgb(139,92,246)",
  "rgb(16,185,129)", "rgb(249,115,22)", "rgb(234,179,8)",
];

function avatarColor(employee: Employee | null) {
  if (!employee) return AVATAR_COLORS[0];
  const hash = (employee.email + (employee.first_name ?? "")).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function EmployeeDetailPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id: string }>();
  const publicId = String(params?.id || "").trim();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Term action
  const [termConfirm, setTermConfirm] = useState(false);
  const [termBusy, setTermBusy] = useState(false);
  const [termError, setTermError] = useState<string | null>(null);
  const [termSuccess, setTermSuccess] = useState<string | null>(null);

  // Reinstate action
  const [reinstateOpen, setReinstateOpen] = useState(false);
  const [reinstateRole, setReinstateRole] = useState("technician");
  const [reinstateBusy, setReinstateBusy] = useState(false);
  const [reinstateError, setReinstateError] = useState<string | null>(null);

  // Adjust roles action
  const [adjustRolesOpen, setAdjustRolesOpen] = useState(false);
  const [adjustRolesBusy, setAdjustRolesBusy] = useState(false);
  const [adjustRolesError, setAdjustRolesError] = useState<string | null>(null);
  const [adjustRolesSuccess, setAdjustRolesSuccess] = useState<string | null>(null);
  const [draftWorker, setDraftWorker] = useState(false);
  const [draftAdmin, setDraftAdmin] = useState(false);

  const employeeName = useMemo(() => {
    if (!employee) return "Employee";
    const full = [employee.first_name, employee.last_name].filter(Boolean).join(" ").trim();
    return full || employee.email || "Employee";
  }, [employee]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const auth = await me();
        if (!alive) return;
        if (!auth?.ok || !auth.user) { router.replace("/login"); return; }
        if (!isSuperUser(auth)) { router.replace("/account"); return; }
        if (!publicId) { setPageError("Missing employee id"); return; }
        const res = await getEmployee(publicId);
        if (!alive) return;
        setEmployee(res.employee ?? null);
      } catch (e: unknown) {
        if (!alive) return;
        setPageError(e instanceof Error ? e.message : "Failed to load employee");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [publicId, router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 animate-spin"
              style={{ borderColor: "rgb(var(--border))", borderTopColor: "transparent" }} />
            <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>Loading employee…</div>
          </div>
        </main>
      </>
    );
  }

  async function handleTerm() {
    if (!employee) return;
    setTermBusy(true);
    setTermError(null);
    setTermSuccess(null);
    try {
      const result = await termEmployee(employee.public_id);
      const res = await getEmployee(employee.public_id);
      setEmployee(res.employee ?? null);
      setTermConfirm(false);
      const count = result?.unassigned_bookings ?? 0;
      if (count > 0) {
        setTermSuccess(
          `${count} assigned booking${count === 1 ? "" : "s"} returned to the dispatch queue.`
        );
      } else {
        setTermSuccess("Employee access has been revoked.");
      }
    } catch (e: unknown) {
      setTermError(e instanceof Error ? e.message : "Failed to terminate employee");
    } finally {
      setTermBusy(false);
    }
  }

  async function handleReinstate() {
    if (!employee) return;
    setReinstateBusy(true);
    setReinstateError(null);
    try {
      await reinstateEmployee(employee.public_id, reinstateRole);
      const res = await getEmployee(employee.public_id);
      setEmployee(res.employee ?? null);
      setReinstateOpen(false);
    } catch (e: unknown) {
      setReinstateError(e instanceof Error ? e.message : "Failed to reinstate employee");
    } finally {
      setReinstateBusy(false);
    }
  }

  function openAdjustRoles() {
    if (!employee) return;
    const roles = Array.isArray(employee.roles) ? employee.roles : [];
    setDraftWorker(roles.includes("worker"));
    setDraftAdmin(roles.includes("admin"));
    setAdjustRolesError(null);
    setAdjustRolesSuccess(null);
    setAdjustRolesOpen(true);
  }

  async function handleAdjustRoles() {
    if (!employee) return;
    const roles: string[] = [];
    if (draftWorker) roles.push("worker");
    if (draftAdmin) roles.push("admin");
    if (roles.length === 0) {
      setAdjustRolesError("Select at least one role.");
      return;
    }
    setAdjustRolesBusy(true);
    setAdjustRolesError(null);
    setAdjustRolesSuccess(null);
    try {
      await adjustEmployeeRoles(employee.public_id, roles);
      const res = await getEmployee(employee.public_id);
      setEmployee(res.employee ?? null);
      setAdjustRolesSuccess("Roles updated successfully.");
      setAdjustRolesOpen(false);
    } catch (e: unknown) {
      setAdjustRolesError(e instanceof Error ? e.message : "Failed to update roles");
    } finally {
      setAdjustRolesBusy(false);
    }
  }

  const statusMeta = getStatusMeta(employee);
  const roleMeta = getRoleMeta(employee?.user_role);
  const StatusIcon = statusMeta.icon;
  const isTermed = !!employee?.termed_at;

  return (
    <div className="min-h-screen" style={{ background: "rgb(var(--background))" }}>
      <Navbar />

      {/* Page header */}
      <div className="border-b" style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ background: avatarColor(employee) }}>
                {getInitials(employee)}
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">{employeeName}</h1>
                <p className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                  {employee?.email ?? "Employee profile"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={() => router.push("/owner-dashboard/employees")}
                className="rounded-xl border px-3 py-1.5 text-xs font-semibold hover:opacity-80 transition-opacity"
                style={{ borderColor: "rgb(var(--border))", background: "transparent" }}>
                ← Employees
              </button>
              <button type="button" onClick={() => router.push("/account")}
                className="rounded-xl border px-3 py-1.5 text-xs font-semibold hover:opacity-80 transition-opacity"
                style={{ borderColor: "rgb(var(--border))", background: "transparent" }}>
                ← Account
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 -mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
            <div className="min-w-max">
              <OwnerRouteTabs pathname={pathname} loading={false} />
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-4 sm:px-6">
        {pageError && (
          <div className="rounded-xl border p-3 text-sm flex items-center gap-2"
            style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "rgb(239,68,68)" }}>
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {pageError}
          </div>
        )}

        {!pageError && employee && (
          <>
            {/* Hero card */}
            <div className="rounded-2xl border p-6"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                {/* Left: avatar + name */}
                <div className="flex items-center gap-5">
                  <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white"
                    style={{ background: avatarColor(employee) }}>
                    {getInitials(employee)}
                  </div>
                  <div>
                    <div className="text-xl font-bold">{employeeName}</div>
                    <div className="mt-0.5 text-sm" style={{ color: "rgb(var(--muted))" }}>{employee.email}</div>
                    {employee.phone && (
                      <div className="mt-0.5 text-sm" style={{ color: "rgb(var(--muted))" }}>{employee.phone}</div>
                    )}
                  </div>
                </div>

                {/* Right: badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
                    style={{ borderColor: roleMeta.border, background: roleMeta.bg, color: roleMeta.color }}>
                    <i className={`${roleMeta.icon} text-[10px]`} />
                    {roleMeta.label}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
                    style={{ borderColor: statusMeta.border, background: statusMeta.bg, color: statusMeta.color }}>
                    <StatusIcon className="h-3 w-3" />
                    {statusMeta.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Two-column info */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Profile */}
              <div className="rounded-2xl border p-5 space-y-4"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ background: "rgba(var(--fg), 0.07)" }}>
                    <i className="fa-solid fa-user text-[11px]" style={{ color: "rgb(var(--muted))" }} />
                  </div>
                  <div className="text-sm font-semibold">Profile</div>
                </div>

                <div className="space-y-3">
                  <InfoRow label="First name" value={employee.first_name} />
                  <InfoRow label="Last name" value={employee.last_name} />
                  <InfoRow label="Email" value={employee.email} />
                  <InfoRow label="Phone" value={employee.phone} />
                  <InfoRow label="Primary role" value={
                    <span className="rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                      style={{ borderColor: roleMeta.border, background: roleMeta.bg, color: roleMeta.color }}>
                      {roleMeta.label}
                    </span>
                  } />
                  {Array.isArray(employee.roles) && employee.roles.length > 0 && (
                    <InfoRow label="All roles" value={employee.roles.join(", ")} />
                  )}
                  <InfoRow label="Member since" value={formatDateOnly(employee.created_at)} />
                </div>
              </div>

              {/* Access & Onboarding */}
              <div className="rounded-2xl border p-5 space-y-4"
                style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg"
                    style={{ background: "rgba(var(--fg), 0.07)" }}>
                    <i className="fa-solid fa-key text-[11px]" style={{ color: "rgb(var(--muted))" }} />
                  </div>
                  <div className="text-sm font-semibold">Access &amp; Onboarding</div>
                </div>

                <div className="space-y-3">
                  {/* Email verified */}
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wide flex-shrink-0"
                      style={{ color: "rgb(var(--muted))" }}>Email verified</span>
                    {employee.email_verified_at ? (
                      <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "rgb(16,185,129)" }}>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {formatDateOnly(employee.email_verified_at)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm" style={{ color: "rgb(234,179,8)" }}>
                        <Clock className="h-3.5 w-3.5" />
                        Not yet verified
                      </span>
                    )}
                  </div>

                  {/* Password */}
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wide flex-shrink-0"
                      style={{ color: "rgb(var(--muted))" }}>Password set</span>
                    {employee.has_password ? (
                      <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "rgb(16,185,129)" }}>
                        <KeyRound className="h-3.5 w-3.5" />
                        Set
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm" style={{ color: "rgb(234,179,8)" }}>
                        <AlertCircle className="h-3.5 w-3.5" />
                        Not set
                      </span>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="h-px" style={{ background: "rgb(var(--border))" }} />

                  {/* Invite details */}
                  {employee.invite ? (
                    <>
                      <InfoRow label="Invite role" value={
                        employee.invite.invited_role ? (
                          <span className="rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                            style={(() => { const m = getRoleMeta(employee.invite.invited_role); return { borderColor: m.border, background: m.bg, color: m.color }; })()}>
                            {getRoleMeta(employee.invite.invited_role).label}
                          </span>
                        ) : null
                      } />
                      <InfoRow label="Invite sent" value={formatDateTime(employee.invite.created_at)} />
                      <InfoRow label="Invite expires" value={formatDateTime(employee.invite.expires_at)} />
                      <InfoRow label="Invite consumed" value={
                        employee.invite.consumed_at ? (
                          <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "rgb(16,185,129)" }}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {formatDateTime(employee.invite.consumed_at)}
                          </span>
                        ) : (
                          <span className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                            Not yet consumed
                          </span>
                        )
                      } />
                    </>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm"
                      style={{ borderColor: "rgb(var(--border))", background: "rgba(var(--bg), 0.25)", color: "rgb(var(--muted))" }}>
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      No invite record found
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Access Control */}
            <div className="rounded-2xl border p-5 space-y-4"
              style={{ borderColor: isTermed ? "rgba(239,68,68,0.25)" : "rgb(var(--border))", background: "rgb(var(--card))" }}>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ background: isTermed ? "rgba(239,68,68,0.1)" : "rgba(var(--fg), 0.07)" }}>
                  {isTermed
                    ? <XCircle className="h-4 w-4" style={{ color: "rgb(239,68,68)" }} />
                    : <i className="fa-solid fa-shield-halved text-[11px]" style={{ color: "rgb(var(--muted))" }} />}
                </div>
                <div className="text-sm font-semibold">Access Control</div>
              </div>

              {isTermed ? (
                <div className="space-y-4">
                  {/* Termed banner */}
                  <div className="rounded-xl border px-4 py-3 text-sm space-y-1"
                    style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)" }}>
                    <div className="font-semibold" style={{ color: "rgb(239,68,68)" }}>
                      Employment terminated
                    </div>
                    <div style={{ color: "rgb(var(--muted))" }}>
                      Termed on {formatDateTime(employee.termed_at)}. All access has been revoked. Booking and message history is preserved.
                    </div>
                  </div>
                  {termSuccess && (
                    <div className="rounded-xl border px-4 py-3 text-xs"
                      style={{ borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.07)", color: "rgb(16,185,129)" }}>
                      {termSuccess} Check the <strong>Dispatch</strong> page to reassign.
                    </div>
                  )}

                  {/* Reinstate */}
                  {!reinstateOpen ? (
                    <button type="button" onClick={() => { setReinstateOpen(true); setReinstateError(null); setReinstateRole(employee.user_role ?? "technician"); }}
                      className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition hover:opacity-90 active:scale-[0.97]"
                      style={{ borderColor: "rgba(16,185,129,0.4)", background: "rgba(16,185,129,0.08)", color: "rgb(16,185,129)" }}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reinstate Employee
                    </button>
                  ) : (
                    <div className="rounded-xl border p-4 space-y-3"
                      style={{ borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.05)" }}>
                      <div className="text-sm font-semibold" style={{ color: "rgb(16,185,129)" }}>
                        Reinstate &amp; send new invite
                      </div>
                      <p className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                        A setup email will be sent. The employee must create a new password before they can sign in.
                      </p>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>
                          Role
                        </label>
                        <select
                          value={reinstateRole}
                          onChange={(e) => setReinstateRole(e.target.value)}
                          disabled={reinstateBusy}
                          className="w-full rounded-xl border px-3 py-2 text-sm outline-none disabled:opacity-60"
                          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))", color: "rgb(var(--fg))" }}
                        >
                          <option value="technician">Technician</option>
                          <option value="admin">Admin</option>
                          <option value="superadmin">Super Admin</option>
                        </select>
                      </div>
                      {reinstateError && (
                        <p className="text-xs" style={{ color: "rgb(239,68,68)" }}>{reinstateError}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={handleReinstate} disabled={reinstateBusy}
                          className="rounded-xl border px-4 py-2 text-sm font-semibold transition hover:opacity-90 active:scale-[0.97] disabled:opacity-60"
                          style={{ borderColor: "rgba(16,185,129,0.4)", background: "rgba(16,185,129,0.1)", color: "rgb(16,185,129)" }}>
                          {reinstateBusy ? "Sending invite…" : "Send reinstate invite"}
                        </button>
                        <button type="button" onClick={() => setReinstateOpen(false)} disabled={reinstateBusy}
                          className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:opacity-80 disabled:opacity-60"
                          style={{ borderColor: "rgb(var(--border))", background: "transparent" }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                    Terminating an employee immediately revokes all access, signs them out of all devices, and locks their account. Booking and message history is fully preserved.
                  </p>

                  {adjustRolesSuccess && !adjustRolesOpen && !termConfirm && (
                    <div className="rounded-xl border px-4 py-3 text-xs"
                      style={{ borderColor: "rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.07)", color: "rgb(16,185,129)" }}>
                      {adjustRolesSuccess}
                    </div>
                  )}

                  {/* Action buttons — side by side when both collapsed, stacks on mobile */}
                  {!adjustRolesOpen && !termConfirm && (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={openAdjustRoles}
                        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:opacity-90 active:scale-[0.97]"
                        style={{ borderColor: "rgba(99,102,241,0.35)", background: "rgba(99,102,241,0.07)", color: "rgb(99,102,241)" }}>
                        <i className="fa-solid fa-user-pen text-[13px]" />
                        Adjust Roles
                      </button>
                      <button type="button" onClick={() => { setTermConfirm(true); setTermError(null); }}
                        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:opacity-90 active:scale-[0.97]"
                        style={{ borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.07)", color: "rgb(239,68,68)" }}>
                        <XCircle className="h-3.5 w-3.5" />
                        Terminate Employee
                      </button>
                    </div>
                  )}

                  {/* Adjust Roles expanded panel */}
                  {adjustRolesOpen && (
                    <div className="rounded-xl border p-4 space-y-3"
                      style={{ borderColor: "rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.05)" }}>
                      <div className="text-sm font-semibold" style={{ color: "rgb(99,102,241)" }}>
                        Adjust roles
                      </div>
                      <p className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                        Changes take effect immediately. Sessions are not revoked — the employee will use their new permissions on next action.
                      </p>
                      {Array.isArray(employee?.roles) && employee.roles.includes("superuser") && (
                        <div className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs"
                          style={{ borderColor: "rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.06)", color: "rgb(139,92,246)" }}>
                          <i className="fa-solid fa-shield-halved text-[11px]" />
                          Super Admin role is managed separately and cannot be changed here.
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition hover:bg-white/5"
                          style={{ borderColor: "rgb(var(--border))" }}>
                          <input
                            type="checkbox"
                            checked={draftWorker}
                            onChange={(e) => setDraftWorker(e.target.checked)}
                            disabled={adjustRolesBusy}
                            className="h-4 w-4 rounded accent-blue-500"
                          />
                          <div>
                            <div className="text-sm font-medium" style={{ color: "rgb(var(--fg))" }}>Technician</div>
                            <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>Can be assigned to bookings and set final completion price.</div>
                          </div>
                        </label>
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition hover:bg-white/5"
                          style={{ borderColor: "rgb(var(--border))" }}>
                          <input
                            type="checkbox"
                            checked={draftAdmin}
                            onChange={(e) => setDraftAdmin(e.target.checked)}
                            disabled={adjustRolesBusy}
                            className="h-4 w-4 rounded accent-indigo-500"
                          />
                          <div>
                            <div className="text-sm font-medium" style={{ color: "rgb(var(--fg))" }}>Admin</div>
                            <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>Can access dispatch, manage bookings, and view all customers.</div>
                          </div>
                        </label>
                      </div>
                      {adjustRolesError && (
                        <p className="text-xs" style={{ color: "rgb(239,68,68)" }}>{adjustRolesError}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={handleAdjustRoles} disabled={adjustRolesBusy || (!draftWorker && !draftAdmin)}
                          className="rounded-xl border px-4 py-2 text-sm font-semibold transition hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
                          style={{ borderColor: "rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.1)", color: "rgb(99,102,241)" }}>
                          {adjustRolesBusy ? "Saving…" : "Save roles"}
                        </button>
                        <button type="button" onClick={() => setAdjustRolesOpen(false)} disabled={adjustRolesBusy}
                          className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:opacity-80 disabled:opacity-60"
                          style={{ borderColor: "rgb(var(--border))", background: "transparent" }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Terminate confirmation panel */}
                  {termConfirm && (
                    <div className="rounded-xl border p-4 space-y-3"
                      style={{ borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.06)" }}>
                      <div className="text-sm font-semibold" style={{ color: "rgb(239,68,68)" }}>
                        Confirm termination
                      </div>
                      <p className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                        This will immediately revoke <strong>{employeeName}</strong>&apos;s access, sign them out of all devices, and lock their account. This cannot be undone without a reinstate.
                      </p>
                      {termError && (
                        <p className="text-xs" style={{ color: "rgb(239,68,68)" }}>{termError}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={handleTerm} disabled={termBusy}
                          className="rounded-xl border px-4 py-2 text-sm font-semibold transition hover:opacity-90 active:scale-[0.97] disabled:opacity-60"
                          style={{ borderColor: "rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.12)", color: "rgb(239,68,68)" }}>
                          {termBusy ? "Terminating…" : "Yes, terminate access"}
                        </button>
                        <button type="button" onClick={() => setTermConfirm(false)} disabled={termBusy}
                          className="rounded-xl border px-4 py-2 text-sm font-medium transition hover:opacity-80 disabled:opacity-60"
                          style={{ borderColor: "rgb(var(--border))", background: "transparent" }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null | React.ReactNode }) {
  const isEmpty = value === null || value === undefined || value === "";
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-semibold uppercase tracking-wide flex-shrink-0 pt-0.5"
        style={{ color: "rgb(var(--muted))" }}>
        {label}
      </span>
      <span className="text-sm text-right">
        {isEmpty ? <span style={{ color: "rgb(var(--muted))" }}>—</span> : value}
      </span>
    </div>
  );
}
