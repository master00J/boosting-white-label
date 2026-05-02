import type { Metadata } from "next";
import Link from "next/link";
import { Key } from "lucide-react";

export const metadata: Metadata = { title: "API Keys" };

export default function ApiKeysPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Settings</p>
        <h1 className="font-heading text-2xl font-semibold">API Keys</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Manage API keys for external integrations.</p>
      </div>
      <div className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] space-y-3">
        <p className="text-sm text-[var(--text-secondary)]">
          This dedicated screen is still <span className="font-medium text-foreground">coming soon</span>. For AI provider and API key fields that work today (Setup Assistant fallback, ticket AI), use{" "}
          <Link href="/admin/helpdesk/settings" className="text-primary hover:underline font-medium">
            Helpdesk → AI &amp; Settings
          </Link>
          .
        </p>
      </div>
      <div className="p-10 rounded-2xl border border-dashed border-[var(--border-default)] text-center text-[var(--text-muted)]">
        <Key className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">Coming soon</p>
        <p className="text-xs mt-1 opacity-60">Central API key management for all integrations will land here in a future update.</p>
      </div>
    </div>
  );
}
