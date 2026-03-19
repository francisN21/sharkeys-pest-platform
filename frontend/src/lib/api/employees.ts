import { jsonFetch } from "./auth";

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
  status?: "active" | "invited" | "pending" | string | null;
  has_password?: boolean;
  email_verified_at: string | null;
  created_at: string;
  invite?: EmployeeInvite | null;
};

export function listEmployees() {
  return jsonFetch<{ ok: true; employees: Employee[] }>("/employees");
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

export function completeEmployeeSetup(payload: {
  token: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}) {
  return jsonFetch<{ ok: true }>("/employees/complete", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}