import { jsonFetch } from "./http";

export type EmployeeInvite = {
  invited_role?: "superadmin" | "admin" | "technician" | string | null;
  expires_at?: string | null;
  consumed_at?: string | null;
  created_at?: string | null;
};

export type Employee = {
  id: number;
  public_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone?: string | null;
  user_role?: "superadmin" | "admin" | "technician" | string | null;
  roles?: string[] | null;
  status?: "active" | "invited" | "pending" | "termed" | string | null;
  has_password?: boolean;
  email_verified_at: string | null;
  created_at: string;
  termed_at?: string | null;
  invite?: EmployeeInvite | null;
};

export function listEmployees(options?: { termed?: boolean }) {
  const url = options?.termed ? "/employees?termed=true" : "/employees";
  return jsonFetch<{ ok: true; employees: Employee[] }>(url);
}

export function getEmployee(publicId: string) {
  return jsonFetch<{ ok: true; employee: Employee }>(`/employees/${publicId}`);
}

export function inviteEmployee(payload: {
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  user_role: string;
}) {
  return jsonFetch<{ ok: true }>("/employees/invite", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function termEmployee(publicId: string) {
  return jsonFetch<{ ok: true; unassigned_bookings: number }>(`/employees/${publicId}/term`, {
    method: "POST",
  });
}

export function reinstateEmployee(publicId: string, user_role: string) {
  return jsonFetch<{ ok: true }>(`/employees/${publicId}/reinstate`, {
    method: "POST",
    body: JSON.stringify({ user_role }),
  });
}

export function completeEmployeeSetup(payload: {
  token: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}) {
  return jsonFetch<{
    ok: true;
    user: { public_id: string; email: string; user_role: string };
    session: { expiresAt: string };
  }>("/employees/complete", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}