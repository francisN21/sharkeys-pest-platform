import type { Metadata } from "next";
import PublicBookingPage from "../../components/public/PublicBookingPage";

export const metadata: Metadata = {
  title: "Pest Control Bay Area | Sharkys Pest Control",
  description:
    "Book pest extermination service in the Bay Area with Sharkys Pest Control. Fast scheduling, local service, and professional care.",
};

export default function PestControlBayAreaPage() {
  return (
    <PublicBookingPage
      lockedServiceTitle="Commercial Services"
      pageTitle="Book Commercial Services"
      pageDescription="New customer booking for Commercial Services. Choose your date and time, then submit your request."
      backHref="/"
      backLabel="Back to Home"
    />
  );
}