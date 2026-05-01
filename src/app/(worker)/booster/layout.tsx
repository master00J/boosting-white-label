import type { Metadata } from "next";
import WorkerShell from "@/components/layouts/worker-shell";

export const metadata: Metadata = {
  title: {
    template: "%s | Booster — BoostPlatform",
    default: "Booster Dashboard — BoostPlatform",
  },
};

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return <WorkerShell>{children}</WorkerShell>;
}
