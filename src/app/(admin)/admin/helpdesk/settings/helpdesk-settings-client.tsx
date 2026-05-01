"use client";

import { useState } from "react";
import { Save, Loader2, Check, AlertCircle, Bot, Eye, EyeOff } from "lucide-react";

type Settings = Record<string, string>;

export default function HelpdeskSettingsClient({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showKey, setShowKey] = useState(false);
  const update = (key: string, value: string) => {
    setSettings((p) => ({ ...p, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) { setError("Save failed."); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Helpdesk</p>
          <h1 className="font-heading text-2xl font-semibold">Settings</h1>
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

      {/* AI Provider */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-indigo-400" />
          <h2 className="font-heading font-semibold text-sm">AI Provider</h2>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Provider</label>
          <select
            value={settings["ai_provider"] ?? "openai"}
            onChange={(e) => update("ai_provider", e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="openai">OpenAI (GPT)</option>
            <option value="anthropic">Anthropic (Claude)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">API Key</label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={settings["ai_api_key"] ?? ""}
              onChange={(e) => update("ai_api_key", e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-2.5 pr-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowKey((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {settings["ai_provider"] === "anthropic"
              ? "Anthropic API key (starts with sk-ant-)"
              : "OpenAI API key (starts with sk-)"}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Model (optional)</label>
          <input
            type="text"
            value={settings["ai_model"] ?? ""}
            onChange={(e) => update("ai_model", e.target.value)}
            placeholder={settings["ai_provider"] === "anthropic" ? "claude-3-haiku-20240307" : "gpt-4o-mini"}
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">Leave empty to use the default model</p>
        </div>
      </div>

      {/* Auto-reply */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <h2 className="font-heading font-semibold text-sm">Automatisch antwoorden</h2>

        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => update("helpdesk_auto_reply", settings["helpdesk_auto_reply"] === "true" ? "false" : "true")}
            className={`relative w-10 h-6 rounded-full transition-colors ${settings["helpdesk_auto_reply"] === "true" ? "bg-primary" : "bg-[var(--bg-elevated)]"}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings["helpdesk_auto_reply"] === "true" ? "translate-x-5" : "translate-x-1"}`} />
          </div>
          <div>
            <p className="text-sm font-medium">Enable AI auto-reply</p>
            <p className="text-xs text-[var(--text-muted)]">AI automatically answers new tickets</p>
          </div>
        </label>

        <div>
          <label className="block text-sm font-medium mb-1.5">SLA response time (hours)</label>
          <input
            type="number"
            min="1"
            max="168"
            value={settings["helpdesk_sla_hours"] ?? "24"}
            onChange={(e) => update("helpdesk_sla_hours", e.target.value)}
            className="w-32 px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">Maximum time for first response</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
