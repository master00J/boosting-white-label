"use client";

import { useState } from "react";
import { Save, Loader2, Check, Mail, MessageSquare } from "lucide-react";

const EMAIL_TOGGLES = [
  { key: "email_new_order", label: "New order", desc: "Email to customer on confirmation" },
  { key: "email_order_completed", label: "Order completed", desc: "Email to customer on completion" },
  { key: "email_worker_approved", label: "Booster approved", desc: "Email to booster on approval" },
  { key: "email_ticket_created", label: "Ticket created", desc: "Confirmation email on new ticket" },
];

const DISCORD_TOGGLES = [
  { key: "discord_notify_new_orders", label: "New orders", desc: "Notification in Discord on new order" },
  { key: "discord_notify_completed", label: "Completed orders", desc: "Notification on completed order" },
  { key: "discord_notify_payouts", label: "Payouts", desc: "Notification on payout request" },
];

export default function NotificationSettingsClient({ initialSettings }: { initialSettings: Record<string, string> }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (key: string) => setSettings((p) => ({ ...p, [key]: p[key] === "true" ? "false" : "true" }));

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } finally {
      setSaving(false);
    }
  };

  const ToggleRow = ({ t }: { t: { key: string; label: string; desc: string } }) => (
    <label className="flex items-center gap-3 cursor-pointer">
      <div onClick={() => toggle(t.key)} className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${settings[t.key] !== "false" ? "bg-primary" : "bg-[var(--bg-elevated)]"}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings[t.key] !== "false" ? "translate-x-5" : "translate-x-1"}`} />
      </div>
      <div>
        <p className="text-sm font-medium">{t.label}</p>
        <p className="text-xs text-[var(--text-muted)]">{t.desc}</p>
      </div>
    </label>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Settings</p>
          <h1 className="font-heading text-2xl font-semibold">Notifications</h1>
        </div>
        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved!" : "Save"}
        </button>
      </div>

      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <h2 className="font-heading font-semibold text-sm">Email notifications</h2>
        </div>
        {EMAIL_TOGGLES.map((t) => <ToggleRow key={t.key} t={t} />)}
      </div>

      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-indigo-400" />
          <h2 className="font-heading font-semibold text-sm">Discord notifications</h2>
        </div>
        {DISCORD_TOGGLES.map((t) => <ToggleRow key={t.key} t={t} />)}
      </div>
    </div>
  );
}
