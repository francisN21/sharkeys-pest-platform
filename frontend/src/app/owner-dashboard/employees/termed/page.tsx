"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RefreshCcw, XCircle } from "lucide-react";
import Navbar from "../../../../components/Navbar";
import { listEmployees, type Employee } from "../../../../lib/api/employees";
import { me, type MeResponse } from "../../../../lib/api/auth";
import OwnerRouteTabs from "../../_components/owner-route-tabs";

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

function getInitials(emp: Employee) {
  const first = emp.first_name?.trim()[0] ?? "";
  const last = emp.last_name?.trim()[0] ?? "";
  return (first + last).toUpperCase() || emp.email[0].toUpperCase();
}

function getRoleMeta(role?: string | null) {
  switch ((role ?? "").toLowerCase()) {
    case "superadmin": return { label: "Super Admin", color: "rgb(139,92,246)", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.3)" };
    case "admin":      return { label: "Admin",       color: "rgb(99,102,241)",  bg: "rgba(99,102,241,0.1)",  border: "rgba(99,102,241,0.3)" };
    default:           return { label: "Technician",  color: "rgb(59,130,246)",  bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.3)" };
  }
}

function formatDateOnly(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const AVATAR_COLORS = [
  "rgb(59,130,246)", "rgb(99,102,241)", "rgb(139,92,246)",
  "rgb(16,185,129)", "rgb(249,115,22)", "rgb(234,179,8)",
];

function avatarColor(emp: Employee) {
  const hash = (emp.email + (emp.first_name ?? "")).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function TermedEmployeesPage() {
  const pathname = usePathname();
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    const res = await listEmployees({ termed: true });
    setEmployees(res.employees ?? []);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const auth = await me();
        if (!alive) return;
        if (!auth?.ok || !auth.user) { router.replace("/login"); return; }
        if (!isSuperUser(auth)) { router.replace("/account"); return; }
        const res = await listEmployees({ termed: true });
        if (!alive) return;
        setEmployees(res.employees ?? []);
      } catch (e: unknown) {
        if (!alive) return;
        setPageError(e instanceof Error ? e.message : "Failed to load termed employees");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router]);

  async function handleRefresh() {
    setRefreshing(true);
    try { await loadEmployees(); } finally { setRefreshing(false); }
  }

  const stats = useMemo(() => {
    const technicians = employees.filter((e) => (e.user_role ?? "").toLowerCase() === "technician").length;
    const admins = employees.filter((e) => ["admin", "superadmin"].includes((e.user_role ?? "").toLowerCase())).length;
    return { total: employees.length, technicians, admins };
  }, [employees]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-16 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 animate-spin"
              style={{ borderColor: "rgb(var(--border))", borderTopColor: "transparent" }} />
            <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>Loading termed employees…</div>
          </div>
        </main>
      </>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "rgb(var(--background))" }}>
      <Navbar />

      {/* Page header */}
      <div className="border-b" style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border"
                style={{ borderColor: "rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.07)" }}>
                <XCircle className="h-5 w-5" style={{ color: "rgb(239,68,68)" }} />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Termed Employees</h1>
                <p className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                  Former staff · Access revoked · History preserved
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={handleRefresh} disabled={refreshing}
                className="rounded-xl border px-3 py-1.5 text-xs font-semibold hover:opacity-80 disabled:opacity-50 transition-opacity"
                style={{ borderColor: "rgb(var(--border))", background: "transparent" }}>
                <span className="inline-flex items-center gap-1.5">
                  <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                  {refreshing ? "Refreshing…" : "Refresh"}
                </span>
              </button>
              <button type="button" onClick={() => router.push("/owner-dashboard/employees")}
                className="rounded-xl border px-3 py-1.5 text-xs font-semibold hover:opacity-80 transition-opacity"
                style={{ borderColor: "rgb(var(--border))", background: "transparent" }}>
                ← Active Employees
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

      <main className="mx-auto max-w-6xl px-4 py-8 space-y-6 sm:px-6">
        {pageError && (
          <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239,68,68)", color: "rgb(239,68,68)" }}>
            {pageError}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total termed" value={stats.total} color="rgb(239,68,68)" />
          <StatCard label="Technicians" value={stats.technicians} color="rgb(59,130,246)" />
          <StatCard label="Admins / Super" value={stats.admins} color="rgb(99,102,241)" />
        </div>

        {/* Employee grid */}
        <div>
          {employees.length === 0 ? (
            <div className="rounded-2xl border p-12 text-center"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl mx-auto mb-4"
                style={{ background: "rgba(239,68,68,0.07)" }}>
                <XCircle className="h-7 w-7" style={{ color: "rgba(239,68,68,0.5)" }} />
              </div>
              <div className="text-sm font-semibold mb-1">No termed employees</div>
              <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
                Terminated employees will appear here.
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {employees.map((emp) => {
                const role = getRoleMeta(emp.user_role);
                const initials = getInitials(emp);
                const color = avatarColor(emp);
                const name = [emp.first_name, emp.last_name].filter(Boolean).join(" ") || emp.email;

                return (
                  <button
                    key={emp.public_id || emp.id}
                    type="button"
                    onClick={() => router.push(`/owner-dashboard/employees/${emp.public_id}`)}
                    className="rounded-2xl border p-5 text-left transition-all hover:opacity-90 hover:-translate-y-0.5 hover:shadow-lg"
                    style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgb(var(--card))" }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar — desaturated for termed */}
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white opacity-60"
                        style={{ background: color }}>
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold truncate text-sm">{name}</div>
                          <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold flex-shrink-0"
                            style={{ borderColor: "rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.08)", color: "rgb(239,68,68)" }}>
                            Termed
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs truncate" style={{ color: "rgb(var(--muted))" }}>
                          {emp.email}
                        </div>
                        {emp.termed_at && (
                          <div className="mt-0.5 text-xs" style={{ color: "rgb(var(--muted))" }}>
                            Termed {formatDateOnly(emp.termed_at)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="rounded-full border px-2.5 py-0.5 text-xs font-semibold opacity-70"
                        style={{ borderColor: role.border, background: role.bg, color: role.color }}>
                        {role.label}
                      </span>
                      <span className="text-xs" style={{ color: "rgb(var(--muted))" }}>
                        Reinstate →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-2xl border p-4"
      style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}>
      <div className="text-xs font-semibold" style={{ color: "rgb(var(--muted))" }}>{label}</div>
      <div className="mt-1 text-2xl font-bold" style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}
