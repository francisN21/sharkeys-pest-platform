import "./globals.css";
import type { Metadata } from "next";
import ThemeProvider from "../components/ThemeProvider";


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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}