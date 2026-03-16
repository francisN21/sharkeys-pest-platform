import Link from "next/link";
import Navbar from "../../components/Navbar";
import PageTracker from "../../components/PageTracker";

import SiteFooter from "@/src/components/home/SiteFooter";

const LINKEDIN_SOFTWARE_BY_HREF = "https://www.linkedin.com/in/franciscorones/";

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

      {!imageUrl && (
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
      )}
    </div>
  );
}

function ServiceAreaHeroImage({
  imageUrl,
}: {
  imageUrl?: string | null;
}) {
  return (
    <div
      className="group relative overflow-hidden rounded-3xl border h-[240px] md:h-full md:min-h-[320px] transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
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
                "linear-gradient(180deg, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.50) 100%)",
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
          <div className="relative flex h-full flex-col justify-end p-6">
            <div className="text-lg font-semibold text-white">
              Service Area Hero Image Placeholder
            </div>
            <p className="mt-2 text-sm leading-6 text-white/80">
              Suggested image: Bay Area residential neighborhood, technician at
              a home exterior, service truck, or local community streetscape.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function AreaCard({ area }: { area: string }) {
  return (
    <div
      className="rounded-2xl border px-4 py-4 text-sm font-semibold transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{
        borderColor: "rgb(var(--border))",
        background: "rgb(var(--bg))",
        color: "rgb(var(--fg))",
      }}
    >
      {area}, CA
    </div>
  );
}

export default function ServiceAreaPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="space-y-8">
          <PageTracker
            items={[
              { label: "Home", href: "/" },
              { label: "Service Area" },
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
            <div className="grid gap-8 p-6 md:grid-cols-[1.15fr_0.85fr] md:p-8 lg:p-10">
              <div className="flex flex-col justify-center">
                <div
                  className="inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgba(59,130,246,0.08)",
                    color: "rgb(var(--fg))",
                  }}
                >
                  Bay Area Coverage
                </div>

                <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">
                  Pest Control Service Area – Bay Area
                </h1>

                <p
                  className="mt-4 max-w-2xl text-base leading-7 sm:text-lg"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  Sharkys Pest Control is based in Benicia, California and
                  proudly serves homeowners and businesses throughout the Bay
                  Area with pest extermination, wildlife control, rodent
                  exclusion, and customized pest management plans.
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
                    Residential Service
                  </span>
                  <span
                    className="rounded-full px-3 py-1 font-medium"
                    style={{
                      background: "rgb(var(--bg))",
                      color: "rgb(var(--muted))",
                      border: "1px solid rgb(var(--border))",
                    }}
                  >
                    Commercial Service
                  </span>
                  <span
                    className="rounded-full px-3 py-1 font-medium"
                    style={{
                      background: "rgb(var(--bg))",
                      color: "rgb(var(--muted))",
                      border: "1px solid rgb(var(--border))",
                    }}
                  >
                    Local Bay Area Team
                  </span>
                </div>
              </div>

              <ServiceAreaHeroImage imageUrl="/golden-gate-sharkyspestcontrol.png" />
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
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                      Cities we proudly serve
                    </h2>
                    <p
                      className="mt-3 max-w-3xl text-base leading-7"
                      style={{ color: "rgb(var(--muted))" }}
                    >
                      We provide reliable pest control service across multiple
                      Bay Area communities, with responsive local support and
                      tailored treatment recommendations for each property.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {AREAS.map((area) => (
                      <AreaCard key={area} area={area} />
                    ))}
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
                    imageUrl="/sharkys-pest-control-bayarea.png"
                    label="Hero image: rat activity near a home exterior"
                    hint="Suggested image: a realistic exterior home scene showing areas where rodents may enter, such as vents, shrubs, foundation gaps, trash bins, or crawlspace openings."
                    height="h-[280px] md:h-full md:min-h-[360px]"
                  />

                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                      Local pest control you can trust
                    </h2>

                    <p
                      className="mt-3 text-base leading-7"
                      style={{ color: "rgb(var(--muted))" }}
                    >
                      Being locally owned and operated allows us to respond
                      quickly to pest problems affecting homes and businesses
                      across the Bay Area. Each property receives a tailored
                      treatment plan based on pest activity, property layout, and
                      environmental conditions.
                    </p>

                    <p
                      className="mt-4 text-base leading-7"
                      style={{ color: "rgb(var(--muted))" }}
                    >
                      Whether you are dealing with ants, rodents, spiders,
                      fleas, ticks, or wildlife issues, our goal is to provide
                      reliable and long-lasting pest management solutions.
                    </p>
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
                  Ready to schedule service?
                </h2>

                <p
                  className="mt-3 max-w-3xl text-base leading-7"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  Whether you need a one-time treatment or a long-term pest
                  management plan, our team is ready to help protect your home
                  or business.
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
            </div>

            <aside className="space-y-6">
              <div
                className="rounded-[2rem] border p-6"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgb(var(--card))",
                }}
              >
                <div className="text-sm font-semibold">Quick Highlights</div>
                <ul
                  className="mt-4 space-y-3 text-sm leading-7"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  <li>• Based in Benicia, CA</li>
                  <li>• Serving multiple Bay Area cities</li>
                  <li>• Residential and commercial pest control</li>
                  <li>• Tailored treatment plans for each property</li>
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
                  <p>Hero: Bay Area neighborhood or technician on-site</p>
                  <p>Section image: service truck or residential property visit</p>
                  <p>Optional: local city signage or neighborhood exterior</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="md:min-h-screen md:flex md:flex-col md:justify-end">
        <SiteFooter softwareByHref={LINKEDIN_SOFTWARE_BY_HREF} />
      </section>
    </main>
  );
}