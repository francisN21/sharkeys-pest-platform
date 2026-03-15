import Link from "next/link";

const MOBILE_LINKS = [
  { label: "Home", href: "/" },
  { label: "Booking", href: "/sharkys-pest-control-booking" },
  { label: "Services", href: "/pest-control-bay-area" },
  { label: "Service Area", href: "/service-area" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
  { label: "Privacy Policy", href: "/privacy-policy" },
];

type MobileSiteFooterProps = {
  businessName?: string;
  linkedinHref: string;
};

export default function MobileSiteFooter({
  businessName = "Sharkys Pest Control",
  linkedinHref,
}: MobileSiteFooterProps) {
  return (
    <footer
      className="mt-14 md:hidden"
      style={{ background: "rgb(49 46 129)" }}
    >
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div
          className="grid grid-cols-2 gap-3 rounded-[1.5rem] border p-4"
          style={{
            borderColor: "rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          {MOBILE_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-white/10"
              style={{ color: "rgba(255,255,255,0.92)" }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div
          className="mt-6 border-t pt-6 text-center"
          style={{ borderColor: "rgba(255,255,255,0.12)" }}
        >
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.88)" }}>
            © 2025 {businessName}. All rights reserved. |{" "}
            <Link href="/privacy-policy" className="underline underline-offset-2">
              Privacy Policy
            </Link>
          </p>

          <p
            className="mt-4 text-sm"
            style={{ color: "rgba(255,255,255,0.88)" }}
          >
            Software solutions by{" "}
            <Link
              href={linkedinHref}
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline underline-offset-2"
            >
              Your LinkedIn Name
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
