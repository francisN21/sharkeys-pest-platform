import Image from "next/image";
// import Link from "next/link";
// import ThemeToggle from "../src/components/ThemeToggle";
import Navbar from "../components/Navbar";
import ScrollReveal from "../components/ScrollReveal";


const SECTION = "min-h-screen snap-start flex items-center";
const CONTAINER = "mx-auto w-full max-w-6xl px-4";

const SERVICES = [
  { title: "Pest Extermination", desc: "Ants, roaches, bed bugs, fleas/ticks, flies, snails, earwigs, mites, crickets, mosquitoes, spiders, wasps, gophers, moles, voles, and rodents." },
  { title: "Wildlife Control", desc: "Raccoon, skunk, possum, squirrel, and other wildlife—removal and prevention." },
  { title: "Specialty Services", desc: "General Pest Control, Rodent Exclusion, Crawl/Attic Clean Up, Vapor Barrier, Rodent Proofing, Pigeon Exclusion, Animal Removal, Tree/Yard Spray, Sanitize & Deodorize." },
  { title: "Commercial Services", desc: "Partnership-based approach for restaurants, healthcare, and retail—with documentation support." },
  { title: "Eco/Green Options", desc: "Environmentally conscious treatments available upon request—ask what fits your situation." },
  { title: "Customized Plans", desc: "Tailored solutions for residential and commercial needs based on your property and pest pressure." },
];

const HIGHLIGHTS = [
  { title: "Fast Scheduling", desc: "Book online in minutes using our modern UI." },
  { title: "Bay Area Service", desc: "Local coverage with reliable arrival windows." },
  { title: "Clear Pricing", desc: "Residential and commercial packages." },
  { title: "Professional Care", desc: "Respectful service for homes and businesses." },
];

export default function HomePage() {
  return (
    <main className="h-screen overflow-y-auto scroll-smooth md:snap-y md:snap-mandatory">
      {/* Header */}
      
      <Navbar />

      {/* Hero */}
      <section id="spc" className={`${SECTION} scroll-mt-24 md:scroll-mt-28`} style={{ borderColor: "rgb(var(--border))" }} >
        <div className={`${CONTAINER} grid gap-10 md:grid-cols-2 md:items-center`}>
          <ScrollReveal>
            <div className="space-y-5">
              <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
                Sharkys Pest Control in Benicia, serving the Bay Area.
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
              className="rounded-3xl border p-4 md:p-4"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
            >
              <div className="relative aspect-[4/3.5] w-full overflow-hidden rounded-2xl border bg-white"
                   style={{ borderColor: "rgb(var(--border))" }}>
                
                <Image
                  src="/main-logo.jpg"
                  alt="Sharkeys Pest Control"
                  fill
                  className="object-cover"
                  priority
                />
               
              </div>

              <div className="mt-4 text-sm" style={{ color: "rgb(var(--muted))" }}>
                Local. Professional. Built on trust and long-term customer care.
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* BOOKING FLOW (moved under hero) */}
      <section id="booking" className={`${SECTION} scroll-mt-24 md:scroll-mt-28`}>
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

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICES.map((s) => (
                <div
                  key={s.title}
                  className="rounded-2xl border p-6"
                  style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--card))" }}
                >
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="mt-2 text-sm" style={{ color: "rgb(var(--muted))" }}>
                    {s.desc}
                  </div>

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
      <section id="about" className={`${SECTION} scroll-mt-24 md:scroll-mt-28`}>
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
                    Sharkys Pest Control
                  </span>{" "}
                  is a family-owned and operated pest control company located in Benicia, CA—founded by Allan and Deillen,
                  a dedicated father-and-son team committed to protecting homes and businesses from unwanted pests.
                </p>

                <p>
                  Built on decades of combined hands-on experience, Sharkys was created with a clear mission:
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
      <section id="contact" className={`${SECTION} scroll-mt-24 md:scroll-mt-28`}>
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
                © {new Date().getFullYear()} Sharkys Pest Control. All rights reserved.
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
