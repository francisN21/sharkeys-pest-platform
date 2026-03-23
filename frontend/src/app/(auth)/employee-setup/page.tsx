"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import {
  CheckCircle2,
  ShieldAlert,
  Eye,
  EyeOff,
  Check,
  X,
} from "lucide-react";

import AuthTextField from "../../../components/forms/AuthTextField";
import PasswordRequirements from "../../../components/auth/PasswordRequirements";
import { completeEmployeeSetup } from "../../../lib/api/employees";

type EmployeeSetupValues = {
  password: string;
  confirmPassword: string;
};

export default function EmployeeSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const hasToken = token.length >= 20;

  const [serverError, setServerError] = useState<string | null>(null);
  const [setupSuccess, setSetupSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<EmployeeSetupValues>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const passwordValue = form.watch("password") || "";
  const confirmPasswordValue = form.watch("confirmPassword") || "";

  const passwordsMatch = useMemo(() => {
    if (!passwordValue || !confirmPasswordValue) return false;
    return passwordValue === confirmPasswordValue;
  }, [passwordValue, confirmPasswordValue]);

  const showPasswordMatchState =
    passwordValue.length > 0 || confirmPasswordValue.length > 0;

  async function onSubmit(values: EmployeeSetupValues) {
    setServerError(null);

    if (!hasToken) {
      setServerError("This employee setup link is missing or invalid.");
      return;
    }

    if (values.password !== values.confirmPassword) {
      form.setError("confirmPassword", {
        type: "validate",
        message: "Passwords must match",
      });
      return;
    }

    try {
      const result = await completeEmployeeSetup({
        token,
        password: values.password,
      });

      setSetupSuccess(true);

      const role = result.user?.user_role;
      const dest =
        role === "superuser" || role === "admin"
          ? "/account/admin"
          : role === "worker"
          ? "/account/technician"
          : "/account";

      setTimeout(() => {
        router.push(dest);
      }, 1200);
    } catch (e: unknown) {
      if (e instanceof Error) setServerError(e.message);
      else setServerError("Unable to complete employee setup");
    }
  }

  return (
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
                <p className="font-medium">Invalid employee invite</p>
                <p style={{ color: "rgb(var(--muted))" }}>
                  Your invite link may be incomplete, expired, or already used.
                  Please contact your administrator or business owner for a new
                  employee invitation.
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
                <p className="font-medium">Employee account ready</p>
                <p style={{ color: "rgb(var(--muted))" }}>
                  Your password has been created successfully. Signing you in…
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
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
                  <p className="font-medium">Secure employee access</p>
                  <p style={{ color: "rgb(var(--muted))" }}>
                    Create a strong password to finish setting up your employee
                    account. This invite link can only be used once.
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
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <AuthTextField
                label=""
                type={showPassword ? "text" : "password"}
                error={form.formState.errors.password?.message}
                {...form.register("password", {
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
                      /[^A-Za-z0-9]/.test(v) ||
                      "Must include a special character",
                    noSpaces: (v) =>
                      !/\s/.test(v) || "No spaces allowed",
                  },
                })}
              />
            </div>

            <PasswordRequirements password={passwordValue} />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">
                  Confirm password
                </label>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-semibold hover:opacity-80"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>

              <AuthTextField
                label=""
                type={showConfirmPassword ? "text" : "password"}
                error={form.formState.errors.confirmPassword?.message}
                {...form.register("confirmPassword", {
                  required: "Please confirm your password",
                  validate: (value) =>
                    value === form.getValues("password") ||
                    "Passwords must match",
                })}
              />
            </div>

            {showPasswordMatchState ? (
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
                    {passwordsMatch
                      ? "Passwords match"
                      : "Passwords must match"}
                  </span>
                </div>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:opacity-60"
              style={{
                background: "rgb(var(--primary))",
                color: "rgb(var(--primary-fg))",
              }}
            >
              {form.formState.isSubmitting
                ? "Completing setup..."
                : "Complete employee setup"}
            </button>
          </form>
        )}
      </div>
  );
}