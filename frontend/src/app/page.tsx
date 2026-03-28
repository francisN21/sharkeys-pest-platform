import Image from "next/image";
import Link from "next/link";
import Navbar from "../components/Navbar";
import ScrollReveal from "../components/ScrollReveal";
import MarketingCard from "../components/ui/marketing-card";
import CertificationLogoCard from "../components/home/CertificationLogoCard";
import SiteFooter from "../components/home/SiteFooter";
import { InfiniteSlider } from "../components/ui/infinite-slider";

const SECTION =
  "flex flex-col justify-start py-20 md:snap-start md:min-h-screen md:justify-center";
const CONTAINER = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

const SERVICES = [
  {
    title: "Pest Extermination",
    desc: "Ants, roaches, bed bugs, fleas/ticks, flies, snails, earwigs, mites, crickets, mosquitoes, spiders, wasps, gophers, moles, voles, and rodents.",
    href: "/pest-control-bay-area",
    accent: "🐜",
  },
  {
    title: "Wildlife Control",
    desc: "Raccoon, skunk, possum, squirrel, and other wildlife—removal and prevention.",
    href: "/wildlife-control-bay-area",
    accent: "🦝",
  },
  {
    title: "Specialty Services",
    desc: "General Pest Control, Rodent Exclusion, Crawl/Attic Clean Up, Vapor Barrier, Rodent Proofing, Pigeon Exclusion, Animal Removal, Tree/Yard Spray, Sanitize & Deodorize.",
    href: "/rodent-control-bay-area",
    accent: "🔬",
  },
  {
    title: "Commercial Services",
    desc: "Partnership-based approach for restaurants, healthcare, and retail—with documentation support.",
    href: "/commercial-pest-control-bay-area",
    accent: "🏢",
  },
  {
    title: "Eco/Green Options",
    desc: "Environmentally conscious treatments available upon request—ask what fits your situation.",
    href: "/eco-friendly-pest-control-bay-area",
    accent: "🌿",
  },
  {
    title: "Customized Plans",
    desc: "Tailored solutions for residential and commercial needs based on your property and pest pressure.",
    href: "/residential-pest-control-bay-area",
    accent: "📋",
  },
];

const HIGHLIGHTS = [
  { title: "Fast Scheduling", desc: "Book online in minutes using our modern UI." },
  { title: "Bay Area Service", desc: "Local coverage with reliable arrival windows." },
  { title: "Clear Pricing", desc: "Residential and commercial packages." },
  { title: "Professional Care", desc: "Respectful service for homes and businesses." },
];

const SLIDER_ITEMS = [
  { type: "area", label: "Benicia · Solano Co." },
  { type: "trust", label: "Licensed & Insured" },
  { type: "area", label: "Vallejo · Solano Co." },
  { type: "area", label: "Fairfield · Solano Co." },
  { type: "trust", label: "Family Owned & Operated" },
  { type: "area", label: "Concord · Contra Costa Co." },
  { type: "area", label: "Martinez · Contra Costa Co." },
  { type: "trust", label: "GreenPro Certified" },
  { type: "area", label: "San Francisco · SF County" },
  { type: "area", label: "Daly City · San Mateo Co." },
  { type: "trust", label: "Bird Barrier Certified" },
  { type: "area", label: "San Ramon · Contra Costa Co." },
  { type: "area", label: "Oakland · Alameda Co." },
  { type: "trust", label: "Bay Area Trusted Since Day One" },
  { type: "area", label: "Walnut Creek · Contra Costa Co." },
  { type: "area", label: "Napa · Napa Co." },
  { type: "area", label: "Santa Rosa · Sonoma Co." },
  { type: "area", label: "Sacramento · Sacramento Co." },
  { type: "area", label: "Hercules · Contra Costa Co." },
  { type: "area", label: "San Rafael · Marin Co." },
];

const CERTIFICATIONS = [
  {
    title: "Green Pro Certified",
    imageSrc: "/greenpro-certified-vector-logo.svg",
    imageAlt: "Green Pro Certified logo",
  },
  {
    title: "Bird Barrier Certified Installer",
    imageSrc: "/bird-barrier-logo.jpg",
    imageAlt: "Bird Barrier Certified Installer logo",
  },
];

