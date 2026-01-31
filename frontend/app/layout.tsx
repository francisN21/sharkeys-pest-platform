import "./globals.css";
import type { Metadata } from "next";
import ThemeProvider from "../src/components/ThemeProvider";


export const metadata: Metadata = {
  title: "Sharkys Pest Control | Bay Area",
  description:
    "Residential and commercial pest control services in the Bay Area. Book rodent, termite, roach, bee, and scorpion services online.",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}