"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";

import AuthTextField from "../../components/forms/AuthTextField";
import AuthPageShell from "../../components/auth/AuthPageShell";
import { resetPassword } from "../../lib/api/auth";
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "../../lib/validators/auth-recovery";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const email = searchParams.get("email")?.trim() || "";

  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const tokenMissing = useMemo(() => token.length < 20, [token]);

  async function onSubmit(values: ResetPasswordValues) {
    if (tokenMissing) return;

    setServerError(null);

    try {
      await resetPassword({
        token,
        password: values.password,
      });
      setSuccess(true);
    } catch (e: unknown) {
      if (e instanceof Error) setServerError(e.message);
      else setServerError("Unable to reset password");
    }
  }

  return (
    <AuthPageShell
      title="Reset password"
      subtitle={
        email
          ? `Choose a new password for ${email}.`
          : "Choose a new password for your account."
      }
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
        {tokenMissing ? (
          <div
            className="rounded-xl border p-3 text-sm"
            style={{ borderColor: "rgb(239 68 68)" }}
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Invalid reset link</p>
                <p style={{ color: "rgb(var(--muted))" }}>
                  This reset link is missing required information or is malformed.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {serverError ? (
          <div
            className="rounded-xl border p-3 text-sm"
            style={{ borderColor: "rgb(239 68 68)" }}
          >
            {serverError}
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
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <AuthTextField
              label="New password"
              type="password"
              error={errors.password?.message}
              {...register("password")}
            />

            <AuthTextField
              label="Confirm new password"
              type="password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />

            <button
              type="submit"
              disabled={isSubmitting || tokenMissing}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60"
              style={{
                background: "rgb(var(--primary))",
                color: "rgb(var(--primary-fg))",
              }}
            >
              {isSubmitting ? "Resetting password..." : "Reset password"}
            </button>
          </form>
        )}
      </div>
    </AuthPageShell>
  );
}