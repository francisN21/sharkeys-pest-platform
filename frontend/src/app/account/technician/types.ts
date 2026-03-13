import type { WorkerBookingRow } from "../../../lib/api/workerBookings";

export type MeShape = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
};

export type ApiErrorShape = {
  message?: string;
  error?: string;
  ok?: boolean;
};

export type MeApiUser = {
  id?: unknown;
  first_name?: string | null;
  last_name?: string | null;
};

export type MeApiResponse = {
  user?: MeApiUser | null;
};

export type RawBookingMessage = {
  id: number | string;
  sender_user_id: number | string;
  sender_role: string;
  body: string;
  created_at: string;
  updated_at?: string | null;
  delivered_at?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export type ListBookingMessagesResponse = {
  messages?: RawBookingMessage[];
};

export type BookingMessageMutationResponse = {
  message: RawBookingMessage;
};

export type BookingPrice = {
  initial_price_cents: number;
  final_price_cents: number | null;
  currency: string;
  set_by_user_id: number | null;
  set_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type BookingPriceResponse = {
  ok: boolean;
  price: BookingPrice;
};

export type GroupKey =
  | "needs_attention"
  | "starting_soon"
  | "today"
  | "tomorrow"
  | "this_week"
  | "later";

export type GroupedAssigned = {
  key: GroupKey;
  title: string;
  subtitle: string;
  rows: WorkerBookingRow[];
  tone?: "danger" | "normal";
  defaultExpanded: boolean;
};

export type BookeeKind = "lead" | "registered";