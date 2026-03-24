import type { Metadata } from "next";
import Link from "next/link";
import React from "react";
import Navbar from "../../../components/Navbar";
import PageTracker from "../../../components/PageTracker";
import SiteFooter from "@/src/components/home/SiteFooter";
import ScrollReveal from "../../../components/ScrollReveal";

export const metadata: Metadata = {
  title: "What Attracts Rats to Homes? | Sharkys Pest Control",
  description:
    "Find out what attracts rats to homes in the Bay Area — food, shelter, water, and vegetation — and how to reduce your risk of a rodent infestation.",
  openGraph: {
    title: "What Attracts Rats to Homes? | Sharkys Pest Control",
    description:
      "Rodent prevention guide for Bay Area homeowners. Learn what attracts rats and how to protect your home.",
    url: "https://sharkyspestcontrolbayarea.com/blog/what-attracts-rats-to-homes",
    siteName: "Sharkys Pest Control",
    images: [{ url: "https://sharkyspestcontrolbayarea.com/rat-main-1.png" }],
    type: "article",
  },
};

const LINKEDIN_SOFTWARE_BY_HREF = "https://www.linkedin.com/in/franciscorones/";

function ImagePlaceholder({
  height = "h-[260px]",
  imageUrl,
}: {
  label?: string;
  hint?: string;
  height?: string;
  imageUrl?: string | null;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-3xl border ${height} transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
      style={{
        borderColor: "rgb(var(--border))",
        background: imageUrl
          ? "rgb(var(--card))"
          : "linear-gradient(135deg, rgba(59,130,246,0.10) 0%, rgba(99,102,241,0.12) 35%, rgba(15,23,42,0.95) 100%)",
      }}
    >
      {imageUrl ? (
        <>
          <div
            className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            style={{
              background: `url(${imageUrl}) center / cover no-repeat`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0.52) 100%)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background:
                "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.08) 35%, transparent 70%)",
            }}
          />
        </>
      ) : (
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

export default function RatAttractionPage() {
  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "Article",
              headline: "What Attracts Rats to Homes?",
              description:
                "Understand the most common causes of rodent activity and how to reduce the risk of infestation.",
              publisher: {
                "@type": "LocalBusiness",
                name: "Sharkys Pest Control",
                url: "https://sharkyspestcontrolbayarea.com",
              },
              url: "https://sharkyspestcontrolbayarea.com/blog/what-attracts-rats-to-homes",
              datePublished: "2025-03-20",
              image: "https://sharkyspestcontrolbayarea.com/rat-main-1.png",
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
                  name: "What Attracts Rats to Homes?",
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
              { label: "What Attracts Rats to Homes?" },
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
                  Rodent Prevention Guide
                </div>

                <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
                  What Attracts Rats to Homes?
                </h1>

                <p
                  className="mt-4 max-w-2xl text-base leading-7 sm:text-lg"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  Rodents are a common pest problem across the Bay Area.
                  Understanding what attracts rats to homes can help prevent
                  infestations before they become severe and costly.
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
                    Bay Area Pest Education
                  </span>
                  <span
                    className="rounded-full px-3 py-1 font-medium"
                    style={{
                      background: "rgb(var(--bg))",
                      color: "rgb(var(--muted))",
                      border: "1px solid rgb(var(--border))",
                    }}
                  >
                    Homeowner Tips
                  </span>
                  <span
                    className="rounded-full px-3 py-1 font-medium"
                    style={{
                      background: "rgb(var(--bg))",
                      color: "rgb(var(--muted))",
                      border: "1px solid rgb(var(--border))",
                    }}
                  >
                    Rodent Control
                  </span>
                </div>
                <p className="mt-4 text-xs" style={{ color: "rgb(var(--muted))" }}>
                  Published March 20, 2025 · 5 min read
                </p>
              </div>

              <ImagePlaceholder
                imageUrl="/rat-main-1.png"
                label="Hero image: rat activity near a home exterior"
                hint="Suggested image: a realistic exterior home scene showing areas where rodents may enter, such as vents, shrubs, foundation gaps, trash bins, or crawlspace openings."
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
                      Why rats are drawn to residential properties
                    </h2>
                    <p
                      className="mt-3 text-base leading-7"
                      style={{ color: "rgb(var(--muted))" }}
                    >
                      Rats are opportunistic. If your home offers food, water,
                      shelter, and safe pathways, it can quickly become an
                      attractive environment for rodent activity.
                    </p>
                  </div>

                  <ImagePlaceholder
                    imageUrl="/rat-activity.png"
                    label="Supporting image: signs of rodent access"
                    hint="Suggested image: close-up of a garage gap, torn vent screen, or small entry point near pipes or siding."
                    height="h-[220px]"
                  />

                  <div className="grid gap-6 md:grid-cols-2">
                    <InfoCard title="Food sources">
                      Unsecured trash bins, pet food, bird feeders, and food
                      scraps are common reasons rodents are attracted to
                      residential properties.
                    </InfoCard>

                    <InfoCard title="Shelter">
                      Rats often nest in attics, crawlspaces, sheds, and garages
                      where they are protected from predators and changing
                      weather.
                    </InfoCard>

                    <InfoCard title="Water sources">
                      Leaky pipes, irrigation systems, clogged drains, and
                      standing water can attract rodents seeking hydration.
                    </InfoCard>

                    <InfoCard title="Nearby vegetation">
                      Dense shrubs, tree branches touching the roof, and yard
                      clutter provide hiding places and access to the home.
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
                    imageUrl="/rat-attic-infestation.png"
                    label="Supporting image: attic, crawlspace, or garage risk area"
                    hint="Suggested image: attic insulation disturbance, stored boxes in a garage, or a crawlspace access point."
                    height="h-[240px] md:h-full md:min-h-[320px]"
                  />

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                      Common conditions that increase rodent risk
                    </h2>

                    <p
                      className="mt-3 text-base leading-7"
                      style={{ color: "rgb(var(--muted))" }}
                    >
                      Homes become more vulnerable when small maintenance issues
                      are ignored. Over time, these entry points and attractants
                      create ideal conditions for rats to settle in.
                    </p>

                    <ul
                      className="mt-5 space-y-3 text-sm leading-7"
                      style={{ color: "rgb(var(--muted))" }}
                    >
                      <li>• Open trash or compost containers near the home</li>
                      <li>• Pet food left outside overnight</li>
                      <li>• Overgrown landscaping against exterior walls</li>
                      <li>• Roofline access from nearby tree branches</li>
                      <li>• Cluttered storage areas in sheds or garages</li>
                      <li>• Moisture from leaks, irrigation, or poor drainage</li>
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
                  Professional rodent control
                </h2>

                <p
                  className="mt-3 max-w-3xl text-base leading-7"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  If you notice scratching noises, droppings, gnaw marks, or
                  structural damage, professional rodent control may be
                  necessary to remove the infestation and help prevent it from
                  returning.
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
                    Request Rodent Control
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
                  <li>• Food and trash are major rodent attractants</li>
                  <li>• Rats seek protected nesting areas</li>
                  <li>• Moisture issues increase activity</li>
                  <li>• Vegetation and clutter create access paths</li>
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