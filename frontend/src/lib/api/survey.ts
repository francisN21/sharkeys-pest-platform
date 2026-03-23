// lib/api/survey.ts
import { jsonFetch } from "./http";

export type SurveyCode =
  | "linkedin"
  | "google"
  | "instagram"
  | "facebook"
  | "referral"
  | "other";

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