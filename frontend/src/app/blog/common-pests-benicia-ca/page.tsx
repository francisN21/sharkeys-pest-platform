import type { Metadata } from "next";
import Link from "next/link";
import React from "react";
import Navbar from "../../../components/Navbar";
import PageTracker from "../../../components/PageTracker";
import SiteFooter from "@/src/components/home/SiteFooter";
import ScrollReveal from "../../../components/ScrollReveal";

export const metadata: Metadata = {
  title: "Common Pests in Benicia, CA Homes | Sharkys Pest Control",
  description:
    "Learn which pests homeowners in Benicia, CA commonly deal with — including ants, rodents, spiders, and wasps — and when to call a professional.",
  openGraph: {
    title: "Common Pests in Benicia, CA Homes | Sharkys Pest Control",
    description:
      "Pest guide for Benicia homeowners covering ants, rodents, spiders, and wasps. Tips from local Bay Area pest control professionals.",
    url: "https://sharkyspestcontrolbayarea.com/blog/common-pests-benicia-ca",
    siteName: "Sharkys Pest Control",
    images: [{ url: "https://sharkyspestcontrolbayarea.com/common-pest-1.png" }],
    type: "article",
  },
};

const LINKEDIN_SOFTWARE_BY_HREF = "https://www.linkedin.com/in/franciscorones/";

function ImagePlaceholder({
  label,
  hint,
  height = "h-[260px]",
  imageUrl,
}: {
  label: string;
  hint: string;
  height?: string;
  imageUrl?: string | null;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border ${height} transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
      style={{
        borderColor: "rgb(var(--border))",
        background: imageUrl
          ? `linear-gradient(180deg, rgba(0,0,0,0.15), rgba(0,0,0,0.55)), url(${imageUrl}) center / cover no-repeat`
          : "linear-gradient(135deg, rgba(59,130,246,0.10) 0%, rgba(99,102,241,0.12) 35%, rgba(15,23,42,0.95) 100%)",
      }}
    >
      {!imageUrl && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at top right, rgba(255,255,255,0.12), transparent 32%)",
            }}
          />

          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background:
                "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.08) 35%, transparent 70%)",
            }}
          />

          <div className="relative flex h-full flex-col justify-between p-6">
            <div>
              <div className="inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/90">
                Image Placeholder
              </div>
            </div>

            <div>
              <div className="text-lg font-semibold text-white">{label}</div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
                {hint}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{
        borderColor: "rgb(var(--border))",
        background: "rgb(var(--bg))",
      }}
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      <p
        className="mt-2 text-sm leading-7"
        style={{ color: "rgb(var(--muted))" }}
      >
        {children}
      </p>
    </div>
  );
}

