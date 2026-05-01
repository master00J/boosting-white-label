"use client";

import { useState } from "react";
import { User, Shield, Bell, Save, Loader2, Check, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ProfileData = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  discord_id: string | null;
  discord_username: string | null;
  two_factor_enabled: boolean;
};

type Tab = "profile" | "security" | "notifications";

export default function SettingsClient({ profile }: { profile: ProfileData | null }) {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);

  const supabase = createClient();

  const saveProfile = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const { error: err } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() || null } as never)
        .eq("id", profile?.id ?? "");
      if (err) { setError("Save failed. Please try again."); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setPasswordError("");
    setPasswordSaved(false);
    if (newPassword.length < 8) { setPasswordError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match."); return; }
    setPasswordSaving(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPassword });
      if (err) { setPasswordError(err.message); return; }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 3000);
    } finally {
      setPasswordSaving(false);
    }
  };

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "profile", label: "Profile", icon: User },
    { key: "security", label: "Security", icon: Shield },
    { key: "notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">My account</p>
        <h1 className="font-heading text-2xl font-semibold">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-white"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === "profile" && (
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-5">
          <h2 className="font-heading font-semibold">Profile details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email address</label>
              <input
                type="email"
                value={profile?.email ?? ""}
                disabled
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm text-[var(--text-muted)] cursor-not-allowed"
              />
              <p className="text-xs text-[var(--text-muted)] mt-1">Email address cannot be changed.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {profile?.discord_username && (
              <div>
                <label className="block text-sm font-medium mb-1.5">Discord</label>
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                  <div className="w-4 h-4 rounded-sm bg-[#5865F2] flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-[8px] font-bold">D</span>
                  </div>
                  <span className="text-sm">{profile.discord_username}</span>
                  <span className="ml-auto text-xs text-green-400 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Connected
                  </span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            onClick={saveProfile}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
      )}

      {/* Security tab */}
      {activeTab === "security" && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-5">
            <h2 className="font-heading font-semibold">Change password</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            {passwordError && (
              <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {passwordError}
              </div>
            )}

            <button
              onClick={changePassword}
              disabled={passwordSaving || !newPassword}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {passwordSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : passwordSaved ? <Check className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
              {passwordSaved ? "Changed!" : "Change password"}
            </button>
          </div>

          {/* 2FA */}
          <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading font-semibold text-sm">Two-factor authentication</h2>
                <p className="text-xs text-[var(--text-muted)] mt-1">Secure your account with an extra verification step.</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full border ${profile?.two_factor_enabled ? "text-green-400 bg-green-400/10 border-green-400/20" : "text-[var(--text-muted)] bg-[var(--bg-elevated)] border-[var(--border-default)]"}`}>
                {profile?.two_factor_enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-3 bg-[var(--bg-elevated)] rounded-lg px-3 py-2">
              2FA configuration is available via the security settings after the full launch.
            </p>
          </div>
        </div>
      )}

      {/* Notifications tab */}
      {activeTab === "notifications" && (
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-5">
          <h2 className="font-heading font-semibold">Notification preferences</h2>
          <div className="space-y-3">
            {[
              { label: "Order updates", desc: "When your order changes status", enabled: true },
              { label: "Chat messages", desc: "New messages from your booster", enabled: true },
              { label: "Promotions", desc: "Discounts and special offers", enabled: false },
              { label: "Discord notifications", desc: "Receive notifications via Discord DM", enabled: false },
            ].map((pref) => (
              <div key={pref.label} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{pref.label}</p>
                  <p className="text-xs text-[var(--text-muted)]">{pref.desc}</p>
                </div>
                <button
                  className={`relative w-10 h-5 rounded-full transition-colors ${pref.enabled ? "bg-primary" : "bg-[var(--bg-elevated)]"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${pref.enabled ? "left-5" : "left-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] rounded-lg px-3 py-2">
            Full notification settings will be available after Discord integration.
          </p>
        </div>
      )}
    </div>
  );
}
