import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { SetupCoachPanel } from "@/components/admin/setup-coach-panel";

export const metadata: Metadata = {
  title: "Setup-assistent",
  description: "Interactieve AI-hulp bij het configureren van je boosting shop.",
};

export default function AdminSetupAssistantPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/15 p-3 border border-primary/25">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Setup-assistent (AI)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stel vragen over betalingen, catalogus, Discord, workers en meer. De assistant gebruikt een uitgebreide interne handleiding;
            voor statische uitleg zie ook{" "}
            <a href="/admin/guide" className="text-primary hover:underline">
              Admin Guide
            </a>
            . Configureer API-keys onder{" "}
            <a href="/admin/settings/api-keys" className="text-primary hover:underline">
              Settings → API Keys
            </a>
            .
          </p>
        </div>
      </div>
      <SetupCoachPanel variant="page" />
    </div>
  );
}
