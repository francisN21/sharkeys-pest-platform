import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "../../components/Navbar";
import PageTracker from "../../components/PageTracker";
import SiteFooter from "@/src/components/home/SiteFooter";
import ScrollReveal from "../../components/ScrollReveal";
import {
  Mail,
  Phone,
  MapPin,
  CalendarCheck,
  UserCircle,
  ClipboardList,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Clock,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us | Sharkys Pest Control | Bay Area",
  description:
    "Get in touch with Sharkys Pest Control. Book a service online, send us an email, or call us directly. Serving the Bay Area.",
  openGraph: {
    title: "Contact Sharkys Pest Control",
    description:
      "Reach out to Sharkys Pest Control — book online or contact us directly. Bay Area pest control services.",
    url: "https://sharkyspestcontrolbayarea.com/contact",
    siteName: "Sharkys Pest Control",
    type: "website",
  },
};

const LINKEDIN_SOFTWARE_BY_HREF = "https://www.linkedin.com/in/franciscorones/";

const HOW_IT_WORKS = [
  {
    step: "1",
    icon: ClipboardList,
    title: "Book Your Service",
    desc: "Head to our booking page. No account needed — just pick your service, choose a date and time that works for you, and enter your address.",
    accent: "rgba(59,130,246,0.12)",
    iconColor: "#3b82f6",
    glowColor: "rgba(59,130,246,0.25)",
  },
  {
    step: "2",
    icon: UserCircle,
    title: "Create Your Account",
    desc: "After booking, you'll receive an email invite to create your Sharkys account. Set up your password to access your customer portal.",
    accent: "rgba(99,102,241,0.12)",
    iconColor: "#6366f1",
    glowColor: "rgba(99,102,241,0.25)",
  },
  {
    step: "3",
    icon: CalendarCheck,
    title: "We Confirm & Assign",
    desc: "Our team reviews your booking, accepts it, and assigns a technician. You'll get an email notification once a tech is on their way.",
    accent: "rgba(16,185,129,0.12)",
    iconColor: "#10b981",
    glowColor: "rgba(16,185,129,0.25)",
  },
  {
    step: "4",
    icon: MessageSquare,
    title: "Track & Message",
    desc: "Log in to your portal to track your booking status, message your technician directly, and view your full service history.",
    accent: "rgba(245,158,11,0.12)",
    iconColor: "#f59e0b",
    glowColor: "rgba(245,158,11,0.25)",
  },
  {
    step: "5",
    icon: CheckCircle2,
    title: "Service Complete",
    desc: "Your technician completes the job and sets the final price. You'll receive a completion email with a full summary of the service.",
    accent: "rgba(236,72,153,0.12)",
    iconColor: "#ec4899",
    glowColor: "rgba(236,72,153,0.25)",
  },
];

// ─── Contact image cards ──────────────────────────────────────────────────────
// Replace the imageUrl values with your actual image paths in /public/
const CONTACT_CARDS = [
  {
    icon: Mail,
    label: "Email Us",
    value: "Office.sharkyspestcontrol@gmail.com",
    href: "mailto:Office.sharkyspestcontrol@gmail.com",
    cta: "Send an email",
    // 📌 PLACEHOLDER — replace with your image: /public/contact-email-bg.jpg
    imageUrl: "/Deillen-1.png",
  },
  {
    icon: Phone,
    label: "Call Us",
    value: "(707) 361-5023",
    href: "tel:+17073615023",
    cta: "Give us a call",
    // 📌 PLACEHOLDER — replace with your image: /public/contact-phone-bg.jpg
    imageUrl: "/Deillen-2.png",
  },
  {
    icon: MapPin,
    label: "Service Area",
    value: "Bay Area, CA",
    href: "/service-area",
    cta: "View coverage",
    // 📌 PLACEHOLDER — replace with your image: /public/contact-area-bg.jpg
    imageUrl: "/Deillen-3.png",
  },
];

