import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Security" };

export default function SecurityPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Settings</p>
        <h1 className="font-heading text-2xl font-semibold">Security</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Manage security settings and access controls.</p>
      </div>
      <div className="p-10 rounded-2xl border border-dashed border-[var(--border-default)] text-center text-[var(--text-muted)]">
        <ShieldCheck className="h-8 w-8 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">Coming soon</p>
        <p className="text-xs mt-1 opacity-60">Security settings will be available in a future update.</p>
      </div>
    </div>
  );
}
