"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Chrome, ArrowRight, Bug } from "lucide-react";

import AuthTextField from "../../../components/forms/AuthTextField";
import { loginSchema, type LoginValues } from "../../../lib/validators/auth";
import { login } from "../../../lib/api/auth";
import { notifyAuthChanged } from "../../../components/AuthProvider";

export default function LoginClient() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [googlePending, setGooglePending] = useState(false);

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
      notifyAuthChanged();
      router.push("/account");
    } catch (e: unknown) {
      if (e instanceof Error) setServerError(e.message);
      else setServerError("Login failed");
    }
  }

  function handleGuest() {
    router.push("/sharkys-pest-control-booking");
  }

  function handleGooglePlaceholder() {
    setServerError(null);
    setGooglePending(true);

    window.setTimeout(() => {
      setGooglePending(false);
      setServerError("Google sign-in is coming soon.");
    }, 500);
  }

  const busy = isSubmitting || googlePending;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
            Access your bookings and schedule new services.
          </p>
        </div>
      </div>

      {serverError ? (
        <div
          className="rounded-xl border p-3 text-sm"
          style={{ borderColor: "rgb(239 68 68)" }}
        >
          {serverError}
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

        <AuthTextField
          label="Password"
          type="password"
          showToggle
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
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          style={{
            background: "rgb(var(--primary))",
            color: "rgb(var(--primary-fg))",
          }}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div
          className="h-px flex-1"
          style={{ background: "rgb(var(--border))" }}
        />
        <span className="text-xs uppercase tracking-wide" style={{ color: "rgb(var(--muted))" }}>
          Or
        </span>
        <div
          className="h-px flex-1"
          style={{ background: "rgb(var(--border))" }}
        />
      </div>

      <div className="space-y-3">
        {/* <button
          type="button"
          onClick={handleGooglePlaceholder}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-60"
          style={{
            borderColor: "rgb(var(--border))",
            background: "transparent",
          }}
        >
          <Chrome className="h-4 w-4" />
          <span>{googlePending ? "Preparing Google..." : "Continue with Google"}</span>
        </button> */}

        <button
          type="button"
          onClick={handleGuest}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-60"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgba(var(--bg), 0.18)",
          }}
        >
          <span>Continue as guest</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="text-center text-sm" style={{ color: "rgb(var(--muted))" }}>
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-semibold hover:underline"
          style={{ color: "rgb(var(--fg))" }}
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}