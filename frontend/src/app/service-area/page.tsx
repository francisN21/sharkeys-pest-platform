import Link from "next/link";
import Navbar from "../../components/Navbar";
import PageTracker from "../../components/PageTracker";

const AREAS = [
  "Benicia",
  "Vallejo",
  "Fairfield",
  "Concord",
  "Martinez",
  "San Francisco",
  "Daly City",
  "San Ramon",
  "Oakland",
];

export default function ServiceAreaPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="mx-auto max-w-5xl space-y-8 px-4 py-16">
        <PageTracker
          items={[
            { label: "Home", href: "/" },
            { label: "Service Area" },
          ]}
        />

        <div>
          <h1 className="text-3xl font-semibold">
            Pest Control Service Area – Bay Area
          </h1>

          <p className="mt-3 text-sm" style={{ color: "rgb(var(--muted))" }}>
            Sharkys Pest Control is based in Benicia, California and proudly
            serves homeowners and businesses throughout the Bay Area. Our team
            provides pest extermination, wildlife control, rodent exclusion, and
            customized pest management plans tailored to each property.
          </p>
        </div>

        <div
          className="grid gap-4 rounded-2xl border p-6 sm:grid-cols-2"
          style={{
            borderColor: "rgb(var(--border))",
            background: "rgb(var(--card))",
          }}
        >
          {AREAS.map((area) => (
            <div
              key={area}
              className="rounded-xl border px-4 py-3 text-sm font-semibold"
              style={{ borderColor: "rgb(var(--border))" }}
            >
              {area}, CA
            </div>
          ))}
        </div>

        <div className="space-y-4 text-sm leading-relaxed">
          <h2 className="text-xl font-semibold">Local pest control you can trust</h2>

          <p>
            Being locally owned and operated allows us to respond quickly to pest
            problems affecting homes and businesses across the Bay Area. Each
            property receives a tailored treatment plan based on pest activity,
            property layout, and environmental conditions.
          </p>

          <p>
            Whether you are dealing with ants, rodents, spiders, fleas, ticks,
            or wildlife issues, our goal is to provide reliable and long-lasting
            pest management solutions.
          </p>
        </div>

        <Link
          href="/pest-control-bay-area"
          className="inline-block rounded-xl px-5 py-3 text-sm font-semibold"
          style={{
            background: "rgb(var(--primary))",
            color: "rgb(var(--primary-fg))",
          }}
        >
          Request Pest Control Service
        </Link>
      </section>
    </main>
  );
}