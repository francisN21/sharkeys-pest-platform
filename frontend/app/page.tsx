import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "../src/components/ThemeToggle";
import Navbar from "../src/components/Navbar";




const SERVICES = [
  { name: "Rodents", desc: "Inspection, exclusion, and treatment plans." },
  { name: "Bees", desc: "Safe removal and prevention recommendations." },
  { name: "Termites", desc: "Assessment and treatment options." },
  { name: "Roaches", desc: "Targeted treatment and follow-up scheduling." },
  { name: "Scorpions", desc: "Perimeter defense and habitat reduction." },
];

const HIGHLIGHTS = [
  { title: "Fast Scheduling", desc: "Book online in minutes." },
  { title: "Bay Area Service", desc: "Local coverage with reliable arrival windows." },
  { title: "Clear Pricing", desc: "Residential and commercial packages." },
  { title: "Professional Care", desc: "Respectful service for homes and businesses." },
];

export default function HomePage() {
  return (
    <main>
      {/* Header */}
      <header
  className="sticky top-0 z-50 border-b backdrop-blur"
  style={{
    borderColor: "rgb(var(--border))",
    background: "rgba(var(--bg), 0.85)",
  }}
>
  <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
    <Link href="/" className="flex items-center gap-3">
      <Image
        src="/logo.png"
        alt="Sharkey’s Pest Control"
        width={44}
        height={44}
        className="rounded-xl"
        priority
      />
      <div className="leading-tight">
        <div className="text-base font-semibold">Sharkys Pest Control</div>
        <div className="text-xs" style={{ color: "rgb(var(--muted))" }}>
          Bay Area
        </div>
      </div>
    </Link>

    <nav className="hidden items-center gap-6 md:flex">
      <a href="#services" className="text-sm hover:opacity-90" style={{ color: "rgb(var(--muted))" }}>
        Services
      </a>
      <a href="#pricing" className="text-sm hover:opacity-90" style={{ color: "rgb(var(--muted))" }}>
        Pricing
      </a>
      <a href="#contact" className="text-sm hover:opacity-90" style={{ color: "rgb(var(--muted))" }}>
        Contact
      </a>
    </nav>

    <div className="flex items-center gap-3">
      <ThemeToggle />

      <Link
        href="/login"
        className="rounded-xl px-3 py-2 text-sm font-medium hover:opacity-90"
        style={{ color: "rgb(var(--muted))" }}
      >
        Sign in
      </Link>

      <Link
        href="/signup"
        className="rounded-xl px-4 py-2 text-sm font-semibold hover:opacity-90"
        style={{
          background: "rgb(var(--primary))",
          color: "rgb(var(--primary-fg))",
        }}
      >
        Book a Service
      </Link>
    </div>
  </div>
</header>

      {/* Hero */}
      <section className="border-b">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center">
          <div className="space-y-5">
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Pest control that’s fast, clear, and local.
            </h1>
            <p className="text-base text-slate-700 md:text-lg">
              Residential and commercial services across the Bay Area. Choose your
              service, pick a time, and get confirmation instantly.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Schedule an appointment
              </Link>
              <a
                href="#pricing"
                className="rounded-xl border px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
              >
                View pricing
              </a>
            </div>

            <div className="grid gap-3 pt-3 sm:grid-cols-2">
              {HIGHLIGHTS.map((h) => (
                <div key={h.title} className="rounded-2xl border p-4">
                  <div className="text-sm font-semibold">{h.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{h.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border bg-slate-50 p-6">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Typical booking flow</div>
              <ol className="mt-3 space-y-2 text-sm text-slate-700">
                <li>1) Select a service (rodents, termites, roaches, bees, scorpions)</li>
                <li>2) Pick a date & time</li>
                <li>3) Confirm address and details</li>
                <li>4) Get email confirmation + calendar invite</li>
              </ol>
              <div className="mt-4 rounded-xl border bg-slate-50 p-4 text-sm text-slate-700">
                Next: we’ll connect this flow to the backend and Google Calendar.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">Services</h2>
            <p className="mt-2 text-slate-700">
              Choose the service you need. We’ll guide you through scheduling and next steps.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <div key={s.name} className="rounded-2xl border p-5 hover:bg-slate-50">
                <div className="text-lg font-semibold">{s.name}</div>
                <div className="mt-2 text-sm text-slate-700">{s.desc}</div>
                <div className="mt-4">
                  <Link
                    href="/signup"
                    className="text-sm font-semibold text-slate-900 hover:underline"
                  >
                    Schedule {s.name.toLowerCase()} service →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-b">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight">Pricing</h2>
            <p className="mt-2 text-slate-700">
              Transparent starting points. Final pricing may vary based on inspection and scope.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border p-6">
              <div className="text-sm font-semibold text-slate-600">Residential</div>
              <div className="mt-2 text-2xl font-semibold">Starting at $149</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li>• Inspection + recommendation</li>
                <li>• Treatment plan options</li>
                <li>• Follow-up scheduling available</li>
              </ul>
              <Link
                href="/signup"
                className="mt-6 inline-block rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Book residential
              </Link>
            </div>

            <div className="rounded-3xl border p-6">
              <div className="text-sm font-semibold text-slate-600">Commercial</div>
              <div className="mt-2 text-2xl font-semibold">Starting at $249</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li>• Business inspection + compliance support</li>
                <li>• Service schedule plans</li>
                <li>• Priority appointment windows</li>
              </ul>
              <Link
                href="/signup"
                className="mt-6 inline-block rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Book commercial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <div className="rounded-3xl border p-8">
            <h2 className="text-2xl font-semibold tracking-tight">Contact</h2>
            <p className="mt-2 text-slate-700">
              Have questions before booking? Reach out and we’ll get you taken care of.
            </p>

            <div className="mt-6 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="font-semibold">Phone</div>
                <div className="mt-1">(Add your business number)</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="font-semibold">Email</div>
                <div className="mt-1">(Add your business email)</div>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="font-semibold">Service Area</div>
                <div className="mt-1">Bay Area, CA</div>
              </div>
            </div>

            <div className="mt-6 text-xs text-slate-500">
              © {new Date().getFullYear()} Sharkey’s Pest Control. All rights reserved.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