export default function CommonPestsBeniciaPage() {
  const description =
    "Homeowners in Benicia often experience seasonal pest activity due to the area's coastal climate and surrounding natural environments. Knowing which pests are common can help you identify problems early and prevent infestations.";

  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Article",
              headline: "Common Pests in Benicia, CA Homes",
              description:
                "Learn which pests homeowners in Benicia commonly deal with and when it may be time to call a professional.",
              publisher: {
                "@type": "LocalBusiness",
                name: "Sharkys Pest Control",
                url: "https://sharkyspestcontrolbayarea.com",
              },
              url: "https://sharkyspestcontrolbayarea.com/blog/common-pests-benicia-ca",
              datePublished: "2025-03-10",
              image: "https://sharkyspestcontrolbayarea.com/common-pest-1.png",
            },
            {
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: "https://sharkyspestcontrolbayarea.com",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Blog",
                  item: "https://sharkyspestcontrolbayarea.com/blog",
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: "Common Pests in Benicia, CA Homes",
                },
              ],
            },
          ]),
        }}
      />
      <Navbar />

      <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="space-y-8">
          <PageTracker
            items={[
              { label: "Home", href: "/" },
              { label: "Blog", href: "/blog" },
              { label: "Common Pests in Benicia, CA Homes" },
            ]}
          />

          <header
            className="overflow-hidden rounded-[2rem] border"
            style={{
              borderColor: "rgb(var(--border))",
              background:
                "linear-gradient(135deg, rgba(37,99,235,0.10) 0%, rgba(79,70,229,0.12) 40%, rgb(var(--card)) 100%)",
            }}
          >
            <div className="grid gap-8 p-6 md:grid-cols-[1.2fr_0.8fr] md:p-8 lg:p-10">
              <div className="flex flex-col justify-center">
                <div
                  className="inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgba(59,130,246,0.08)",
                    color: "rgb(var(--fg))",
                  }}
                >
                  Benicia Pest Guide
                </div>

                <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
                  Common Pests in Benicia, CA Homes
                </h1>

                <p
                  className="mt-4 max-w-2xl text-base leading-7 sm:text-lg"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  {description}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
                  <span
                    className="rounded-full px-3 py-1 font-medium"
                    style={{
                      background: "rgb(var(--bg))",
                      color: "rgb(var(--muted))",
                      border: "1px solid rgb(var(--border))",
                    }}
                  >
                    Local Pest Education
                  </span>
                  <span
                    className="rounded-full px-3 py-1 font-medium"
                    style={{
                      background: "rgb(var(--bg))",
                      color: "rgb(var(--muted))",
                      border: "1px solid rgb(var(--border))",
                    }}
                  >
                    Benicia Homeowners
                  </span>
                  <span
                    className="rounded-full px-3 py-1 font-medium"
                    style={{
                      background: "rgb(var(--bg))",
                      color: "rgb(var(--muted))",
                      border: "1px solid rgb(var(--border))",
                    }}
                  >
                    Seasonal Pest Activity
                  </span>
                </div>
                <p className="mt-4 text-xs" style={{ color: "rgb(var(--muted))" }}>
                  Published March 10, 2025 · 5 min read
                </p>
              </div>

              <ImagePlaceholder
                imageUrl="/common-pest-1.png"
                label="Hero image: common household pests around a Benicia home"
                hint="Suggested image: residential exterior with visual cues for ants, rodents, spiders, or wasp-prone rooflines."
                height="h-[280px] md:h-full md:min-h-[360px]"
              />
            </div>
          </header>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-8">
              <ScrollReveal>
              <section
                className="rounded-[2rem] border p-6 sm:p-8"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgb(var(--card))",
                }}
              >
                <div className="max-w-none space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                      Why some pests show up more often in Benicia homes
                    </h2>
                    <p
                      className="mt-3 text-base leading-7"
                      style={{ color: "rgb(var(--muted))" }}
                    >
                      Benicia’s climate, landscaping, and residential structure
                      types can all contribute to recurring pest activity.
                      Recognizing which pests are most common can help homeowners
                      act early and reduce the chance of larger infestations.
                    </p>
                  </div>
                  <ImagePlaceholder
                    imageUrl="/exterior-cracks.png"
                    label="Supporting image: pest entry points and activity zones"
                    hint="Exterior cracks, patio corners, attic vents, or landscaping near the foundation."
                    height="h-[220px]"
                  />  
                  <div className="grid gap-6 md:grid-cols-2">
                    <InfoCard title="Ants">
                      Ant infestations are one of the most frequent pest issues
                      in Benicia homes. They often enter through small cracks
                      while searching for food and water. Kitchens, pantries,
                      patios, and sink areas are common activity points.
                    </InfoCard>

                    <InfoCard title="Rodents">
                      Mice and rats often enter homes through attic vents,
                      crawlspaces, roof gaps, or foundation openings. Rodents can
                      cause structural damage and contaminate stored food.
                    </InfoCard>

                    <InfoCard title="Spiders">
                      Spiders thrive in quiet indoor spaces such as garages,
                      storage areas, utility corners, and basements. While most
                      are harmless, spider activity often suggests the presence
                      of other insects nearby.
                    </InfoCard>

                    <InfoCard title="Wasps and Stinging Insects">
                      Wasps frequently build nests under eaves, patio covers,
                      rooflines, and outdoor structures. These pests can become
                      aggressive when nests are disturbed or when people get too
                      close.
                    </InfoCard>
                  </div>
                </div>
              </section>
              </ScrollReveal>

              <ScrollReveal delay={80}>
              <section
                className="rounded-[2rem] border p-6 sm:p-8"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgb(var(--card))",
                }}
              >
                <div className="grid gap-6 md:grid-cols-[0.95fr_1.05fr] md:items-start">
                  <ImagePlaceholder
                    imageUrl="/hiding-locations.png"
                    label="Supporting image: garage, attic, patio, or roofline pest zones"
                    hint="Suggested image: common nesting or hiding locations such as attic vents, patio beams, wall voids, or cluttered storage areas."
                    height="h-[240px] md:h-full md:min-h-[320px]"
                  />

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                      Signs homeowners should watch for
                    </h2>

                    <p
                      className="mt-3 text-base leading-7"
                      style={{ color: "rgb(var(--muted))" }}
                    >
                      Many infestations begin with subtle warning signs. Spotting
                      them early can help reduce repair costs and prevent pests
                      from becoming established indoors.
                    </p>

                    <ul
                      className="mt-5 space-y-3 text-sm leading-7"
                      style={{ color: "rgb(var(--muted))" }}
                    >
                      <li>• Ant trails along counters, walls, or windows</li>
                      <li>• Scratching sounds in ceilings, walls, or attics</li>
                      <li>• Spider webs accumulating in quiet corners</li>
                      <li>• Wasp nests forming under eaves or patio roofs</li>
                      <li>• Droppings, gnaw marks, or damaged food packaging</li>
                      <li>• Pest activity increasing during warmer months</li>
                    </ul>
                  </div>
                </div>
              </section>
              </ScrollReveal>

              <ScrollReveal delay={160}>
              <section
                className="rounded-[2rem] border p-6 sm:p-8"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgb(var(--card))",
                }}
              >
                <h2 className="text-2xl font-bold tracking-tight">
                  When to call a professional
                </h2>

                <p
                  className="mt-3 max-w-3xl text-base leading-7"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  If you notice recurring pest activity, unusual noises in walls
                  or attics, visible nests, or signs of pest damage, professional
                  pest control may be necessary to correctly identify the issue
                  and eliminate it more effectively.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/sharkys-pest-control-booking"
                    className="inline-flex items-center rounded-2xl px-5 py-3 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:opacity-95"
                    style={{
                      background: "rgb(var(--primary))",
                      color: "rgb(var(--primary-fg))",
                    }}
                  >
                    Request Pest Control Service
                  </Link>

                  <Link
                    href="/contact"
                    className="inline-flex items-center rounded-2xl border px-5 py-3 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:opacity-95"
                    style={{
                      borderColor: "rgb(var(--border))",
                      background: "rgb(var(--bg))",
                      color: "rgb(var(--fg))",
                    }}
                  >
                    Contact Our Team
                  </Link>
                </div>
              </section>
              </ScrollReveal>
            </div>

            <aside className="space-y-6">
              <div
                className="rounded-[2rem] border p-6"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgb(var(--card))",
                }}
              >
                <div className="text-sm font-semibold">Quick Takeaways</div>
                <ul
                  className="mt-4 space-y-3 text-sm leading-7"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  <li>• Ants and rodents are frequent household pests</li>
                  <li>• Spiders often indicate other insect activity</li>
                  <li>• Wasps commonly nest on outdoor structures</li>
                  <li>• Early identification helps prevent bigger issues</li>
                </ul>
              </div>

            </aside>
          </div>
        </div>

        <div className="mt-4 pb-4">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold transition duration-200 hover:underline"
            style={{ color: "rgb(var(--muted))" }}
          >
            ← Back to Blog
          </Link>
        </div>
      </article>
      <section className="md:min-h-screen md:flex md:flex-col md:justify-end">
        <SiteFooter softwareByHref={LINKEDIN_SOFTWARE_BY_HREF} />
      </section>
    </main>
  );
}