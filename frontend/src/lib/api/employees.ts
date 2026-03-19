import { jsonFetch } from "../api/auth";

export type Employee = {
  id: number;
  public_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  user_role: "superadmin" | "admin" | "technician";
  email_verified_at: string | null;
  created_at: string;
};

export function listEmployees() {
  return jsonFetch<{ ok: true; employees: Employee[] }>("/employees");
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
}) {
  return jsonFetch<{ ok: true }>("/employees/complete", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}