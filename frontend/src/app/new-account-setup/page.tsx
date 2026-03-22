"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldAlert,
  UserRoundPlus,
} from "lucide-react";

import AuthTextField from "../../components/forms/AuthTextField";
import PasswordRequirements from "../../components/auth/PasswordRequirements";
import { completeNewAccountSetup } from "../../lib/api/auth";

type FormValues = {
  password: string;
  confirmPassword: string;
};

export default function NewAccountSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = (searchParams.get("token") || "").trim();
  const email = (searchParams.get("email") || "").trim();
  const hasToken = token.length >= 20;

  const [serverError, setServerError] = useState<string | null>(null);
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const password = watch("password") || "";
  const confirmPassword = watch("confirmPassword") || "";

  const passwordsMatch = useMemo(() => {
    if (!password || !confirmPassword) return false;
    return password === confirmPassword;
  }, [password, confirmPassword]);

  const showMatchRow = password.length > 0 || confirmPassword.length > 0;

  async function onSubmit(values: FormValues) {
    setServerError(null);

    if (!hasToken) {
      setServerError("This setup link is missing or invalid.");
      return;
    }

    if (values.password !== values.confirmPassword) {
      setServerError("Passwords must match.");
      return;
    }

    try {
      await completeNewAccountSetup({
        token,
        password: values.password,
      });

      setSetupSuccess(true);

      setTimeout(() => {
        router.push("/account");
      }, 1200);
    } catch (e: unknown) {
      setServerError(e instanceof Error ? e.message : "Unable to complete account setup");
    }
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold hover:opacity-80"
            style={{ color: "rgb(var(--muted))" }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>

        <div
          className="rounded-3xl border p-6 shadow-sm sm:p-7"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          <div className="mb-6 space-y-3">
            <div
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border"
              style={{
                borderColor: "rgb(var(--border))",
                background: "rgba(var(--bg), 0.28)",
              }}
            >
              <UserRoundPlus className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Finish setting up your account
              </h1>
              <p
                className="mt-2 text-sm"
                style={{ color: "rgb(var(--muted))" }}
              >
                Create a password to activate your customer account and manage
                your bookings, messages, and service history online.
              </p>
            </div>

            {email ? (
              <div
                className="rounded-xl border px-3 py-2 text-sm"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgba(var(--bg), 0.22)",
                }}
              >
                <span style={{ color: "rgb(var(--muted))" }}>Account email: </span>
                <span className="font-medium">{email}</span>
              </div>
            ) : null}
          </div>

          {serverError ? (
            <div
              className="mb-4 rounded-xl border p-3 text-sm"
              style={{ borderColor: "rgb(239 68 68)" }}
            >
              {serverError}
            </div>
          ) : null}

          {!hasToken ? (
            <div
              className="rounded-xl border p-4 text-sm"
              style={{
                borderColor: "rgb(var(--border))",
                background: "rgba(var(--bg), 0.22)",
              }}
            >
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="space-y-2">
                  <p className="font-medium">Invalid setup link</p>
                  <p style={{ color: "rgb(var(--muted))" }}>
                    This link may be incomplete, expired, or already used.
                    Please request a fresh account setup email.
                  </p>
                </div>
              </div>
            </div>
          ) : setupSuccess ? (
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
                  <p className="font-medium">Account ready</p>
                  <p style={{ color: "rgb(var(--muted))" }}>
                    Your account has been set up successfully. Redirecting you now…
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
                    <p className="font-medium">Secure customer access</p>
                    <p style={{ color: "rgb(var(--muted))" }}>
                      Create a strong password. This setup link can only be used once.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Create password</label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-semibold hover:opacity-80"
                    style={{ color: "rgb(var(--muted))" }}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <AuthTextField
                  label=""
                  type={showPassword ? "text" : "password"}
                  error={errors.password?.message}
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 14,
                      message: "Password must be at least 14 characters",
                    },
                    validate: {
                      hasUppercase: (v) =>
                        /[A-Z]/.test(v) || "Must include an uppercase letter",
                      hasLowercase: (v) =>
                        /[a-z]/.test(v) || "Must include a lowercase letter",
                      hasNumber: (v) =>
                        /\d/.test(v) || "Must include a number",
                      hasSpecial: (v) =>
                        /[^A-Za-z0-9]/.test(v) || "Must include a special character",
                      noSpaces: (v) => !/\s/.test(v) || "No spaces allowed",
                    },
                  })}
                />
              </div>

              <PasswordRequirements password={password} />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Confirm password</label>
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-semibold hover:opacity-80"
                    style={{ color: "rgb(var(--muted))" }}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>

                <AuthTextField
                  label=""
                  type={showConfirmPassword ? "text" : "password"}
                  error={errors.confirmPassword?.message}
                  {...register("confirmPassword", {
                    required: "Please confirm your password",
                    validate: (value) =>
                      value === getValues("password") || "Passwords must match",
                  })}
                />
              </div>

              {showMatchRow ? (
                <div
                  className="rounded-xl border px-3 py-2 text-sm"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgba(var(--bg), 0.2)",
                  }}
                >
                  <span style={{ color: passwordsMatch ? "rgb(34 197 94)" : "rgb(239 68 68)" }}>
                    {passwordsMatch ? "Passwords match" : "Passwords must match"}
                  </span>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60"
                style={{
                  background: "rgb(var(--primary))",
                  color: "rgb(var(--primary-fg))",
                }}
              >
                {isSubmitting ? "Completing setup..." : "Complete account setup"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}