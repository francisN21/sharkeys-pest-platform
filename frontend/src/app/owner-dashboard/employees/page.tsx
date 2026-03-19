"use client";

import { useEffect, useState } from "react";
import Navbar from "../../../components/Navbar";
import { listEmployees, type Employee } from "../../../lib/api/employees";
import InviteEmployeeModal from "../../../components/su-dashboard/InviteEmployeeModal";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);

  async function load() {
    const res = await listEmployees();
    setEmployees(res.employees);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="h-screen overflow-y-auto">
      <Navbar />

      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold">Employees</h1>
            <p className="text-sm text-muted">
              Manage technicians and admins
            </p>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="rounded-xl px-4 py-2 text-sm font-semibold"
            style={{
              background: "rgb(var(--primary))",
              color: "rgb(var(--primary-fg))",
            }}
          >
            + Invite Employee
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="rounded-2xl border p-4"
              style={{
                borderColor: "rgb(var(--border))",
                background: "rgb(var(--card))",
              }}
            >
              <div className="font-semibold">
                {emp.first_name} {emp.last_name}
              </div>
              <div className="text-sm">{emp.email}</div>
              <div className="text-xs mt-2">
                Role: {emp.user_role}
              </div>

              <div className="text-xs mt-1">
                Status:{" "}
                {emp.email_verified_at ? "Active ✅" : "Pending ⏳"}
              </div>
            </div>
          ))}
        </div>
      </div>

      <InviteEmployeeModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={load}
      />
    </main>
  );
}