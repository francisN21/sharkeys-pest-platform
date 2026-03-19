"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Navbar from "../../../components/Navbar";
import { listEmployees, type Employee } from "../../../lib/api/employees";
import { me, type MeResponse } from "../../../lib/api/auth";
import InviteEmployeeModal from "../../../components/su-dashboard/InviteEmployeeModal";
import OwnerRouteTabs from "../_components/owner-route-tabs";

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

function getStatusLabel(emp: Employee) {
  if (emp.status === "active") return "Active ✅";
  if (emp.status === "invited") return "Invited ⏳";
  return emp.email_verified_at ? "Active ✅" : "Pending ⏳";
}

export default function EmployeesPage() {
  const pathname = usePathname();
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const loadEmployees = useCallback(async () => {
    const res = await listEmployees();
    setEmployees(res.employees ?? []);
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const auth = await me();
        if (!alive) return;

        if (!auth?.ok || !auth.user) {
          router.replace("/login");
          return;
        }

        if (!isSuperUser(auth)) {
          router.replace("/account");
          return;
        }

        const res = await listEmployees();
        if (!alive) return;

        setEmployees(res.employees ?? []);
      } catch (e: unknown) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Failed to load employees";
        setPageError(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  async function handleInviteSuccess() {
    await loadEmployees();
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div
          className="rounded-2xl border p-4 text-sm"
          style={{ borderColor: "rgb(var(--border))" }}
        >
          Loading employees…
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-y-auto scroll-smooth md:snap-y md:snap-mandatory">
      <Navbar />

      <div className="mx-auto max-w-6xl px-3 py-6 space-y-4 sm:px-4 sm:py-8 md:py-10 md:space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Employees</h1>
            <p className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
              Manage technicians, admins, and owner-level staff onboarding.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-xl px-4 py-2 text-sm font-semibold hover:opacity-90"
              style={{
                background: "rgb(var(--primary))",
                color: "rgb(var(--primary-fg))",
              }}
            >
              Invite Employee
            </button>

            <button
              type="button"
              onClick={() => router.push("/account")}
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
              style={{
                borderColor: "rgb(var(--border))",
                background: "rgb(var(--card))",
              }}
            >
              Back to Account
            </button>
          </div>
        </div>

        <div
          className="w-full border-b pb-3 sm:pb-4"
          style={{ borderColor: "rgb(var(--border))" }}
        >
          <div className="-mx-3 overflow-x-auto px-3 sm:mx-0 sm:px-0">
            <div className="min-w-max">
              <OwnerRouteTabs pathname={pathname} loading={loading} />
            </div>
          </div>
        </div>

        {pageError ? (
          <div
            className="rounded-2xl border p-4 text-sm"
            style={{ borderColor: "rgb(239 68 68)" }}
          >
            {pageError}
          </div>
        ) : null}

        <div
          className="rounded-2xl border p-4 sm:p-5 md:p-6"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          {employees.length === 0 ? (
            <div className="text-sm" style={{ color: "rgb(var(--muted))" }}>
              No employees yet. Invite your first technician or admin to get started.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {employees.map((emp) => (
                <button
                  key={emp.public_id || emp.id}
                  type="button"
                  onClick={() => router.push(`/owner-dashboard/employees/${emp.public_id}`)}
                  className="rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgb(var(--bg))",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">
                        {[emp.first_name, emp.last_name].filter(Boolean).join(" ") || emp.email}
                      </div>
                      <div
                        className="mt-1 text-sm break-all"
                        style={{ color: "rgb(var(--muted))" }}
                      >
                        {emp.email}
                      </div>
                    </div>

                    <div
                      className="rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                      style={{
                        borderColor: "rgb(var(--border))",
                        background: "rgb(var(--card))",
                      }}
                    >
                      {emp.user_role || "employee"}
                    </div>
                  </div>

                  <div className="mt-4 space-y-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
                    <div>Status: {getStatusLabel(emp)}</div>
                    {emp.phone ? <div>Phone: {emp.phone}</div> : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <InviteEmployeeModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={handleInviteSuccess}
      />
    </main>
  );
}