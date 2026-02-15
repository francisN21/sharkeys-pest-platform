// lib/api/survey.ts
type ApiErrorShape = { message?: string; error?: string; ok?: boolean };

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_BASE;

function resolveUrl(path: string) {
  if (!API_BASE && !path.startsWith("http")) {
    throw new Error("Missing NEXT_PUBLIC_AUTH_API_BASE. Set it in .env.local (e.g. http://localhost:4000).");
  }
  return path.startsWith("http") ? path : `${API_BASE}${path}`;
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = resolveUrl(path);

  const res = await fetch(url, {
    ...init,
    headers: { ...(init?.headers || {}), "Content-Type": "application/json" },
    credentials: "include",
  });

  const data = (await res.json().catch(() => ({}))) as T & ApiErrorShape;

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}

export type SurveyCode = "linkedin" | "google" | "instagram" | "facebook" | "referred" | "other";

export type SurveyNeededResponse = { ok: boolean; needed: boolean };

export type SubmitSurveyPayload = {
  bookingPublicId?: string;
  heard_from: SurveyCode;
  referrer_name?: string;
  other_text?: string;
};

export type SubmitSurveyResponse = { ok: boolean; already_submitted?: boolean };

export function surveyNeeded() {
  return jsonFetch<SurveyNeededResponse>("/survey/needed", { method: "GET" });
}

export function submitSurvey(payload: SubmitSurveyPayload) {
  return jsonFetch<SubmitSurveyResponse>("/survey", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}