// ─── Team members ─────────────────────────────────────────────────────────────
// Replace imageUrl with your actual owner photos in /public/
const TEAM = [
  {
    name: "Allan Garcia",
    role: "Owner & Founder",
    bio: "Bay Area native with years of hands-on pest control experience. Passionate about protecting homes and families from unwanted guests.",
    // 📌 PLACEHOLDER — replace with owner photo: /public/team-owner-1.jpg
    imageUrl: "/team-owner-1.jpg",
  },
  {
    name: "Deillen Garcia",
    role: "Co-Owner & Operations",
    bio: "Manages day-to-day operations and ensures every job meets Sharkys' high standards of service and customer satisfaction.",
    // 📌 PLACEHOLDER — replace with owner photo: /public/team-owner-2.jpg
    imageUrl: "/Deillen.png",
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="space-y-10">
          <PageTracker
            items={[
              { label: "Home", href: "/" },
              { label: "Contact" },
            ]}
          />

          {/* ── Hero Header ─────────────────────────────────────────────────── */}
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
                  Get in Touch
                </div>

                <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
                  We&rsquo;re Here to Help
                </h1>

                <p
                  className="mt-4 max-w-2xl text-base leading-7 sm:text-lg"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  Have a pest problem? Questions about our services? Ready to
                  book? Reach out directly or use our online booking system to
                  get started in minutes.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/sharkys-pest-control-booking"
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{
                      background: "rgb(var(--primary))",
                      color: "rgb(var(--primary-fg))",
                    }}
                  >
                    Book Online
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="mailto:Office.sharkyspestcontrol@gmail.com"
                    className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{
                      borderColor: "rgb(var(--border))",
                      color: "rgb(var(--fg))",
                    }}
                  >
                    <Mail className="h-4 w-4" />
                    Send Email
                  </a>
                </div>

                <div className="mt-5 flex flex-wrap gap-3 text-sm">
                  {["Bay Area Coverage", "Fast Response", "Online Booking"].map(
                    (tag) => (
                      <span
                        key={tag}
                        className="rounded-full border px-3 py-1"
                        style={{
                          borderColor: "rgb(var(--border))",
                          background: "rgb(var(--bg))",
                          color: "rgb(var(--muted))",
                        }}
                      >
                        {tag}
                      </span>
                    )
                  )}
                </div>
              </div>

              {/* Hero right — phone callout */}
              <div
                className="relative hidden overflow-hidden rounded-2xl border md:block"
                style={{
                  borderColor: "rgb(var(--border))",
                  minHeight: "260px",
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
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl border"
                    style={{
                      borderColor: "rgba(255,255,255,0.12)",
                      background: "rgba(59,130,246,0.15)",
                    }}
                  >
                    <Phone className="h-8 w-8 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
                      Call Us Directly
                    </p>
                    <p className="mt-1 text-2xl font-bold text-white">
                      (707) 361-5023
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      background: "rgba(16,185,129,0.15)",
                      color: "#6ee7b7",
                    }}
                  >
                    <Clock className="h-3 w-3" />
                    Available during business hours
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* ── Contact Image Cards ──────────────────────────────────────────── */}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {CONTACT_CARDS.map((card, i) => {
              const Icon = card.icon;
              return (
                <ScrollReveal key={card.label} delay={i * 80}>
                  <a
                    href={card.href}
                    className="group relative block overflow-hidden rounded-3xl border transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    style={{
                      borderColor: "rgb(var(--border))",
                      background: `linear-gradient(180deg, rgba(12,18,46,0.08) 0%, rgba(12,18,46,0.75) 100%), url(${card.imageUrl}) center / cover no-repeat`,
                    }}
                  >
                    {/* Shimmer overlay */}
                    <div
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{
                        background:
                          "linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.08) 35%, transparent 70%)",
                      }}
                    />
                    {/* Inner scale layer */}
                    <div
                      className="pointer-events-none absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(20,28,70,0.18) 0%, rgba(12,18,46,0.78) 100%)",
                      }}
                    />

                    <div className="relative flex min-h-[280px] flex-col justify-end p-6 sm:min-h-[320px]">
                      <div className="mb-3 flex items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em] transition-transform duration-300 group-hover:translate-x-0.5"
                          style={{
                            borderColor: "rgba(255,255,255,0.16)",
                            background: "rgba(255,255,255,0.10)",
                            color: "#ffffff",
                            backdropFilter: "blur(8px)",
                          }}
                        >
                          <Icon className="h-3 w-3" />
                          {card.label}
                        </span>
                      </div>

                      <h2 className="max-w-[28ch] text-2xl font-extrabold leading-tight tracking-tight text-white transition-transform duration-300 group-hover:translate-y-[-2px] sm:text-3xl">
                        {card.value}
                      </h2>

                      <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-white">
                        <span className="transition-transform duration-300 group-hover:translate-x-0.5">
                          {card.cta}
                        </span>
                        <span
                          className="transition-transform duration-300 group-hover:translate-x-1"
                          aria-hidden="true"
                        >
                          →
                        </span>
                      </div>
                    </div>
                  </a>
                </ScrollReveal>
              );
            })}
          </div>

          {/* ── Meet the Team ────────────────────────────────────────────────── */}
          <ScrollReveal>
            <div
              className="rounded-[2rem] border p-6 md:p-10"
              style={{
                borderColor: "rgb(var(--border))",
                background:
                  "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(79,70,229,0.10) 40%, rgb(var(--card)) 100%)",
              }}
            >
              <div className="mb-8">
                <div
                  className="inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgba(59,130,246,0.08)",
                    color: "rgb(var(--fg))",
                  }}
                >
                  Meet the Team
                </div>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
                  The People Behind Sharkys
                </h2>
                <p
                  className="mt-2 max-w-xl text-base leading-relaxed"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  A family-run business built on trust, quality, and a genuine
                  commitment to the Bay Area community.
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                {TEAM.map((member, i) => (
                  <ScrollReveal key={member.name + i} delay={i * 100}>
                    <div
                      className="group relative overflow-hidden rounded-3xl border transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl"
                      style={{
                        borderColor: "rgb(var(--border))",
                        // Background image — replace imageUrl in TEAM array above
                        background: `linear-gradient(180deg, rgba(12,18,46,0.10) 0%, rgba(12,18,46,0.80) 100%), url(${member.imageUrl}) center top / cover no-repeat`,
                      }}
                    >
                      {/* Inner scale on hover */}
                      <div
                        className="pointer-events-none absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(20,28,70,0.10) 0%, rgba(12,18,46,0.72) 100%)",
                        }}
                      />

                      <div className="relative flex min-h-[340px] flex-col justify-end p-7 sm:min-h-[380px]">
                        <div className="mb-2">
                          <span
                            className="inline-flex rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.08em]"
                            style={{
                              borderColor: "rgba(255,255,255,0.16)",
                              background: "rgba(255,255,255,0.10)",
                              color: "#ffffff",
                              backdropFilter: "blur(8px)",
                            }}
                          >
                            {member.role}
                          </span>
                        </div>
                        <h3 className="text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                          {member.name}
                        </h3>
                        <p className="mt-3 text-sm leading-relaxed text-white/80">
                          {member.bio}
                        </p>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* ── How It Works ─────────────────────────────────────────────────── */}
          <ScrollReveal>
            <div
              className="rounded-[2rem] border p-6 md:p-10"
              style={{
                borderColor: "rgb(var(--border))",
                background: "rgb(var(--card))",
              }}
            >
              <div className="mb-8 flex flex-col gap-2">
                <div
                  className="inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgba(59,130,246,0.08)",
                    color: "rgb(var(--fg))",
                  }}
                >
                  How It Works
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Book, Track & Manage Your Service Online
                </h2>
                <p
                  className="max-w-2xl text-base leading-relaxed"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  Our online platform makes it easy to book pest control, track
                  your appointment, and communicate with your technician — all
                  in one place.
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {HOW_IT_WORKS.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <ScrollReveal key={step.step} delay={i * 70}>
                      {/* Outer wrapper handles translate + shadow on hover */}
                      <div
                        className="group relative flex h-full cursor-default flex-col gap-4 rounded-2xl border p-5 transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-xl"
                        style={{
                          borderColor: "rgb(var(--border))",
                          background: step.accent,
                          // CSS variable trick: shadow color on hover via inline style is not possible,
                          // so we use the boxShadow trick with a data attribute driven by JS—but since
                          // this is server-side we just rely on the Tailwind hover:shadow-xl above.
                        }}
                      >
                        {/* Glow ring that appears on hover */}
                        <div
                          className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                          style={{
                            boxShadow: `inset 0 0 0 1.5px ${step.glowColor}`,
                          }}
                        />

                        <div className="flex items-start justify-between">
                          {/* Icon — scales up on card hover */}
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                            style={{ background: "rgb(var(--card))" }}
                          >
                            <Icon
                              className="h-5 w-5 transition-colors duration-300"
                              style={{ color: step.iconColor }}
                            />
                          </div>
                          {/* Step number — fades in more on hover */}
                          <span
                            className="text-3xl font-black leading-none transition-opacity duration-300 group-hover:opacity-30"
                            style={{ color: step.iconColor, opacity: 0.15 }}
                          >
                            {step.step}
                          </span>
                        </div>

                        <div>
                          {/* Title — lifts slightly on hover */}
                          <p className="text-sm font-bold transition-transform duration-300 group-hover:-translate-y-px">
                            {step.title}
                          </p>
                          <p
                            className="mt-1.5 text-sm leading-relaxed"
                            style={{ color: "rgb(var(--muted))" }}
                          >
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    </ScrollReveal>
                  );
                })}
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/sharkys-pest-control-booking"
                  className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{
                    background: "rgb(var(--primary))",
                    color: "rgb(var(--primary-fg))",
                  }}
                >
                  Start Your Booking
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{
                    borderColor: "rgb(var(--border))",
                    color: "rgb(var(--fg))",
                  }}
                >
                  Sign In to Portal
                </Link>
              </div>
            </div>
          </ScrollReveal>

          {/* ── FAQ ──────────────────────────────────────────────────────────── */}
          <ScrollReveal>
            <div
              className="rounded-[2rem] border p-6 md:p-10"
              style={{
                borderColor: "rgb(var(--border))",
                background:
                  "linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(79,70,229,0.08) 40%, rgb(var(--card)) 100%)",
              }}
            >
              <div className="mb-6">
                <div
                  className="inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{
                    borderColor: "rgb(var(--border))",
                    background: "rgba(59,130,246,0.08)",
                    color: "rgb(var(--fg))",
                  }}
                >
                  Quick Answers
                </div>
                <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
                  Common Questions
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  {
                    q: "Do I need an account to book?",
                    a: "No — you can book without an account. After submitting, you'll receive an email invite to create your portal account so you can track the job.",
                  },
                  {
                    q: "How do I check my booking status?",
                    a: "Log in to your customer portal at sharkyspestcontrolbayarea.com. Your dashboard shows all active and past bookings with real-time status updates.",
                  },
                  {
                    q: "Can I message my technician?",
                    a: "Yes. Once a technician is assigned to your booking, a messaging thread opens in your portal where you can communicate directly with them.",
                  },
                  {
                    q: "How is the final price set?",
                    a: "Your technician reviews the job on-site and sets the final price upon completion. You'll receive a summary email with the full service details.",
                  },
                  {
                    q: "What areas do you serve?",
                    a: "We serve Benicia, Vallejo, Fairfield, Hercules, Martinez, and surrounding Bay Area cities. Check our service area page for the full list.",
                  },
                  {
                    q: "How do I cancel or reschedule?",
                    a: "Log in to your customer portal and manage your booking from your dashboard. You can also email or call us directly for assistance.",
                  },
                ].map((faq, i) => (
                  <ScrollReveal key={i} delay={i * 50}>
                    <div
                      className="rounded-xl border p-5"
                      style={{
                        borderColor: "rgb(var(--border))",
                        background: "rgb(var(--card))",
                      }}
                    >
                      <p className="text-sm font-bold">{faq.q}</p>
                      <p
                        className="mt-2 text-sm leading-relaxed"
                        style={{ color: "rgb(var(--muted))" }}
                      >
                        {faq.a}
                      </p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
          <ScrollReveal>
            <div
              className="flex flex-col items-center gap-5 rounded-[2rem] border p-8 text-center md:p-12"
              style={{
                borderColor: "rgb(var(--border))",
                background:
                  "linear-gradient(135deg, rgba(37,99,235,0.10) 0%, rgba(79,70,229,0.12) 40%, rgb(var(--card)) 100%)",
              }}
            >
              <div
                className="flex h-14 w-14 items-center justify-center rounded-2xl"
                style={{ background: "rgba(59,130,246,0.12)" }}
              >
                <Mail className="h-7 w-7 text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  Still Have Questions?
                </h2>
                <p
                  className="mx-auto mt-2 max-w-md text-base"
                  style={{ color: "rgb(var(--muted))" }}
                >
                  Our team is happy to help. Send us an email and we&rsquo;ll
                  get back to you as soon as possible.
                </p>
              </div>
              <a
                href="mailto:Office.sharkyspestcontrol@gmail.com"
                className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-base font-semibold transition-opacity hover:opacity-80"
                style={{
                  background: "rgb(var(--primary))",
                  color: "rgb(var(--primary-fg))",
                }}
              >
                Office.sharkyspestcontrol@gmail.com
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="md:min-h-screen md:flex md:flex-col md:justify-end">
        <SiteFooter softwareByHref={LINKEDIN_SOFTWARE_BY_HREF} />
      </section>
    </main>
  );
}
