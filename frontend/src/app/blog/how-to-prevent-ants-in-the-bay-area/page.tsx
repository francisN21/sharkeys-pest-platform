import Link from "next/link";
import Navbar from "../../../components/Navbar";
import PageTracker from "../../../components/PageTracker";

export default function AntPreventionPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <article className="mx-auto max-w-4xl space-y-8 px-4 py-16">
        <PageTracker
          items={[
            { label: "Home", href: "/" },
            { label: "Blog", href: "/blog" },
            { label: "How to Prevent Ant Infestations in the Bay Area" },
          ]}
        />

        <header>
          <h1 className="text-3xl font-semibold">
            How to Prevent Ant Infestations in the Bay Area
          </h1>

          <p className="mt-2 text-sm" style={{ color: "rgb(var(--muted))" }}>
            Ant infestations are extremely common throughout the Bay Area due to
            mild weather and abundant food sources. Fortunately, there are
            several steps homeowners can take to reduce the likelihood of ants
            entering their home.
          </p>
        </header>

        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Keep food sealed</h2>
          <p>
            Ants are attracted to sugar, grease, and crumbs. Store food in sealed
            containers and clean kitchen surfaces regularly to eliminate food
            sources.
          </p>

          <h2 className="text-xl font-semibold">Seal entry points</h2>
          <p>
            Small cracks around doors, windows, and foundation areas can allow
            ants to enter your home. Sealing these entry points can reduce pest
            activity significantly.
          </p>

          <h2 className="text-xl font-semibold">Maintain outdoor areas</h2>
          <p>
            Trim vegetation away from the house and remove debris near the
            foundation. Ant colonies often form near landscaping or garden
            areas.
          </p>

          <h2 className="text-xl font-semibold">Schedule routine pest control</h2>
          <p>
            Preventative pest control services help manage pest populations
            before infestations become severe.
          </p>
        </section>

        <Link
          href="/pest-control-bay-area"
          className="inline-block rounded-xl px-5 py-3 text-sm font-semibold"
          style={{
            background: "rgb(var(--primary))",
            color: "rgb(var(--primary-fg))",
          }}
        >
          Schedule Pest Control
        </Link>
      </article>
    </main>
  );
}