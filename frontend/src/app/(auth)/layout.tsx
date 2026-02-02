export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div
          className="rounded-3xl border p-6 shadow-sm"
          style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
        >
          {children}
        </div>

        <p className="mt-6 text-center text-xs" style={{ color: "rgb(var(--muted))" }}>
          © {new Date().getFullYear()} Sharkys Pest Control
        </p>
      </div>
    </main>
  );
}
