"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AuthTextField from "../../../components/forms/AuthTextField";
import { loginSchema, type LoginValues } from "../../../lib/validators/auth";
import { login } from "../../../lib/api/auth";

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

const router = useRouter();

async function onSubmit(values: LoginValues) {
  setServerError(null);

  try {
    await login(values);
    router.push("/account");
  } catch (e: unknown) {
    if (e instanceof Error) {
      setServerError(e.message);
    } else {
      setServerError("Login failed");
    }
  }
}

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
          Access your bookings and schedule new services.
        </p>
      </div>

      {serverError ? (
        <div className="rounded-xl border p-3 text-sm" style={{ borderColor: "rgb(239 68 68)" }}>
          {serverError}
        </div>
      ) : null}

      <form
        className="space-y-4"
        onSubmit={handleSubmit(async (v) => {
          try {
            await onSubmit(v);
          } catch (e: unknown) {
            if(e instanceof Error){
              setServerError(e.message);
            } else {
              setServerError("Signup failed")
            }
          }
        })}
      >
        <AuthTextField
          label="Email"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <AuthTextField
          label="Password"
          type="password"
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="flex items-center justify-between text-sm">
          <Link
            href="/forgot-password"
            className="font-semibold hover:underline"
            style={{ color: "rgb(var(--fg))" }}
          >
            Forgot password?
          </Link>

          <Link
            href="/signup"
            className="font-semibold hover:underline"
            style={{ color: "rgb(var(--fg))" }}
          >
            Create account
          </Link>
        </div>

        <button
          disabled={isSubmitting}
          className="w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60"
          style={{ background: "rgb(var(--primary))", color: "rgb(var(--primary-fg))" }}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}