"use client";

import { useState } from "react";
import { inviteEmployee } from "../../lib/api/employees";

export default function InviteEmployeeModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone: "",
    user_role: "technician",
  });

  if (!open) return null;

  async function submit() {
    await inviteEmployee(form);
    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="rounded-2xl p-6 w-full max-w-md bg-card border">
        <h2 className="text-lg font-semibold mb-4">Invite Employee</h2>

        <input placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="First name" onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        <input placeholder="Last name" onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        <input placeholder="Phone" onChange={(e) => setForm({ ...form, phone: e.target.value })} />

        <select onChange={(e) => setForm({ ...form, user_role: e.target.value })}>
          <option value="technician">Technician</option>
          <option value="admin">Admin</option>
          <option value="superadmin">Super Admin</option>
        </select>

        <div className="flex gap-2 mt-4">
          <button onClick={submit}>Send Invite</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}