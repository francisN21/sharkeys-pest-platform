export type MeShape = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
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

export type PersonKind = "lead" | "registered";