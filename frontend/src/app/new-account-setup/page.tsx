"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Mail,
  ShieldAlert,
  UserRoundPlus,
  X,
} from "lucide-react";

import AuthTextField from "../../components/forms/AuthTextField";
import AuthPageShell from "../../components/auth/AuthPageShell";
import PasswordRequirements from "../../components/auth/PasswordRequirements";
import { completeNewAccountSetup } from "../../lib/api/auth";
import { notifyAuthChanged } from "../../components/AuthProvider";

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
      notifyAuthChanged();

      setTimeout(() => {
        router.push("/account");
      }, 1200);
    } catch (e: unknown) {
      setServerError(
        e instanceof Error ? e.message : "Unable to complete account setup"
      );
    }
  }

  return (
    <AuthPageShell
      title="Finish setting up your account"
      subtitle="Create a password to activate your customer account and manage your bookings, messages, and service history online."
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
        {email ? (
          <div
            className="rounded-xl border p-3 text-sm"
            style={{
              borderColor: "rgb(var(--border))",
              background: "rgba(var(--bg), 0.28)",
            }}
          >
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-medium">Account email</p>
                <p style={{ color: "rgb(var(--muted))" }}>{email}</p>
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

        {!hasToken ? (
          <div
            className="rounded-xl border p-4 text-sm"
            style={{
              borderColor: "rgb(var(--border))",
              background: "rgba(var(--bg), 0.28)",
            }}
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">Invalid setup link</p>
                <p style={{ color: "rgb(var(--muted))" }}>
                  This link may be incomplete, expired, or already used. Please
                  request a fresh account setup email.
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
              <div className="space-y-1">
                <p className="font-medium">Account ready</p>
                <p style={{ color: "rgb(var(--muted))" }}>
                  Your account has been set up successfully. Redirecting you
                  now…
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div
              className="rounded-xl border p-3 text-sm"
              style={{
                borderColor: "rgb(var(--border))",
                background: "rgba(var(--bg), 0.28)",
              }}
            >
              <div className="flex items-start gap-3">
                <UserRoundPlus className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">Secure customer access</p>
                  <p style={{ color: "rgb(var(--muted))" }}>
                    Create a strong password. This setup link can only be used
                    once.
                  </p>
                </div>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <AuthTextField
                label="Create password"
                type="password"
                showToggle
                placeholder="Create a strong password"
                error={errors.password?.message}
                {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 14,
                      message: "Password must be at least 14 characters",
                    },
                    validate: {
                      hasUppercase: (v) =>
                        /[A-Z]/.test(v) ||
                        "Must include an uppercase letter",
                      hasLowercase: (v) =>
                        /[a-z]/.test(v) ||
                        "Must include a lowercase letter",
                      hasNumber: (v) =>
                        /\d/.test(v) || "Must include a number",
                      hasSpecial: (v) =>
                        /[^A-Za-z0-9]/.test(v) ||
                        "Must include a special character",
                      noSpaces: (v) => !/\s/.test(v) || "No spaces allowed",
                    },
                  })}
              />

              <PasswordRequirements password={password} />

              <AuthTextField
                label="Confirm password"
                type="password"
                showToggle
                placeholder="Re-enter your password"
                error={errors.confirmPassword?.message}
                {...register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (value) =>
                    value === getValues("password") || "Passwords must match",
                })}
              />

              {showMatchRow ? (
                <div
                  className="rounded-xl border p-3"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgba(var(--bg), 0.2)",
                  }}
                >
                  <div className="flex items-center gap-2 text-sm">
                    {passwordsMatch ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                    <span style={{ opacity: passwordsMatch ? 1 : 0.8 }}>
                      {passwordsMatch ? "Passwords match" : "Passwords must match"}
                    </span>
                  </div>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
                style={{
                  background: "rgb(var(--primary))",
                  color: "rgb(var(--primary-fg))",
                }}
              >
                {isSubmitting ? "Completing setup..." : "Complete account setup"}
              </button>
            </form>
          </>
        )}
      </div>
    </AuthPageShell>
  );
}