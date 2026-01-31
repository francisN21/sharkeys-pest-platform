import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "../src/components/ThemeToggle";
import Navbar from "../src/components/Navbar";
import ScrollReveal from "../src/components/ScrollReveal";


const SECTION = "min-h-screen snap-start flex items-center";
const CONTAINER = "mx-auto w-full max-w-6xl px-4";

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
    <main className="h-screen overflow-y-auto snap-y snap-mandatory scroll-smooth">
      {/* Header */}
      
      <Navbar />

      {/* Hero */}
      <section className={SECTION} style={{ borderColor: "rgb(var(--border))" }}>
        <div className={`${CONTAINER} grid gap-10 md:grid-cols-2 md:items-center`}>
          <ScrollReveal>
            <div className="space-y-5">
              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                Family-owned pest control in Benicia, serving the Bay Area.
              </h1>

              <p className="text-base md:text-lg" style={{ color: "rgb(var(--muted))" }}>
                Reliable, honest, high-quality service backed by personal accountability.
                From general pest control to wildlife removal and rodent exclusion—our plans
                are tailored to your needs.
              </p>

              <div className="flex flex-wrap gap-3">
                <a
                  href="#contact"
                  className="rounded-xl px-5 py-3 text-sm font-semibold hover:opacity-90"
                  style={{ background: "rgb(var(--primary))", color: "rgb(var(--primary-fg))" }}
                >
                  Contact & schedule
                </a>

                <a
                  href="#services"
                  className="rounded-xl border px-5 py-3 text-sm font-semibold hover:opacity-90"
                  style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--fg))" }}
                >
                  View services
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
          </ScrollReveal>

          {/* Hero image/logo placeholder */}
          <ScrollReveal>
            <div
              className="rounded-3xl border p-4 md:p-6"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border bg-white"
                   style={{ borderColor: "rgb(var(--border))" }}>
                {/* Option A: Placeholder block (keep this for now) */}
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <div className="text-sm font-semibold" style={{ color: "rgb(var(--fg))" }}>
                      Image Placeholder
                    </div>
                    <div className="mt-1 text-xs" style={{ color: "rgb(var(--muted))" }}>
                      Put a brand image or large logo here
                    </div>
                    <div className="mt-3 text-xs" style={{ color: "rgb(var(--muted))" }}>
                      Suggested file: <code>/public/hero.jpg</code>
                    </div>
                  </div>
                </div>

                {/* Option B: Once you have an image, replace the placeholder above with this:
                <Image
                  src="/hero.jpg"
                  alt="Sharkey’s Pest Control"
                  fill
                  className="object-cover"
                  priority
                />
                */}
              </div>

              <div className="mt-4 text-sm" style={{ color: "rgb(var(--muted))" }}>
                Local. Professional. Built on trust and long-term customer care.
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* BOOKING FLOW (moved under hero) */}
      <section id="booking" className={SECTION}>
        <div className={CONTAINER}>
          <ScrollReveal className="mx-auto max-w-4xl">
            <div className="rounded-3xl border p-8"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            >
              <h2 className="text-2xl font-semibold tracking-tight">How booking will work</h2>
              <p className="mt-2" style={{ color: "rgb(var(--muted))" }}>
                This is the flow we’ll implement next once the UI is finalized.
              </p>

              <ol className="mt-6 space-y-3 text-sm" style={{ color: "rgb(var(--muted))" }}>
                <li><span className="font-semibold" style={{ color: "rgb(var(--fg))" }}>1)</span> Choose a service (pest, wildlife, or specialty)</li>
                <li><span className="font-semibold" style={{ color: "rgb(var(--fg))" }}>2)</span> Select residential or commercial + enter address</li>
                <li><span className="font-semibold" style={{ color: "rgb(var(--fg))" }}>3)</span> Pick a date & time (blocked if already reserved)</li>
                <li><span className="font-semibold" style={{ color: "rgb(var(--fg))" }}>4)</span> Receive email confirmation + calendar invite</li>
              </ol>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#contact"
                  className="rounded-xl px-5 py-3 text-sm font-semibold hover:opacity-90"
                  style={{ background: "rgb(var(--primary))", color: "rgb(var(--primary-fg))" }}
                >
                  Contact us
                </a>
                <a
                  href="#services"
                  className="rounded-xl border px-5 py-3 text-sm font-semibold hover:opacity-90"
                  style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--fg))" }}
                >
                  View services
                </a>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className={SECTION}>
        <div className={CONTAINER}>
          <ScrollReveal>
            <h2 className="text-2xl font-semibold tracking-tight">Services</h2>
            <p className="mt-2 max-w-3xl" style={{ color: "rgb(var(--muted))" }}>
              Comprehensive pest control solutions for homes and businesses, including eco-conscious options.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Pest Extermination",
                  body:
                    "Ants, roaches, bed bugs, fleas/ticks, flies, snails, earwigs, mites, crickets, mosquitoes, spiders, wasps, gophers, moles, voles, and rodents.",
                },
                {
                  title: "Wildlife Control",
                  body:
                    "Raccoon, skunk, possum, squirrel, and other wildlife—removal and prevention.",
                },
                {
                  title: "Specialty Services",
                  body:
                    "General Pest Control, Rodent Exclusion, Crawl/Attic Clean Up, Vapor Barrier, Rodent Proofing, Pigeon Exclusion, Animal Removal, Tree/Yard Spray, Sanitize & Deodorize.",
                },
                {
                  title: "Commercial Services",
                  body:
                    "Partnership-based approach for restaurants, healthcare, and retail—with documentation support.",
                },
                {
                  title: "Eco/Green Options",
                  body:
                    "Environmentally conscious treatments available upon request—ask what fits your situation.",
                },
                {
                  title: "Customized Plans",
                  body:
                    "Tailored solutions for residential and commercial needs based on your property and pest pressure.",
                },
              ].map((c) => (
                <div
                  key={c.title}
                  className="rounded-2xl border p-5"
                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                >
                  <div className="text-lg font-semibold">{c.title}</div>
                  <p className="mt-2 text-sm" style={{ color: "rgb(var(--muted))" }}>
                    {c.body}
                  </p>
                  <a
                    href="#contact"
                    className="mt-4 inline-block text-sm font-semibold hover:underline"
                    style={{ color: "rgb(var(--fg))" }}
                  >
                    Request service →
                  </a>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className={SECTION}>
        <div className={CONTAINER}>
          <ScrollReveal className="grid gap-8 md:grid-cols-2 md:items-start">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">About us</h2>
              <p className="mt-2" style={{ color: "rgb(var(--muted))" }}>
                A family-owned and operated company built on trust, accountability, and long-term relationships.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border p-4" style={{ borderColor: "rgb(var(--border))" }}>
                  <div className="text-sm font-semibold">Founded in Benicia, CA</div>
                  <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
                    Serving the Bay Area community with pride.
                  </div>
                </div>
                <div className="rounded-2xl border p-4" style={{ borderColor: "rgb(var(--border))" }}>
                  <div className="text-sm font-semibold">Owner-operated</div>
                  <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
                    Direct attention and oversight on every service call.
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border p-6"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            >
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: "rgb(var(--muted))" }}>
                <p>
                  <span className="font-semibold" style={{ color: "rgb(var(--fg))" }}>
                    Sharky’s Pest Control
                  </span>{" "}
                  is a family-owned and operated pest control company located in Benicia, CA—founded by Allan and Deillen,
                  a dedicated father-and-son team committed to protecting homes and businesses from unwanted pests.
                </p>

                <p>
                  Built on decades of combined hands-on experience, Sharky’s was created with a clear mission:
                  reliable, honest, high-quality pest control backed by personal accountability.
                </p>

                <p>
                  As an owner-operated business, every service call receives direct attention and oversight.
                  Together, Allan and Deillen provide safe, effective, long-lasting solutions tailored to each property.
                </p>

                <p>
                  We use trusted treatment methods, preventative strategies, and environmentally responsible options.
                  Whether residential or commercial, we treat every space with the same care and respect as our own.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className={SECTION}>
        <div className={CONTAINER}>
          <ScrollReveal className="mx-auto max-w-4xl">
            <div className="rounded-3xl border p-8" style={{ borderColor: "rgb(var(--border))" }}>
              <h2 className="text-2xl font-semibold tracking-tight">Contact</h2>
              <p className="mt-2" style={{ color: "rgb(var(--muted))" }}>
                Need help fast? Contact us and we’ll get you taken care of.
              </p>

              <div className="mt-6 grid gap-3 text-sm md:grid-cols-3">
                <div className="rounded-2xl p-4" style={{ background: "rgb(var(--card))" }}>
                  <div className="font-semibold" style={{ color: "rgb(var(--fg))" }}>Email</div>
                  <div className="mt-1" style={{ color: "rgb(var(--muted))" }}>
                    Office.sharkyspestcontrol@gmail.com
                  </div>
                </div>

                <div className="rounded-2xl p-4" style={{ background: "rgb(var(--card))" }}>
                  <div className="font-semibold" style={{ color: "rgb(var(--fg))" }}>Office</div>
                  <div className="mt-1" style={{ color: "rgb(var(--muted))" }}>
                    (707) 361-5023
                  </div>
                </div>

                <div className="rounded-2xl p-4" style={{ background: "rgb(var(--card))" }}>
                  <div className="font-semibold" style={{ color: "rgb(var(--fg))" }}>Field Operations</div>
                  <div className="mt-1" style={{ color: "rgb(var(--muted))" }}>
                    (707) 716-9469
                  </div>
                </div>
              </div>

              <div className="mt-8 text-xs" style={{ color: "rgb(var(--muted))" }}>
                © {new Date().getFullYear()} Sharkey’s Pest Control. All rights reserved.
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
