"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, Mail, RefreshCw } from "lucide-react";

import AuthTextField from "../../components/forms/AuthTextField";
import AuthPageShell from "../../components/auth/AuthPageShell";
import { confirmVerifyEmail, requestVerifyEmail } from "../../lib/api/auth";
import {
  verifyEmailSchema,
  type VerifyEmailValues,
} from "../../lib/validators/auth-recovery";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email")?.trim() || "";

  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);
  const [resendInfo, setResendInfo] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VerifyEmailValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      email: emailFromQuery,
      code: "",
    },
  });

  const emailValue = watch("email");

  useEffect(() => {
    if (emailFromQuery) {
      setValue("email", emailFromQuery, { shouldValidate: true });
    }
  }, [emailFromQuery, setValue]);

  const canResend = useMemo(() => emailValue.trim().length > 0, [emailValue]);

  async function onSubmit(values: VerifyEmailValues) {
    setServerError(null);
    setResendInfo(null);

    try {
      const res = await confirmVerifyEmail({
        email: values.email,
        code: values.code,
      });

      setAlreadyVerified(Boolean(res.alreadyVerified));
      setSuccess(true);
    } catch (e: unknown) {
      if (e instanceof Error) setServerError(e.message);
      else setServerError("Unable to verify email");
    }
  }

  async function handleResend() {
    if (!canResend || resendBusy) return;

    setServerError(null);
    setResendInfo(null);
    setResendBusy(true);

    try {
      const res = await requestVerifyEmail(emailValue);
      setResendInfo(
        res.message ||
          "If that account exists and is not yet verified, a verification email has been sent."
      );
    } catch (e: unknown) {
      if (e instanceof Error) setServerError(e.message);
      else setServerError("Unable to resend verification email");
    } finally {
      setResendBusy(false);
    }
  }

  return (
    <AuthPageShell
      title="Verify email"
      subtitle="Enter the 6-digit code from your email to finish securing your account."
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

        {resendInfo ? (
          <div
            className="rounded-xl border p-3 text-sm"
            style={{
              borderColor: "rgb(var(--border))",
              background: "rgba(var(--bg), 0.28)",
            }}
          >
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{resendInfo}</p>
            </div>
          </div>
        ) : null}

        {success ? (
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
                <p className="font-medium">
                  {alreadyVerified ? "Email already verified" : "Email verified"}
                </p>
                <p style={{ color: "rgb(var(--muted))" }}>
                  {alreadyVerified
                    ? "Your email was already verified. You can continue signing in."
                    : "Your email has been verified successfully. You can now continue using your account."}
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
          <>
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <AuthTextField
                label="Email"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register("email")}
              />

              <AuthTextField
                label="Verification code"
                type="text"
                placeholder="123456"
                inputMode="numeric"
                error={errors.code?.message}
                {...register("code")}
              />

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60"
                style={{
                  background: "rgb(var(--primary))",
                  color: "rgb(var(--primary-fg))",
                }}
              >
                {isSubmitting ? "Verifying..." : "Verify email"}
              </button>
            </form>

            <div className="flex items-center gap-3">
              <div
                className="h-px flex-1"
                style={{ background: "rgb(var(--border))" }}
              />
              <span
                className="text-xs uppercase tracking-wide"
                style={{ color: "rgb(var(--muted))" }}
              >
                Need another code?
              </span>
              <div
                className="h-px flex-1"
                style={{ background: "rgb(var(--border))" }}
              />
            </div>

            <button
              type="button"
              onClick={handleResend}
              disabled={!canResend || resendBusy}
              className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-60"
              style={{
                borderColor: "rgb(var(--border))",
                background: "transparent",
              }}
            >
              <RefreshCw className={`h-4 w-4 ${resendBusy ? "animate-spin" : ""}`} />
              <span>{resendBusy ? "Resending..." : "Resend verification email"}</span>
            </button>
          </>
        )}
      </div>
    </AuthPageShell>
  );
}