import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { SetupCoachPanel } from "@/components/admin/setup-coach-panel";

export const metadata: Metadata = {
  title: "Setup Assistant",
  description: "Interactive AI help for configuring your boosting storefront.",
};

export default function AdminSetupAssistantPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/15 p-3 border border-primary/25">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Setup Assistant</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Ask about payments, catalog, Discord, workers, and more. Answers use an internal admin guide; for static docs see{" "}
            <a href="/admin/guide" className="text-primary hover:underline">
              Admin Guide
            </a>
            . Hosted shops use platform AI by default. To bring your own provider key, use{" "}
            <a href="/admin/helpdesk/settings" className="text-primary hover:underline">
              Helpdesk → AI &amp; Settings
            </a>{" "}
            (the Settings → API Keys screen is not live yet).
          </p>
        </div>
      </div>
      <SetupCoachPanel variant="page" />
    </div>
  );
}
