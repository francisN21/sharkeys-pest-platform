import Link from "next/link";
import Navbar from "../../../components/Navbar";

export default function RatAttractionPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <article className="mx-auto max-w-4xl px-4 py-16 space-y-8">
        <header>
          <h1 className="text-3xl font-semibold">
            What Attracts Rats to Homes?
          </h1>

          <p className="mt-2 text-sm" style={{ color: "rgb(var(--muted))" }}>
            Rodents are a common pest problem across the Bay Area. Understanding
            what attracts rats to homes can help prevent infestations before they
            become severe.
          </p>
        </header>

        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Food sources</h2>

          <p>
            Unsecured trash bins, pet food, bird feeders, and food scraps are
            common reasons rodents are attracted to residential properties.
          </p>

          <h2 className="text-xl font-semibold">Shelter</h2>

          <p>
            Rats often nest in attics, crawlspaces, sheds, and garages where
            they are protected from predators and weather.
          </p>

          <h2 className="text-xl font-semibold">Water sources</h2>

          <p>
            Leaky pipes, irrigation systems, and standing water can attract
            rodents seeking hydration.
          </p>

          <h2 className="text-xl font-semibold">Nearby vegetation</h2>

          <p>
            Dense shrubs, trees touching the house, and clutter around the
            property provide hiding places and easy access to structures.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Professional rodent control</h2>

          <p>
            If you notice scratching noises, droppings, or structural damage,
            professional rodent control may be necessary to remove the infestation
            and prevent further problems.
          </p>

          <Link
            href="/rodent-control-bay-area"
            className="inline-block rounded-xl px-5 py-3 text-sm font-semibold"
            style={{
              background: "rgb(var(--primary))",
              color: "rgb(var(--primary-fg))",
            }}
          >
            Request Rodent Control
          </Link>
        </section>
      </article>
    </main>
  );
}