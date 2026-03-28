// frontend/src/components/home/SiteFooter.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  MapPinned,
  Mail,
  Facebook,
  Instagram,
  Linkedin,
} from "lucide-react";
import type { ReactNode } from "react";

const LOGO_SRC = "/main-logo.jpg";

const SITE_MAP_LINKS = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/#services" },
  { label: "Booking", href: "/sharkys-pest-control-booking" },
  { label: "Service Area", href: "/service-area" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

const SERVICE_LINKS = [
  { label: "Pest Extermination", href: "/pest-control-bay-area" },
  { label: "Wildlife Control", href: "/wildlife-control-bay-area" },
  { label: "Specialty Services", href: "/rodent-control-bay-area" },
  { label: "Commercial Services", href: "/commercial-pest-control-bay-area" },
  { label: "Eco/Green Options", href: "/eco-friendly-pest-control-bay-area" },
  { label: "Customized Plans", href: "/residential-pest-control-bay-area" },
];

const SOCIAL_LINKS = [
  { label: "Facebook", href: "#", icon: Facebook, comingSoon: true },
  { label: "Instagram", href: "https://www.instagram.com/sharkys.pestcontrol/", icon: Instagram, comingSoon: false },
];

type SiteFooterProps = {
  softwareByHref: string;
};

type FooterSectionProps = {
  title: string;
  delay?: number;
  children: ReactNode;
};

function RevealSection({
  title,
  delay = 0,
  children,
}: FooterSectionProps) {
  const shouldReduceMotion = useReducedMotion();

  const content = (
    <div className="text-center md:text-left">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-white/65">
        {title}
      </h3>
      {children}
    </div>
  );

  if (shouldReduceMotion) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay }}
    >
      {content}
    </motion.div>
  );
}

function FooterLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  const className =
    "inline-flex w-full items-center justify-center rounded-xl px-3 py-2 text-sm text-white/85 transition duration-300 hover:bg-white/10 hover:text-white md:justify-start";

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export default function SiteFooter({
  softwareByHref,
}: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className="relative mt-20 w-full overflow-hidden border-t"
      style={{
        borderColor: "rgb(var(--border))",
        background:
          "radial-gradient(40% 160px at 50% 0%, rgba(255,255,255,0.08), transparent), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
      }}
    >
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-[38%] -translate-x-1/2 bg-white/30 blur-sm" />

      <div className="mx-auto max-w-7xl px-4 py-10 text-center sm:px-6 lg:px-8 lg:py-14 md:text-left">
        <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr] xl:gap-12">
          <RevealSection title="Sharkys Pest Control" delay={0}>
            <div className="mx-auto flex max-w-sm flex-col items-center md:mx-0 md:items-start">
              <div className="mb-4 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden">
                  <Image
                    src={LOGO_SRC}
                    alt="Sharkys Pest Control logo"
                    fill
                    className="object-contain"
                    sizes="64px"
                  />
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    Sharkys Pest Control
                  </p>
                  <p className="text-xs text-white/60">
                    Bay Area pest & wildlife solutions
                  </p>
                </div>
              </div>

              <p className="text-sm leading-6 text-white/75 md:text-left">
                Reliable pest control, wildlife removal, eco-friendly treatments,
                and customized service plans for homes and businesses across the
                Bay Area.
              </p>
            </div>
          </RevealSection>

          <RevealSection title="Site Map" delay={0.08}>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1">
              {SITE_MAP_LINKS.map((item) => (
                <li key={item.href} className="flex justify-center md:justify-start">
                  <FooterLink href={item.href}>{item.label}</FooterLink>
                </li>
              ))}
            </ul>
          </RevealSection>

          <RevealSection title="Services" delay={0.16}>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-1">
              {SERVICE_LINKS.map((item) => (
                <li key={item.href} className="flex justify-center md:justify-start">
                  <FooterLink href={item.href}>{item.label}</FooterLink>
                </li>
              ))}
            </ul>
          </RevealSection>

          <RevealSection title="Contact & Socials" delay={0.24}>
            <div className="space-y-3">
              <a
                href="mailto:Office.sharkyspestcontrol@gmail.com"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-white/85 transition duration-300 hover:bg-white/10 hover:text-white md:justify-start"
              >
                <Mail className="h-4 w-4 text-yellow-300" />
                <span className="break-all">Office.sharkyspestcontrol@gmail.com</span>
              </a>

              <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/5 p-3 md:mx-0 md:max-w-none">
                <p className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-white/55">
                  <MapPinned className="h-4 w-4" />
                  Service Area
                </p>
                <p className="text-sm text-white/75">
                  Proudly serving Bay Area residential and commercial customers.
                </p>
              </div>

              <ul className="space-y-2 pt-1">
                {SOCIAL_LINKS.map((item) => {
                  const Icon = item.icon;

                  return (
                    <li key={item.label}>
                      {item.comingSoon ? (
                        <span className="inline-flex w-full cursor-default items-center justify-between rounded-xl px-3 py-2 text-sm text-white/50">
                          <span className="inline-flex items-center gap-2">
                            <Icon className="h-4 w-4 text-yellow-300/40" />
                            {item.label}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/40">
                            Coming soon
                          </span>
                        </span>
                      ) : (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/85 transition duration-300 hover:bg-white/10 hover:text-white"
                        >
                          <Icon className="h-4 w-4 text-yellow-300" />
                          {item.label}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </RevealSection>
        </div>

        <div
          className="mt-10 border-t pt-6"
          style={{ borderColor: "rgba(255,255,255,0.14)" }}
        >
          <div className="flex flex-col items-center gap-3 text-sm text-white/85 md:flex-row md:justify-between">
            <p className="text-center md:text-left">
              © {year} Sharkys Pest Control. All rights reserved.
            </p>

            <p className="text-center md:text-right">
              Software solutions by{" "}
              <Link
                href={softwareByHref}
                target="_blank"
                rel="noreferrer"
                className="text-yellow-300 transition hover:underline"
              >
                Francisco Rones
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}