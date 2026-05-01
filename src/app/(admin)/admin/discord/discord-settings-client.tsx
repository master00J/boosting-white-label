"use client";

import { useState } from "react";
import { Save, Loader2, Check, AlertCircle, Hash, Users, Shield, ExternalLink, Eye, EyeOff, Bot, Key } from "lucide-react";

type Settings = Record<string, string>;

const CHANNEL_FIELDS = [
  { key: "discord_channel_new_orders", label: "New orders", desc: "Admin channel — pinged when a new order is placed", icon: Hash },
  { key: "discord_channel_completed_orders", label: "Completed orders", desc: "Channel for completed order notifications", icon: Hash },
  { key: "discord_channel_worker_notifications", label: "Worker notifications", desc: "Channel where available orders are posted with a Claim button", icon: Hash },
  { key: "discord_channel_admin_alerts", label: "Admin alerts", desc: "Channel for internal admin notifications (claimed, assigned, etc.)", icon: Hash },
  { key: "discord_channel_reviews", label: "Reviews", desc: "Channel where new customer reviews are posted as embeds", icon: Hash },
  { key: "discord_category_tickets", label: "Tickets category ID", desc: "Category under which private order ticket channels are created (one per order)", icon: Hash },
];

const ROLE_FIELDS = [
  { key: "discord_role_customer", label: "Customer role ID", desc: "Automatically assigned on joining", icon: Users },
  { key: "discord_role_worker", label: "Worker role ID", desc: "Assigned to active boosters", icon: Users },
  { key: "discord_role_admin", label: "Admin role ID", desc: "For admins with bot access", icon: Shield },
];

// Sensitive keys: server sends "__SET__" if a value exists, never the actual value
const SENSITIVE_KEYS = ["discord_bot_token"];

