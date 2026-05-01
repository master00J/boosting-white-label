"use client";

import { useState } from "react";
import { Save, Loader2, Check, MessageCircle, ExternalLink, Settings } from "lucide-react";
import Link from "next/link";

type IntegrationSettings = {
  tawkto_enabled?: boolean;
  tawkto_property_id?: string;
  tawkto_widget_id?: string;
  custom_chat_enabled?: boolean;
};

function parseTawkInput(input: string): { propertyId: string; widgetId: string } {
  const trimmed = input.trim();
  const match = trimmed.match(/tawk\.to\/chat\/([a-f0-9]+)\/([a-zA-Z0-9_-]+)/i);
  if (match) return { propertyId: match[1], widgetId: match[2] };
  return { propertyId: trimmed, widgetId: "default" };
}

export default function IntegrationsSettingsClient({
  initialSettings,
}: {
  initialSettings: IntegrationSettings;
}) {
  const [tawkEnabled, setTawkEnabled] = useState(initialSettings.tawkto_enabled ?? false);
  const [propertyId, setPropertyId] = useState(initialSettings.tawkto_property_id ?? "");
  const [widgetId, setWidgetId] = useState(initialSettings.tawkto_widget_id ?? "default");
  const [customChatEnabled, setCustomChatEnabled] = useState(initialSettings.custom_chat_enabled ?? true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const handlePropertyIdBlur = () => {
    if (!propertyId.includes("tawk.to")) return;
    const parsed = parseTawkInput(propertyId);
    setPropertyId(parsed.propertyId);
    setWidgetId(parsed.widgetId);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    const parsed = parseTawkInput(propertyId);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            integrations: {
              tawkto_enabled: tawkEnabled,
              tawkto_property_id: parsed.propertyId,
              tawkto_widget_id: (widgetId.trim() || parsed.widgetId) || "default",
              custom_chat_enabled: customChatEnabled,
            },
          },
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? "Save failed.");
        return;
      }
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
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Settings</p>
          <h1 className="font-heading text-2xl font-semibold">Integrations</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Manage third-party integrations and built-in platform features.
          </p>
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

      {/* Custom Live Chat card */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-sm">Built-in Live Chat</h2>
              <p className="text-xs text-[var(--text-muted)]">Real-time chat between customers and agents — no third-party needed</p>
            </div>
          </div>
          <button
            onClick={() => setCustomChatEnabled(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              customChatEnabled ? "bg-primary" : "bg-[var(--bg-elevated)]"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                customChatEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {customChatEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
              <p className="font-medium mb-0.5">Manage agents</p>
              <p className="text-xs text-[var(--text-muted)] mb-2">Grant or revoke chat access for admins.</p>
              <Link href="/admin/settings/chat-agents" className="text-xs text-primary hover:underline">
                Settings → Chat Agents →
              </Link>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
              <p className="font-medium mb-0.5">View conversations</p>
              <p className="text-xs text-[var(--text-muted)] mb-2">See and reply to all active customer chats.</p>
              <Link href="/admin/chat" className="text-xs text-primary hover:underline">
                Admin → Live Chat →
              </Link>
            </div>
          </div>
        )}

        {!customChatEnabled && (
          <p className="text-xs text-[var(--text-muted)]">
            The chat widget is hidden for customers. Agents can still access the admin chat panel.
          </p>
        )}
      </div>

      {/* Tawk.to card */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#03A84E]/15 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-[#03A84E]" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-sm">Tawk.to Live Chat</h2>
              <p className="text-xs text-[var(--text-muted)]">Embed a Tawk.to widget on your storefront</p>
            </div>
          </div>
          <button
            onClick={() => setTawkEnabled(v => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              tawkEnabled ? "bg-primary" : "bg-[var(--bg-elevated)]"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                tawkEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">
              Property ID
              <a
                href="https://www.tawk.to/knowledgebase/articles/how-to-find-your-property-id-and-widget-id/"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 inline-flex items-center gap-0.5 text-primary hover:underline"
              >
                Where to find this? <ExternalLink className="h-3 w-3" />
              </a>
            </label>
            <input
              type="text"
              value={propertyId}
              onChange={e => setPropertyId(e.target.value)}
              onBlur={handlePropertyIdBlur}
              placeholder="e.g. 58b6df78c323060a97cc766f  or paste full URL"
              disabled={!tawkEnabled}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Paste the full URL from Tawk.to (e.g. <code className="text-primary">https://tawk.to/chat/abc123/default</code>) or just the Property ID.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">Widget ID</label>
            <input
              type="text"
              value={widgetId}
              onChange={e => setWidgetId(e.target.value)}
              placeholder="default"
              disabled={!tawkEnabled}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Leave as <code className="text-primary">default</code> unless you have multiple widgets.
            </p>
          </div>
        </div>

        {tawkEnabled && propertyId && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-green-400/10 border border-green-400/20 text-xs text-green-400">
            <Check className="h-3.5 w-3.5 flex-shrink-0" />
            Widget will be loaded on the storefront. Save to apply.
          </div>
        )}
        {tawkEnabled && !propertyId && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-400/10 border border-amber-400/20 text-xs text-amber-400">
            Enter a Property ID to activate the widget.
          </div>
        )}
      </div>

      {/* Placeholder */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] border-dashed opacity-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center">
            <Settings className="h-5 w-5 text-[var(--text-muted)]" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-sm text-[var(--text-muted)]">More integrations coming soon</h2>
            <p className="text-xs text-[var(--text-muted)]">Payment providers, analytics, Discord bots and more.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
