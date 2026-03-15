import Link from "next/link";
import Navbar from "../../../components/Navbar";
import PageTracker from "../../../components/PageTracker";

function ImagePlaceholder({
  label,
  hint,
  height = "h-[260px]",
}: {
  label: string;
  hint: string;
  height?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border ${height}`}
      style={{
        borderColor: "rgb(var(--border))",
        background:
          "linear-gradient(135deg, rgba(59,130,246,0.10) 0%, rgba(99,102,241,0.12) 35%, rgba(15,23,42,0.95) 100%)",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at top right, rgba(255,255,255,0.12), transparent 32%)",
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
    </div>
  );
}

export default function RatAttractionPage() {
  return (
    <main className="min-h-screen">
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
              </div>

              <ImagePlaceholder
                label="Hero image: rat activity near a home exterior"
                hint="Suggested image: a realistic exterior home scene showing areas where rodents may enter, such as vents, shrubs, foundation gaps, trash bins, or crawlspace openings."
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
                    label="Supporting image: signs of rodent access"
                    hint="Suggested image: close-up of a garage gap, torn vent screen, or small entry point near pipes or siding."
                    height="h-[220px]"
                  />

                  <div className="grid gap-6 md:grid-cols-2">
                    <div
                      className="rounded-2xl border p-5"
                      style={{
                        borderColor: "rgb(var(--border))",
                        background: "rgb(var(--bg))",
                      }}
                    >
                      <h3 className="text-lg font-semibold">Food sources</h3>
                      <p
                        className="mt-2 text-sm leading-7"
                        style={{ color: "rgb(var(--muted))" }}
                      >
                        Unsecured trash bins, pet food, bird feeders, and food
                        scraps are common reasons rodents are attracted to
                        residential properties.
                      </p>
                    </div>

                    <div
                      className="rounded-2xl border p-5"
                      style={{
                        borderColor: "rgb(var(--border))",
                        background: "rgb(var(--bg))",
                      }}
                    >
                      <h3 className="text-lg font-semibold">Shelter</h3>
                      <p
                        className="mt-2 text-sm leading-7"
                        style={{ color: "rgb(var(--muted))" }}
                      >
                        Rats often nest in attics, crawlspaces, sheds, and
                        garages where they are protected from predators and
                        changing weather.
                      </p>
                    </div>

                    <div
                      className="rounded-2xl border p-5"
                      style={{
                        borderColor: "rgb(var(--border))",
                        background: "rgb(var(--bg))",
                      }}
                    >
                      <h3 className="text-lg font-semibold">Water sources</h3>
                      <p
                        className="mt-2 text-sm leading-7"
                        style={{ color: "rgb(var(--muted))" }}
                      >
                        Leaky pipes, irrigation systems, clogged drains, and
                        standing water can attract rodents seeking hydration.
                      </p>
                    </div>

                    <div
                      className="rounded-2xl border p-5"
                      style={{
                        borderColor: "rgb(var(--border))",
                        background: "rgb(var(--bg))",
                      }}
                    >
                      <h3 className="text-lg font-semibold">Nearby vegetation</h3>
                      <p
                        className="mt-2 text-sm leading-7"
                        style={{ color: "rgb(var(--muted))" }}
                      >
                        Dense shrubs, tree branches touching the roof, and yard
                        clutter provide hiding places and access to the home.
                      </p>
                    </div>
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
                    href="/sharkeys-pest-control-booking"
                    className="inline-flex items-center rounded-2xl px-5 py-3 text-sm font-semibold transition hover:opacity-90"
                    style={{
                      background: "rgb(var(--primary))",
                      color: "rgb(var(--primary-fg))",
                    }}
                  >
                    Request Rodent Control
                  </Link>

                  <Link
                    href="/contact"
                    className="inline-flex items-center rounded-2xl border px-5 py-3 text-sm font-semibold transition hover:opacity-90"
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
                  <li>• Food and trash are major rodent attractants</li>
                  <li>• Rats seek protected nesting areas</li>
                  <li>• Moisture issues increase activity</li>
                  <li>• Vegetation and clutter create access paths</li>
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
                  <p>Hero: home exterior with rodent risk points</p>
                  <p>Mid-article: small entry hole or vent gap</p>
                  <p>Section image: attic, garage, or crawlspace nesting area</p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </article>
    </main>
  );
}