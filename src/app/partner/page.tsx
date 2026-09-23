import type { Metadata } from "next";
import { PartnerDashboard } from "@/components/partner/PartnerDashboard";

export const metadata: Metadata = { title: "Partner-portal · AIbooking", robots: { index: false } };

export default function PartnerPage() {
  return <PartnerDashboard />;
}
