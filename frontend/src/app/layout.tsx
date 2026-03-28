import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AuthProvider } from "../components/AuthProvider";
import ThemeProvider from "../components/ThemeProvider";
import { Toaster } from "../components/ui/sonner";
import { RealtimeBootstrap } from "../../src/lib/realtime/RealtimeBoostrap";

export const metadata: Metadata = {
  title: "Sharkys Pest Control | Bay Area",
  description:
    "Residential and commercial pest control services in the Bay Area. Book rodent, termite, roach, bee, and scorpion services online.",
  icons: {
    icon: [
      { url: "/main-logo.jpg", sizes: "16x16", type: "image/png" },
      { url: "/main-logo.jpg", sizes: "32x32", type: "image/png" },
    ],
    apple: "/main-logo.jpg",
    shortcut: "/main-logo.jpg",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? "";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
        />

        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "PestControl",
              "name": "Sharkys Pest Control",
              "image": "https://sharkyspestcontrolbayarea.com/main-logo.jpg",
              "telephone": "+1-707-361-5023",
              "email": "office.sharkyspestcontrol@gmail.com",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Benicia",
                "addressRegion": "CA",
                "addressCountry": "US"
              },
              "areaServed": [
                "Benicia CA",
                "Vallejo CA",
                "Fairfield CA",
                "Concord CA",
                "Martinez CA",
                "San Francisco CA",
                "Oakland CA"
              ],
              "url": "https://sharkyspestcontrolbayarea.com"
            })
          }}
        />
      </head>

      {process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? (
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}
          strategy="afterInteractive"
        />
      ) : null}

      <body className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 text-foreground antialiased">
        <AuthProvider>
          <ThemeProvider>
            <RealtimeBootstrap>
              {children}
              <Toaster />
            </RealtimeBootstrap>
            <Analytics />
            <SpeedInsights />
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}