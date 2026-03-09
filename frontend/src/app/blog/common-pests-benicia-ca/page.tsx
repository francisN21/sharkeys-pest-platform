import Link from "next/link";
import Navbar from "../../../components/Navbar";
import PageTracker from "../../../components/PageTracker";

export default function CommonPestsBeniciaPage() {

    const description = "Homeowners in Benicia often experience seasonal pest activity due to the area's coastal climate and surrounding natural environments. Knowing which pests are common can help you identify problems early and prevent infestations."

  return (
    <main className="min-h-screen">
      <Navbar />

      <article className="mx-auto max-w-4xl space-y-8 px-4 py-16">
        <PageTracker
          items={[
            { label: "Home", href: "/" },
            { label: "Blog", href: "/blog" },
            { label: "Common Pests in Benicia, CA Homes" },
          ]}
        />

        <header>
          <h1 className="text-3xl font-semibold">
            Common Pests in Benicia, CA Homes
          </h1>

          <p className="mt-2 text-sm" style={{ color: "rgb(var(--muted))" }}>
            {description}
          </p>
        </header>

        <section className="space-y-6">
          <h2 className="text-xl font-semibold">Ants</h2>
          <p>
            Ant infestations are one of the most frequent pest issues in Benicia
            homes. They often enter through small cracks searching for food and
            water. Kitchens, pantries, and outdoor patios are common entry
            points.
          </p>

          <h2 className="text-xl font-semibold">Rodents</h2>
          <p>
            Mice and rats often enter homes through attic vents, crawlspaces, or
            foundation gaps. Rodents can cause structural damage and contaminate
            food supplies.
          </p>

          <h2 className="text-xl font-semibold">Spiders</h2>
          <p>
            Spiders thrive in quiet indoor spaces such as garages, storage areas,
            and basements. While most are harmless, spider infestations usually
            indicate the presence of other insects.
          </p>

          <h2 className="text-xl font-semibold">Wasps and Stinging Insects</h2>
          <p>
            Wasps often build nests under rooflines, patios, and outdoor
            structures. These insects can become aggressive when nests are
            disturbed.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">When to call a professional</h2>
          <p>
            If you notice recurring pest activity, unusual noises in walls or
            attics, or visible pest damage, professional pest control may be
            necessary to properly eliminate the problem.
          </p>

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
      </article>
    </main>
  );
}