export default function DiscordSettingsClient({ initialSettings }: { initialSettings: Settings }) {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showToken, setShowToken] = useState(false);

  const tokenIsSet = initialSettings["discord_bot_token"] === "__SET__";
  const tokenChanged = settings["discord_bot_token"] !== "__SET__" && settings["discord_bot_token"] !== "";

  const update = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      // Strip sensitive keys that haven't changed (still "__SET__") — don't overwrite with placeholder
      const filtered = Object.fromEntries(
        Object.entries(settings).filter(([key, value]) => {
          if (SENSITIVE_KEYS.includes(key) && value === "__SET__") return false;
          return true;
        })
      );

      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: filtered }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Save failed");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Admin</p>
          <h1 className="font-heading text-2xl font-semibold">Discord Integration</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Configure the Discord bot credentials, channels and roles.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved!" : "Save"}
        </button>
      </div>

      {/* Public invite — storefront /contact + header */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-3">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-[#5865F2]" />
          <h2 className="font-heading font-semibold text-sm">Public Discord invite URL</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Permanent invite link (<code className="bg-[var(--bg-elevated)] px-1 rounded">https://discord.gg/…</code>) shown on the{" "}
          <strong className="text-[var(--text-secondary)]">Contact</strong> page and wherever the storefront links to your community server.
          This is separate from <strong className="text-[var(--text-secondary)]">Guild ID</strong>, which is only for the bot.
        </p>
        <input
          type="url"
          value={settings["discord_invite_url"] ?? ""}
          onChange={(e) => update("discord_invite_url", e.target.value)}
          placeholder="https://discord.gg/your-invite"
          className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors"
        />
      </div>

      {/* Setup guide */}
      <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
        <h2 className="text-sm font-semibold mb-2">Setup instructions</h2>
        <ol className="space-y-1.5 text-xs text-[var(--text-muted)] list-decimal list-inside">
          <li>Create a Discord bot at <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">discord.com/developers <ExternalLink className="h-2.5 w-2.5" /></a></li>
          <li>Add the bot to your server with <code className="bg-[var(--bg-card)] px-1 rounded">bot</code> + <code className="bg-[var(--bg-card)] px-1 rounded">applications.commands</code> scopes and <strong>Administrator</strong> permission</li>
          <li>Copy the <strong>Bot Token</strong> and <strong>Application ID</strong> from the developer portal and paste them below</li>
          <li>Enable <strong>Developer Mode</strong> in Discord settings to copy Channel/Role/Category IDs</li>
          <li>Create a <strong>category</strong> for order tickets (e.g. &ldquo;Order Tickets&rdquo;) and paste its ID below</li>
          <li>Start the bot on your Pterodactyl server — it reads all settings from this dashboard</li>
          <li>Run <code className="bg-[var(--bg-card)] px-1 rounded">node dist/deploy-commands.js</code> once in the Pterodactyl console to register slash commands</li>
        </ol>
        <div className="mt-3 p-2.5 rounded-lg bg-amber-400/10 border border-amber-400/20 text-xs text-amber-400">
          <strong>Ticket channels:</strong> A private Discord channel is automatically created per order when the customer has linked their Discord account. RuneLite screenshots and progress updates are forwarded there in real-time.
        </div>
      </div>

      {/* Bot credentials */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <h2 className="font-heading font-semibold text-sm">Bot credentials</h2>
        </div>

        {/* Bot Token */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
            <Key className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            Bot Token
            {tokenIsSet && !tokenChanged && (
              <span className="ml-1 text-xs font-normal text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded-full">Configured</span>
            )}
          </label>
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              value={settings["discord_bot_token"] === "__SET__" ? "" : (settings["discord_bot_token"] ?? "")}
              onChange={(e) => update("discord_bot_token", e.target.value)}
              placeholder={tokenIsSet && !tokenChanged ? "Leave empty to keep current token" : "MTxxxxxxxxxxxxxxxxxxxxxxxx.Xxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
              className="w-full px-4 py-2.5 pr-10 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Found in Discord Developer Portal → Your App → Bot → Token.
            {" "}<span className="text-amber-400">The token is never shown after saving for security.</span>
          </p>
        </div>

        {/* Client ID */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
            <Key className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            Application ID (Client ID)
          </label>
          <input
            type="text"
            value={settings["discord_client_id"] ?? ""}
            onChange={(e) => update("discord_client_id", e.target.value)}
            placeholder="123456789012345678"
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">Found in Discord Developer Portal → Your App → General Information → Application ID.</p>
        </div>

        {/* Guild ID */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
            <Hash className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            Guild ID (Server ID)
          </label>
          <input
            type="text"
            value={settings["discord_guild_id"] ?? ""}
            onChange={(e) => update("discord_guild_id", e.target.value)}
            placeholder="123456789012345678"
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors"
          />
          <p className="text-xs text-[var(--text-muted)] mt-1">Right-click your server icon → Copy Server ID (Developer Mode required).</p>
        </div>
      </div>

      {/* Channels */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <h2 className="font-heading font-semibold text-sm">Channels</h2>
        {CHANNEL_FIELDS.map((field) => (
          <div key={field.key}>
            <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
              <field.icon className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              {field.label}
            </label>
            <input
              type="text"
              value={settings[field.key] ?? ""}
              onChange={(e) => update(field.key, e.target.value)}
              placeholder="123456789012345678"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">{field.desc}</p>
          </div>
        ))}
      </div>

      {/* Roles */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <h2 className="font-heading font-semibold text-sm">Roles</h2>
        {ROLE_FIELDS.map((field) => (
          <div key={field.key}>
            <label className="flex items-center gap-1.5 text-sm font-medium mb-1.5">
              <field.icon className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              {field.label}
            </label>
            <input
              type="text"
              value={settings[field.key] ?? ""}
              onChange={(e) => update(field.key, e.target.value)}
              placeholder="123456789012345678"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm font-mono placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors"
            />
            <p className="text-xs text-[var(--text-muted)] mt-1">{field.desc}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Available commands */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
        <h2 className="font-heading font-semibold text-sm mb-3">Available slash commands</h2>
        <div className="space-y-2">
          {[
            { cmd: "/claim <ordernumber>", desc: "Claim an available order to boost", role: "Worker" },
            { cmd: "/unclaim <ordernumber>", desc: "Return a claimed order to the queue", role: "Worker" },
            { cmd: "/progress <ordernumber> <percentage> [note]", desc: "Update the progress of an order", role: "Worker" },
            { cmd: "/complete <ordernumber>", desc: "Mark an order as completed", role: "Worker" },
            { cmd: "/status <ordernumber>", desc: "View the current status of an order", role: "Everyone" },
            { cmd: "/stats", desc: "View your personal booster statistics", role: "Worker" },
            { cmd: "/leaderboard", desc: "Top 10 boosters by completed orders", role: "Everyone" },
            { cmd: "/payout", desc: "Request a payout or view your balance", role: "Worker" },
            { cmd: "/lookup <ordernumber>", desc: "Look up full order details", role: "Admin" },
            { cmd: "/assign <ordernumber> <booster>", desc: "Manually assign an order to a booster", role: "Admin" },
          ].map((item) => (
            <div key={item.cmd} className="flex items-start gap-3 py-1.5 border-b border-[var(--border-default)] last:border-0">
              <code className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded font-mono flex-shrink-0">{item.cmd}</code>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text-secondary)]">{item.desc}</p>
              </div>
              <span className="text-xs text-[var(--text-muted)] flex-shrink-0">{item.role}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
