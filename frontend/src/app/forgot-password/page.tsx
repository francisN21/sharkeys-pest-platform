"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Mail } from "lucide-react";

import AuthTextField from "../../components/forms/AuthTextField";
import AuthPageShell from "../../components/auth/AuthPageShell";
import { forgotPassword } from "../../lib/api/auth";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "../../lib/validators/auth-recovery";

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const currentEmail = watch("email");
  const successMessage = useMemo(() => {
    if (!submittedEmail) return null;
    return `If an account exists for ${submittedEmail}, a password reset email has been sent.`;
  }, [submittedEmail]);

  async function onSubmit(values: ForgotPasswordValues) {
    setServerError(null);

    try {
      await forgotPassword(values.email);
      setSubmittedEmail(values.email);
    } catch (e: unknown) {
      if (e instanceof Error) setServerError(e.message);
      else setServerError("Unable to process your request");
    }
  }

  return (
    <AuthPageShell
      title="Forgot password"
      subtitle="Enter your email and we’ll send you a secure password reset link."
      footer={
        <>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 font-semibold hover:underline"
            style={{ color: "rgb(var(--fg))" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        {serverError ? (
          <div
            className="rounded-xl border p-3 text-sm"
            style={{ borderColor: "rgb(239 68 68)" }}
          >
            {serverError}
          </div>
        ) : null}

        {successMessage ? (
          <div
            className="rounded-xl border p-3 text-sm"
            style={{
              borderColor: "rgb(var(--border))",
              background: "rgba(var(--bg), 0.28)",
            }}
          >
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">Check your inbox</p>
                <p style={{ color: "rgb(var(--muted))" }}>{successMessage}</p>
                <p style={{ color: "rgb(var(--muted))" }}>
                  For security, we show the same response whether or not the email exists.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <AuthTextField
            label="Email"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register("email")}
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
            style={{
              background: "rgb(var(--primary))",
              color: "rgb(var(--primary-fg))",
            }}
          >
            {isSubmitting ? "Sending reset link..." : "Send reset link"}
          </button>
        </form>

        <div className="text-center text-sm" style={{ color: "rgb(var(--muted))" }}>
          Remembered your password?{" "}
          <Link
            href="/login"
            className="font-semibold hover:underline"
            style={{ color: "rgb(var(--fg))" }}
          >
            Sign in
          </Link>
        </div>

        {submittedEmail && currentEmail && currentEmail === submittedEmail ? (
          <div className="text-center text-sm" style={{ color: "rgb(var(--muted))" }}>
            Didn&apos;t get the email? Wait a minute, then try again.
          </div>
        ) : null}
      </div>
    </AuthPageShell>
  );
}