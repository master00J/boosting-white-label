"use client";

import { useState } from "react";
import {
  Save, Loader2, Check, Mail, Eye, EyeOff,
  ExternalLink, ShieldCheck, Send, AlertTriangle,
} from "lucide-react";

type Settings = Record<string, string>;

function SecretInput({
  label, value, onChange, placeholder, hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "••••••••••••••••••••••"}
          className="w-full pr-10 pl-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono focus:outline-none focus:border-primary/50 transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow((p) => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-default)] transition-colors"
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
      {hint && <p className="text-xs text-[var(--text-muted)] mt-1">{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer ${checked ? "bg-primary" : "bg-[var(--bg-elevated)]"}`}
    >
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
    </div>
  );
}

export default function EmailSettingsClient({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testEmail, setTestEmail] = useState("");

  const update = (key: string, value: string) => setSettings((p) => ({ ...p, [key]: value }));
  const toggle = (key: string) => setSettings((p) => ({ ...p, [key]: p[key] === "false" ? "true" : "false" }));
  const bool = (key: string, def = true) => settings[key] === undefined ? def : settings[key] !== "false";
  const val = (key: string, def = "") => settings[key] ?? def;

  const configured = !!val("resend_api_key");

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmail }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      setTestResult({ ok: res.ok, message: res.ok ? "Test email sent successfully!" : (data.error ?? "Failed to send test email") });
    } catch {
      setTestResult({ ok: false, message: "Network error — could not reach server" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Settings</p>
          <h1 className="font-heading text-2xl font-semibold">Email</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Configure transactional emails via Resend.</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved!" : "Save"}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-sm text-red-400">{error}</div>
      )}

      {/* Resend credentials */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <h2 className="font-heading font-semibold text-sm">Resend credentials</h2>
            {configured && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <ShieldCheck className="h-3 w-3" /> Configured
              </span>
            )}
            {!configured && (
              <span className="flex items-center gap-1 text-xs text-amber-400">
                <AlertTriangle className="h-3 w-3" /> Not configured
              </span>
            )}
          </div>
          <a
            href="https://resend.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Resend Dashboard <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <SecretInput
          label="API Key"
          value={val("resend_api_key")}
          onChange={(v) => update("resend_api_key", v)}
          placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          hint="Create a free API key at resend.com. Env var RESEND_API_KEY takes priority if set."
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5">From address</label>
            <input
              type="email"
              value={val("email_from_address", "noreply@yourdomain.com")}
              onChange={(e) => update("email_from_address", e.target.value)}
              placeholder="noreply@yourdomain.com"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">Must be a verified domain in Resend.</p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5">From name</label>
            <input
              type="text"
              value={val("email_from_name", "BoostPlatform")}
              onChange={(e) => update("email_from_name", e.target.value)}
              placeholder="BoostPlatform"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-blue-400/10 border border-blue-400/20 text-xs text-blue-300">
          <p className="font-semibold mb-1">Free tier: 3,000 emails/month · 100/day · No credit card</p>
          <p>
            Verify your domain at{" "}
            <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200">resend.com/domains</a>
            {" "}to send from your own address. Until verified, use <span className="font-mono">onboarding@resend.dev</span> for testing.
          </p>
        </div>
      </div>

      {/* Email toggles */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <h2 className="font-heading font-semibold text-sm">Email notifications</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)] -mt-1">Choose which automated emails to send.</p>

        {[
          { key: "email_order_confirmed_enabled", label: "Order confirmed", desc: "Sent to customer after successful payment" },
          { key: "email_order_completed_enabled", label: "Order completed", desc: "Sent to customer when booster marks order done" },
          { key: "email_worker_approved_enabled", label: "Booster approved", desc: "Sent to booster when their application is approved" },
          { key: "email_ticket_created_enabled", label: "Support ticket created", desc: "Sent to customer when they open a support ticket" },
          { key: "email_ticket_response_enabled", label: "Support ticket reply", desc: "Sent to customer when their ticket receives a reply" },
        ].map((t) => (
          <div key={t.key} className="flex items-center gap-3">
            <Toggle checked={bool(t.key)} onChange={() => toggle(t.key)} />
            <div>
              <p className="text-sm font-medium">{t.label}</p>
              <p className="text-xs text-[var(--text-muted)]">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Test email */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          <h2 className="font-heading font-semibold text-sm">Send test email</h2>
        </div>
        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="you@example.com"
            className="flex-1 px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
          <button
            type="button"
            onClick={sendTestEmail}
            disabled={testing || !testEmail || !configured}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send test
          </button>
        </div>
        {testResult && (
          <p className={`text-sm ${testResult.ok ? "text-green-400" : "text-red-400"}`}>
            {testResult.ok ? "✓" : "✗"} {testResult.message}
          </p>
        )}
        {!configured && (
          <p className="text-xs text-[var(--text-muted)]">Configure your Resend API key above to send test emails.</p>
        )}
      </div>

      {/* Info */}
      <div className="p-4 rounded-xl bg-blue-400/10 border border-blue-400/20 text-xs text-blue-300 space-y-1.5">
        <p className="font-semibold flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> How keys are stored</p>
        <p>
          Your API key is stored encrypted in Supabase <span className="font-mono">site_settings</span> and loaded server-side only — never exposed to the browser.
          The environment variable <span className="font-mono">RESEND_API_KEY</span> takes priority if set in Vercel.
        </p>
      </div>
    </div>
  );
}
