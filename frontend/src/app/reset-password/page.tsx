"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Mail, ShieldAlert } from "lucide-react";

import AuthTextField from "../../components/forms/AuthTextField";
import AuthPageShell from "../../components/auth/AuthPageShell";
import { forgotPassword, resetPassword } from "../../lib/api/auth";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordValues,
  type ResetPasswordValues,
} from "../../lib/validators/auth-recovery";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const emailFromQuery = searchParams.get("email")?.trim() || "";

  const hasToken = token.length >= 20;

  const [serverError, setServerError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  const resetForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const requestForm = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: emailFromQuery,
    },
  });

  async function onSubmitReset(values: ResetPasswordValues) {
    setServerError(null);
    setRequestSuccess(null);

    try {
      await resetPassword({
        token,
        password: values.password,
      });
      setResetSuccess(true);
    } catch (e: unknown) {
      if (e instanceof Error) setServerError(e.message);
      else setServerError("Unable to reset password");
    }
  }

  async function onSubmitRequest(values: ForgotPasswordValues) {
    setServerError(null);
    setRequestSuccess(null);

    try {
      const res = await forgotPassword(values.email);
      setRequestSuccess(
        res.message ||
          `If an account exists for ${values.email}, a password reset email has been sent.`
      );
    } catch (e: unknown) {
      if (e instanceof Error) setServerError(e.message);
      else setServerError("Unable to send reset email");
    }
  }

  return (
    <AuthPageShell
      title="Reset password"
      subtitle={
        hasToken
          ? emailFromQuery
            ? `Choose a new password for ${emailFromQuery}.`
            : "Choose a new password for your account."
          : "Enter your email and we’ll send you a secure password reset link."
      }
      footer={
        <Link
          href="/login"
          className="inline-flex items-center gap-2 font-semibold hover:underline"
          style={{ color: "rgb(var(--fg))" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
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

        {!hasToken ? (
          <>
            <div
              className="rounded-xl border p-3 text-sm"
              style={{
                borderColor: "rgb(var(--border))",
                background: "rgba(var(--bg), 0.22)",
              }}
            >
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Need a reset link?</p>
                  <p style={{ color: "rgb(var(--muted))" }}>
                    Enter your email below and we&apos;ll send you instructions to reset your password.
                  </p>
                </div>
              </div>
            </div>

            {requestSuccess ? (
              <div
                className="rounded-xl border p-4 text-sm"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgba(var(--bg), 0.28)",
                }}
              >
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="space-y-2">
                    <p className="font-medium">Check your inbox</p>
                    <p style={{ color: "rgb(var(--muted))" }}>{requestSuccess}</p>
                    <p style={{ color: "rgb(var(--muted))" }}>
                      For security, we show the same response whether or not the email exists.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <form
              className="space-y-4"
              onSubmit={requestForm.handleSubmit(onSubmitRequest)}
            >
              <AuthTextField
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={requestForm.formState.errors.email?.message}
                {...requestForm.register("email")}
              />

              <button
                type="submit"
                disabled={requestForm.formState.isSubmitting}
                className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60"
                style={{
                  background: "rgb(var(--primary))",
                  color: "rgb(var(--primary-fg))",
                }}
              >
                {requestForm.formState.isSubmitting
                  ? "Sending reset link..."
                  : "Send reset link"}
              </button>
            </form>
          </>
        ) : resetSuccess ? (
          <div
            className="rounded-xl border p-4 text-sm"
            style={{
              borderColor: "rgb(var(--border))",
              background: "rgba(var(--bg), 0.28)",
            }}
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-2">
                <p className="font-medium">Password updated</p>
                <p style={{ color: "rgb(var(--muted))" }}>
                  Your password has been reset successfully. You can now sign in with your new password.
                </p>
                <Link
                  href="/login"
                  className="font-semibold hover:underline"
                  style={{ color: "rgb(var(--fg))" }}
                >
                  Go to sign in
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={resetForm.handleSubmit(onSubmitReset)}
          >
            <AuthTextField
              label="New password"
              type="password"
              error={resetForm.formState.errors.password?.message}
              {...resetForm.register("password")}
            />

            <AuthTextField
              label="Confirm new password"
              type="password"
              error={resetForm.formState.errors.confirmPassword?.message}
              {...resetForm.register("confirmPassword")}
            />

            <button
              type="submit"
              disabled={resetForm.formState.isSubmitting}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60"
              style={{
                background: "rgb(var(--primary))",
                color: "rgb(var(--primary-fg))",
              }}
            >
              {resetForm.formState.isSubmitting
                ? "Resetting password..."
                : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </AuthPageShell>
  );
}