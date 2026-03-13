import type { BookingCard } from "../../../lib/api/bookings";

export type PersonLite = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
};

export type BookingCardWithOps = BookingCard & {
  assigned_to?: PersonLite | null;
  completed_by?: PersonLite | null;

  assigned_to_name?: string | null;
  assigned_to_phone?: string | null;
  assigned_to_email?: string | null;

  completed_by_name?: string | null;
  completed_by_phone?: string | null;
  completed_by_email?: string | null;

  assigned_worker_first_name?: string | null;
  assigned_worker_last_name?: string | null;
  assigned_worker_phone?: string | null;
  assigned_worker_email?: string | null;

  completed_by_first_name?: string | null;
  completed_by_last_name?: string | null;

  completed_at?: string | null;
};

export type UserRole = "customer" | "technician" | "worker" | "admin" | "superadmin" | "superuser" | string;

export type MeShape = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  role?: UserRole | null;
};