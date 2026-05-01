import type { Metadata } from "next";
import CustomerShell from "@/components/layouts/customer-shell";

export const metadata: Metadata = {
  title: {
    template: "%s | Dashboard — BoostPlatform",
    default: "Dashboard — BoostPlatform",
  },
};

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <CustomerShell>{children}</CustomerShell>;
}
