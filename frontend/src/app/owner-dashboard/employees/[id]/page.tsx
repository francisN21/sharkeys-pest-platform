"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Navbar from "../../../../components/Navbar";
import OwnerRouteTabs from "../../_components/owner-route-tabs";
import { me, type MeResponse } from "../../../../lib/api/auth";
import { getEmployee, type Employee } from "../../../../lib/api/employees";

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

  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusLabel(employee: Employee | null) {
  if (!employee) return "—";
  if (employee.status === "active") return "Active ✅";
  if (employee.status === "invited") return "Invited ⏳";
  if (employee.status === "pending") return "Pending ⏳";
  if (employee.email_verified_at) return "Active ✅";
  return "Pending ⏳";
}

function detailRow(label: string, value?: string | null) {
  return (
    <div className="grid gap-1 sm:grid-cols-[160px_1fr] sm:gap-4">
      <div
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: "rgb(var(--muted))" }}
      >
        {label}
      </div>
      <div className="text-sm">{value && value.trim().length > 0 ? value : "—"}</div>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id: string }>();

  const publicId = String(params?.id || "").trim();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

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

        if (!auth?.ok || !auth.user) {
          router.replace("/login");
          return;
        }

        if (!isSuperUser(auth)) {
          router.replace("/account");
          return;
        }

        if (!publicId) {
          setPageError("Missing employee id");
          return;
        }

        const res = await getEmployee(publicId);
        if (!alive) return;

        setEmployee(res.employee ?? null);
      } catch (e: unknown) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Failed to load employee";
        setPageError(msg);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [publicId, router]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div
          className="rounded-2xl border p-4 text-sm"
          style={{ borderColor: "rgb(var(--border))" }}
        >
          Loading employee…
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
            <h1 className="text-2xl font-semibold">{employeeName}</h1>
            <p className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
              Employee account details, role status, and onboarding state.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => router.push("/owner-dashboard/employees")}
              className="rounded-xl border px-3 py-2 text-sm font-semibold hover:opacity-90"
              style={{
                borderColor: "rgb(var(--border))",
                background: "rgb(var(--card))",
              }}
            >
              Back to Employees
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

        {!pageError && employee ? (
          <>
            <div
              className="rounded-2xl border p-4 sm:p-5 md:p-6"
              style={{
                borderColor: "rgb(var(--border))",
                background: "rgb(var(--card))",
              }}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xl font-semibold">{employeeName}</div>
                  <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
                    {employee.email}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <div
                    className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                    style={{
                      borderColor: "rgb(var(--border))",
                      background: "rgb(var(--bg))",
                    }}
                  >
                    {employee.user_role || "employee"}
                  </div>

                  <div
                    className="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide"
                    style={{
                      borderColor: "rgb(var(--border))",
                      background: "rgb(var(--bg))",
                    }}
                  >
                    {getStatusLabel(employee)}
                  </div>
                </div>
              </div>
            </div>

            <div
              className="rounded-2xl border p-4 sm:p-5 md:p-6"
              style={{
                borderColor: "rgb(var(--border))",
                background: "rgb(var(--card))",
              }}
            >
              <h2 className="text-lg font-semibold">Profile</h2>
              <div className="mt-4 space-y-4">
                {detailRow("First name", employee.first_name)}
                {detailRow("Last name", employee.last_name)}
                {detailRow("Email", employee.email)}
                {detailRow("Phone", employee.phone ?? null)}
                {detailRow("Primary role", employee.user_role ?? null)}
                {detailRow(
                  "All roles",
                  Array.isArray(employee.roles) && employee.roles.length > 0
                    ? employee.roles.join(", ")
                    : null
                )}
                {detailRow("Created", formatDateTime(employee.created_at))}
              </div>
            </div>

            <div
              className="rounded-2xl border p-4 sm:p-5 md:p-6"
              style={{
                borderColor: "rgb(var(--border))",
                background: "rgb(var(--card))",
              }}
            >
              <h2 className="text-lg font-semibold">Access & onboarding</h2>
              <div className="mt-4 space-y-4">
                {detailRow("Status", getStatusLabel(employee))}
                {detailRow(
                  "Email verified",
                  employee.email_verified_at ? formatDateTime(employee.email_verified_at) : "Not yet verified"
                )}
                {detailRow(
                  "Password set",
                  employee.has_password ? "Yes" : "No"
                )}
                {detailRow(
                  "Invite role",
                  employee.invite?.invited_role ?? null
                )}
                {detailRow(
                  "Invite created",
                  employee.invite?.created_at ? formatDateTime(employee.invite.created_at) : null
                )}
                {detailRow(
                  "Invite expires",
                  employee.invite?.expires_at ? formatDateTime(employee.invite.expires_at) : null
                )}
                {detailRow(
                  "Invite consumed",
                  employee.invite?.consumed_at ? formatDateTime(employee.invite.consumed_at) : "Not yet consumed"
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}