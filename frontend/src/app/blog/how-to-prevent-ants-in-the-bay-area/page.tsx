import Link from "next/link";
import Navbar from "../../../components/Navbar";
import PageTracker from "../../../components/PageTracker";
import SiteFooter from "@/src/components/home/SiteFooter";

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
          ? `linear-gradient(180deg, rgba(0,0,0,0.20), rgba(0,0,0,0.55)), url(${imageUrl}) center / cover no-repeat`
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

export default function AntPreventionPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="space-y-8">
          <PageTracker
            items={[
              { label: "Home", href: "/" },
              { label: "Blog", href: "/blog" },
              { label: "How to Prevent Ant Infestations in the Bay Area" },
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
                  Ant Prevention Guide
                </div>

                <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
                  How to Prevent Ant Infestations in the Bay Area
                </h1>

                <p
                  className="mt-4 max-w-2xl text-base leading-7 sm:text-lg"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  Ant infestations are extremely common throughout the Bay Area
                  due to mild weather and abundant food sources. Fortunately,
                  there are several practical steps homeowners can take to
                  reduce the likelihood of ants entering their home.
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
                    Pest Prevention
                  </span>
                  <span
                    className="rounded-full px-3 py-1 font-medium"
                    style={{
                      background: "rgb(var(--bg))",
                      color: "rgb(var(--muted))",
                      border: "1px solid rgb(var(--border))",
                    }}
                  >
                    Bay Area Ant Control
                  </span>
                </div>
              </div>

              <ImagePlaceholder
                imageUrl="/ants-blog-1.png"
                label="Hero image: ants near a kitchen or exterior entry point"
                hint="Suggested image: close-up of ants trailing along a countertop, window edge, door threshold, or foundation line."
                height="h-[280px] md:h-full md:min-h-[360px]"
              />
            </div>
          </header>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-8">
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
                      Why ant problems are so common
                    </h2>
                    <p
                      className="mt-3 text-base leading-7"
                      style={{ color: "rgb(var(--muted))" }}
                    >
                      Ants are persistent pests that search constantly for food,
                      moisture, and shelter. Once they discover a reliable
                      source, they often return repeatedly and can establish
                      visible trails into the home.
                    </p>
                  </div>

                  <ImagePlaceholder
                    imageUrl="/ants-blog-window.png"
                    label="Supporting image: ant trail entering a home"
                    hint="Suggested image: ants moving through a small crack near a window, baseboard, or exterior siding."
                    height="h-[220px]"
                  />

                  <div className="grid gap-6 md:grid-cols-2">
                    <InfoCard title="Keep food sealed">
                      Ants are attracted to sugar, grease, crumbs, and even pet
                      food. Store pantry items in sealed containers and wipe down
                      counters, tables, and kitchen surfaces regularly.
                    </InfoCard>

                    <InfoCard title="Seal entry points">
                      Small cracks around doors, windows, utility lines, and
                      foundation areas can allow ants to enter your home.
                      Sealing these gaps can help reduce pest activity
                      significantly.
                    </InfoCard>

                    <InfoCard title="Maintain outdoor areas">
                      Trim vegetation away from the home and remove debris near
                      the foundation. Ant colonies often develop near
                      landscaping, mulch beds, and garden edges.
                    </InfoCard>

                    <InfoCard title="Schedule routine pest control">
                      Preventative pest control services help manage ant
                      populations before infestations become widespread and more
                      difficult to control.
                    </InfoCard>
                  </div>
                </div>
              </section>

              <section
                className="rounded-[2rem] border p-6 sm:p-8"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgb(var(--card))",
                }}
              >
                <div className="grid gap-6 md:grid-cols-[0.95fr_1.05fr] md:items-start">
                  <ImagePlaceholder
                    imageUrl="/outdoor-ants.png"
                    label="Supporting image: outdoor ant-prone zones"
                    hint="Suggested image: mulch bed, base of shrubs, pavers, or siding where ant colonies may form near the house."
                    height="h-[240px] md:h-full md:min-h-[320px]"
                  />

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                      Prevention steps that make the biggest difference
                    </h2>

                    <p
                      className="mt-3 text-base leading-7"
                      style={{ color: "rgb(var(--muted))" }}
                    >
                      Good ant prevention comes down to consistency. Small
                      improvements in sanitation, exclusion, and outdoor
                      maintenance can greatly reduce the chances of recurring ant
                      problems.
                    </p>

                    <ul
                      className="mt-5 space-y-3 text-sm leading-7"
                      style={{ color: "rgb(var(--muted))" }}
                    >
                      <li>• Clean crumbs and spills quickly</li>
                      <li>• Store dry goods in sealed containers</li>
                      <li>• Avoid leaving pet food out for long periods</li>
                      <li>• Seal gaps near doors, windows, and utility lines</li>
                      <li>• Keep shrubs and branches away from the house</li>
                      <li>• Reduce debris and moisture near the foundation</li>
                    </ul>
                  </div>
                </div>
              </section>

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
                  If ant trails keep returning, colonies are forming indoors, or
                  over-the-counter solutions are no longer helping, professional
                  pest control can identify the source of the activity and apply
                  a more effective treatment strategy.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/sharkeys-pest-control-booking"
                    className="inline-flex items-center rounded-2xl px-5 py-3 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:opacity-95"
                    style={{
                      background: "rgb(var(--primary))",
                      color: "rgb(var(--primary-fg))",
                    }}
                  >
                    Schedule Pest Control
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
                  <li>• Food crumbs and spills attract ants fast</li>
                  <li>• Tiny gaps can be enough for entry</li>
                  <li>• Landscaping can support nearby colonies</li>
                  <li>• Preventative service helps stop repeat activity</li>
                </ul>
              </div>

              <div
                className="rounded-[2rem] border p-6"
                style={{
                  borderColor: "rgb(var(--border))",
                  background:
                    "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(79,70,229,0.10))",
                }}
              >
                <div className="text-lg font-semibold">Suggested image list</div>
                <div
                  className="mt-3 space-y-3 text-sm leading-7"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  <p>Hero: ant trail near kitchen or exterior threshold</p>
                  <p>Mid-article: crack, window edge, or entry seam</p>
                  <p>Section image: mulch bed, shrubs, or foundation zone</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </article>

      <section className="md:min-h-screen md:flex md:flex-col md:justify-end">
        <SiteFooter softwareByHref={LINKEDIN_SOFTWARE_BY_HREF} />
      </section>
    </main>
  );
}