const LINKEDIN_SOFTWARE_BY_HREF = "https://www.linkedin.com/in/franciscorones/";

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-x-hidden scroll-smooth md:h-screen md:overflow-y-auto md:snap-y md:snap-mandatory">
      <Navbar />

      {/* Hero */}
      <section id="home" className={`${SECTION} scroll-mt-24 md:scroll-mt-28`}>
        <div className={`${CONTAINER} space-y-6 py-10 lg:py-14`}>
          <div
            className="overflow-hidden rounded-[2rem] border"
            style={{
              borderColor: "rgb(var(--border))",
              background:
                "linear-gradient(135deg, rgba(37,99,235,0.10) 0%, rgba(79,70,229,0.12) 40%, rgb(var(--card)) 100%)",
            }}
          >
            <div className="grid gap-10 p-6 md:grid-cols-[1.1fr_0.9fr] md:items-center md:p-8 lg:p-10">
              <ScrollReveal>
                <div className="space-y-5">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.1em]"
                      style={{
                        borderColor: "rgba(234,179,8,0.35)",
                        background: "rgba(234,179,8,0.08)",
                        color: "rgb(234 179 8)",
                      }}
                    >
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-400" />
                      Bay Area&apos;s Trusted Pest Control
                    </span>
                  </div>

                  <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                    Sharkys Pest Control in Benicia, serving the whole Bay Area.
                  </h1>

                  <p
                    className="max-w-2xl text-base leading-7 sm:text-lg"
                    style={{ color: "rgb(var(--muted))" }}
                  >
                    Reliable, honest, high-quality service backed by personal
                    accountability. From general pest control to wildlife removal
                    and rodent exclusion—our plans are tailored to your needs.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href="/sharkys-pest-control-booking"
                      className="inline-flex items-center rounded-2xl px-5 py-3 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:opacity-95"
                      style={{
                        background: "rgb(var(--primary))",
                        color: "rgb(var(--primary-fg))",
                      }}
                    >
                      Book now
                    </Link>

                    <a
                      href="#services"
                      className="inline-flex items-center rounded-2xl border px-5 py-3 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:opacity-95"
                      style={{
                        borderColor: "rgb(var(--border))",
                        background: "rgb(var(--bg))",
                        color: "rgb(var(--fg))",
                      }}
                    >
                      View services
                    </a>
                  </div>

                  <div className="grid gap-3 pt-3 sm:grid-cols-2">
                    {HIGHLIGHTS.map((h) => (
                      <MarketingCard key={h.title} className="p-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: "rgb(var(--primary))" }}
                          />
                          <div className="text-sm font-semibold">{h.title}</div>
                        </div>
                        <div
                          className="mt-1 text-sm"
                          style={{ color: "rgb(var(--muted))" }}
                        >
                          {h.desc}
                        </div>
                      </MarketingCard>
                    ))}
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal>
                <MarketingCard className="p-4">
                  <div
                    className="group relative aspect-[4/3.5] w-full overflow-hidden rounded-2xl border bg-white"
                    style={{ borderColor: "rgb(var(--border))" }}
                  >
                    <Image
                      src="/main-logo.jpg"
                      alt="Sharkys Pest Control"
                      fill
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      priority
                    />
                  </div>

                  <div
                    className="mt-4 text-sm"
                    style={{ color: "rgb(var(--muted))" }}
                  >
                    Local. Professional. Built on trust and long-term customer care.
                  </div>
                </MarketingCard>
              </ScrollReveal>
            </div>
          </div>

          <ScrollReveal>
            <div className="space-y-1.5">
              <p
                className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em]"
                style={{ color: "rgb(var(--muted))" }}
              >
                Servicing
              </p>
              <InfiniteSlider gap={10} duration={35} durationOnHover={80}>
                {SLIDER_ITEMS.map((item) => (
                  <span
                    key={item.label}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap"
                    style={
                      item.type === "trust"
                        ? {
                            borderColor: "rgba(234,179,8,0.3)",
                            background: "rgba(234,179,8,0.07)",
                            color: "rgb(234 179 8)",
                          }
                        : {
                            borderColor: "rgb(var(--border))",
                            background: "rgb(var(--card))",
                            color: "rgb(var(--fg))",
                          }
                    }
                  >
                    {item.type === "trust" ? (
                      <span className="text-yellow-400">✦</span>
                    ) : (
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full"
                        style={{ background: "rgb(var(--primary))" }}
                      />
                    )}
                    {item.label}
                  </span>
                ))}
              </InfiniteSlider>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* BOOKING FLOW */}
      <section id="booking" className={`${SECTION} scroll-mt-24 md:scroll-mt-28`}>
        <div className={CONTAINER}>
          <ScrollReveal className="mx-auto max-w-5xl">
            <MarketingCard className="p-8">
              <div
                className="inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgba(59,130,246,0.08)",
                  color: "rgb(var(--fg))",
                }}
              >
                Online Booking
              </div>

              <h2 className="mt-4 text-2xl font-bold tracking-tight">
                How booking works
              </h2>
              <p className="mt-2" style={{ color: "rgb(var(--muted))" }}>
                Choose a service, pick a date, and request your appointment online.
              </p>

              <ol
                className="mt-6 grid gap-3 text-sm sm:grid-cols-2"
                style={{ color: "rgb(var(--muted))" }}
              >
                {[
                  "Choose a service that matches your pest issue",
                  "Enter your contact details and property information",
                  "Select your preferred date and time",
                  "Receive confirmation and next steps",
                ].map((step, index) => (
                  <MarketingCard key={step} className="p-4">
                    <div
                      className="flex items-center gap-2 text-sm font-semibold"
                      style={{ color: "rgb(var(--fg))" }}
                    >
                      <span
                        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                        style={{
                          background: "rgb(var(--primary))",
                          color: "rgb(var(--primary-fg))",
                        }}
                      >
                        {index + 1}
                      </span>
                      Step {index + 1}
                    </div>
                    <div
                      className="mt-2 text-sm"
                      style={{ color: "rgb(var(--muted))" }}
                    >
                      {step}
                    </div>
                  </MarketingCard>
                ))}
              </ol>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/sharkys-pest-control-booking"
                  className="inline-flex items-center rounded-2xl px-5 py-3 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:opacity-95"
                  style={{
                    background: "rgb(var(--primary))",
                    color: "rgb(var(--primary-fg))",
                  }}
                >
                  Start booking
                </Link>

                <a
                  href="#services"
                  className="inline-flex items-center rounded-2xl border px-5 py-3 text-sm font-semibold transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:opacity-95"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgb(var(--bg))",
                    color: "rgb(var(--fg))",
                  }}
                >
                  View services
                </a>
              </div>
            </MarketingCard>
          </ScrollReveal>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className={SECTION}>
        <div className={`${CONTAINER} space-y-8`}>
          <ScrollReveal>
            <div className="space-y-3">
              <div
                className="inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgba(59,130,246,0.08)",
                  color: "rgb(var(--fg))",
                }}
              >
                What We Do
              </div>
              <h2 className="text-2xl font-bold tracking-tight">Services</h2>
              <p className="max-w-3xl" style={{ color: "rgb(var(--muted))" }}>
                Comprehensive pest control solutions for homes and businesses,
                including eco-conscious options.
              </p>
            </div>

            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICES.map((s) => (
                <MarketingCard
                  key={s.title}
                  className="group p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="mb-3 text-2xl">{s.accent}</div>
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div
                    className="mt-2 text-sm"
                    style={{ color: "rgb(var(--muted))" }}
                  >
                    {s.desc}
                  </div>

                  <Link
                    href={s.href}
                    className="mt-4 inline-flex items-center text-sm font-semibold transition-transform duration-200 group-hover:translate-x-1"
                    style={{ color: "rgb(var(--fg))" }}
                  >
                    Request service →
                  </Link>
                </MarketingCard>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className={`${SECTION} scroll-mt-24 md:scroll-mt-28`}>
        <div className={`${CONTAINER} space-y-8`}>
          <ScrollReveal className="grid gap-8 md:grid-cols-2 md:items-start">
            <div>
              <div className="space-y-3">
                <div
                  className="inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgba(59,130,246,0.08)",
                    color: "rgb(var(--fg))",
                  }}
                >
                  Our Story
                </div>
                <h2 className="text-2xl font-bold tracking-tight">About us</h2>
                <p style={{ color: "rgb(var(--muted))" }}>
                  A family-owned and operated company built on trust, accountability,
                  and long-term relationships.
                </p>
              </div>

              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <MarketingCard className="p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: "rgb(var(--primary))" }}
                    />
                    <div className="text-sm font-semibold">Founded in Benicia, CA</div>
                  </div>
                  <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
                    Serving the Bay Area community with pride.
                  </div>
                </MarketingCard>

                <MarketingCard className="p-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: "rgb(var(--primary))" }}
                    />
                    <div className="text-sm font-semibold">Owner-operated</div>
                  </div>
                  <div className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
                    Direct attention and oversight on every service call.
                  </div>
                </MarketingCard>

                {CERTIFICATIONS.map((item) => (
                  <CertificationLogoCard
                    key={item.title}
                    title={item.title}
                    imageSrc={item.imageSrc}
                    imageAlt={item.imageAlt}
                  />
                ))}
              </div>
            </div>

            <MarketingCard className="p-6">
              <div
                className="space-y-4 text-sm leading-relaxed"
                style={{ color: "rgb(var(--muted))" }}
              >
                <p>
                  <span className="font-semibold" style={{ color: "rgb(var(--fg))" }}>
                    Sharkys Pest Control
                  </span>{" "}
                  is a family-owned and operated pest control company located in
                  Benicia, CA—founded by Allan and Deillen, a dedicated father-and-son
                  team committed to protecting homes and businesses from unwanted pests.
                </p>

                <p>
                  Built on decades of combined hands-on experience, Sharkys was created
                  with a clear mission: reliable, honest, high-quality pest control
                  backed by personal accountability.
                </p>

                <p>
                  As an owner-operated business, every service call receives direct
                  attention and oversight. Together, Allan and Deillen provide safe,
                  effective, long-lasting solutions tailored to each property.
                </p>

                <p>
                  We use trusted treatment methods, preventative strategies, and
                  environmentally responsible options. Whether residential or commercial,
                  we treat every space with the same care and respect as our own.
                </p>
              </div>

              <div
                className="mt-6 rounded-2xl border p-5"
                style={{
                  borderColor: "rgb(var(--border))",
                  background: "rgb(var(--bg) / 0.2)",
                }}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3
                      className="text-base font-semibold"
                      style={{ color: "rgb(var(--fg))" }}
                    >
                      Need help fast?
                    </h3>
                    <p className="mt-1 text-sm" style={{ color: "rgb(var(--muted))" }}>
                      Contact Sharkys Pest Control and we&apos;ll help you get scheduled.
                    </p>
                  </div>

                  <Link
                    href="/sharkys-pest-control-booking"
                    className="w-full rounded-xl px-4 py-2 text-center text-sm font-semibold transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:opacity-95 sm:w-auto"
                    style={{
                      background: "rgb(var(--primary))",
                      color: "rgb(var(--primary-fg))",
                    }}
                  >
                    Book now
                  </Link>
                </div>

                <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                  {[
                    { title: "Email", value: "Office.sharkyspestcontrol@gmail.com" },
                    { title: "Office", value: "(707) 361-5023" },
                    { title: "Field Operations", value: "(707) 716-9469" },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                      style={{ background: "rgb(var(--card))" }}
                    >
                      <div className="font-semibold" style={{ color: "rgb(var(--fg))" }}>
                        {item.title}
                      </div>
                      <div className="mt-1 break-all" style={{ color: "rgb(var(--muted))" }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </MarketingCard>
          </ScrollReveal>
        </div>
      </section>

      <section className="md:snap-start md:min-h-[calc(100vh-72px)] md:flex md:flex-col md:justify-end">
        <SiteFooter softwareByHref={LINKEDIN_SOFTWARE_BY_HREF} />
      </section>
    </main>
  );
}