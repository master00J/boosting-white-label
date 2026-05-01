"use client";

import { useState, useRef } from "react";
import { User, DollarSign, Save, Loader2, Check, AlertCircle, Shield, Banknote, Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

type WorkerProfile = {
  display_name: string | null;
  avatar_url: string | null;
  email: string;
};

type WorkerData = {
  id: string;
  payout_method: string | null;
  payout_details_encrypted: string | null;
  payout_minimum: number;
  commission_rate: number;
  bio: string | null;
  show_on_boosters_page: boolean;
  deposit_paid: number | null;
  profile_photo_url: string | null;
};

type Tab = "profile" | "payout" | "security";

const PAYOUT_METHODS = [
  { value: "paypal", label: "PayPal" },
  { value: "bank", label: "Bank transfer" },
  { value: "crypto", label: "Crypto (USDT/BTC)" },
];

export default function WorkerSettingsClient({
  profile,
  worker,
  _userId,
}: {
  profile: WorkerProfile | null;
  worker: WorkerData | null;
  _userId: string;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [bio, setBio] = useState(worker?.bio ?? "");
  const [showOnBoostersPage, setShowOnBoostersPage] = useState(worker?.show_on_boosters_page ?? true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [boosterProfileSaving, setBoosterProfileSaving] = useState(false);
  const [boosterProfileSaved, setBoosterProfileSaved] = useState(false);
  const [boosterProfileError, setBoosterProfileError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [payoutMethod, setPayoutMethod] = useState(worker?.payout_method ?? "");
  const [payoutDetails, setPayoutDetails] = useState("");
  const hasPayoutDetails = !!worker?.payout_details_encrypted;
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [payoutSaved, setPayoutSaved] = useState(false);
  const [payoutError, setPayoutError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const supabase = createClient();

  const saveProfile = async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/worker/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "profile", display_name: displayName.trim() || undefined }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Save failed."); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const saveBoosterProfile = async () => {
    setBoosterProfileSaving(true);
    setBoosterProfileError("");
    setBoosterProfileSaved(false);
    try {
      const res = await fetch("/api/worker/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "booster_profile",
          bio: bio.trim() || undefined,
          show_on_boosters_page: showOnBoostersPage,
        }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setBoosterProfileError(d.error ?? "Save failed."); return; }
      setBoosterProfileSaved(true);
      setTimeout(() => setBoosterProfileSaved(false), 3000);
    } finally {
      setBoosterProfileSaving(false);
    }
  };

  const uploadProfilePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!worker || !e.target.files?.length) return;
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) { setPhotoError("Please select an image (PNG, JPG, WebP)."); return; }
    if (file.size > 2 * 1024 * 1024) { setPhotoError("Image must be under 2 MB."); return; }
    setPhotoUploading(true);
    setPhotoError("");
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${worker.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("booster-photos").upload(path, file, { upsert: true });
      if (uploadErr) { setPhotoError(uploadErr.message); return; }
      const { data: urlData } = supabase.storage.from("booster-photos").getPublicUrl(path);
      const res = await fetch("/api/worker/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "booster_profile", profile_photo_url: urlData.publicUrl }),
      });
      if (!res.ok) { setPhotoError("Failed to save profile photo."); return; }
      window.location.reload();
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  };

  const savePayout = async () => {
    if (!payoutMethod) { setPayoutError("Please choose a payout method."); return; }
    setPayoutSaving(true);
    setPayoutError("");
    setPayoutSaved(false);
    try {
      const res = await fetch("/api/worker/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "payout", payout_method: payoutMethod, payout_details: payoutDetails.trim() || undefined }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setPayoutError(d.error ?? "Save failed."); return; }
      setPayoutSaved(true);
      setTimeout(() => setPayoutSaved(false), 3000);
    } finally {
      setPayoutSaving(false);
    }
  };

  const changePassword = async () => {
    setPasswordError("");
    if (newPassword.length < 8) { setPasswordError("Minimum 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match."); return; }
    setPasswordSaving(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPassword });
      if (err) { setPasswordError(err.message); return; }
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
    { key: "payout", label: "Payout", icon: DollarSign },
    { key: "security", label: "Security", icon: Shield },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Booster</p>
        <h1 className="font-heading text-2xl font-semibold">Settings</h1>
      </div>

      {/* Info card */}
      {worker && (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]">
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Commission</p>
              <p className="font-bold text-primary">{(worker.commission_rate * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Min. payout</p>
              <p className="font-bold">${worker.payout_minimum.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Deposit paid</p>
              <p className="font-bold flex items-center gap-1">
                <Banknote className="h-3.5 w-3.5" />
                \${(worker.deposit_paid ?? 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

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
            {worker && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Public bio (boosters page)</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Short intro for customers (optional)"
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors resize-none"
                  />
                  <p className="text-xs text-[var(--text-muted)] mt-1">{bio.length}/500</p>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnBoostersPage}
                    onChange={(e) => setShowOnBoostersPage(e.target.checked)}
                    className="rounded border-[var(--border-default)] accent-primary"
                  />
                  <span className="text-sm">Show my profile on the public &quot;Meet our boosters&quot; page</span>
                </label>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Profile photo (boosters page)</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)] overflow-hidden flex items-center justify-center flex-shrink-0">
                      {(worker.profile_photo_url || profile?.avatar_url) ? (
                        <Image
                          src={worker.profile_photo_url || profile?.avatar_url || ""}
                          alt="Profile"
                          width={80}
                          height={80}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <Camera className="h-8 w-8 text-[var(--text-muted)]" />
                      )}
                    </div>
                    <div>
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={uploadProfilePhoto}
                      />
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={photoUploading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-default)] text-sm font-medium hover:bg-white/[0.03] disabled:opacity-50"
                      >
                        {photoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                        {photoUploading ? "Uploading…" : "Upload photo"}
                      </button>
                      <p className="text-xs text-[var(--text-muted)] mt-1">PNG, JPG or WebP, max 2 MB</p>
                      {photoError && <p className="text-xs text-red-400 mt-1">{photoError}</p>}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? "Saved!" : "Save profile"}
            </button>
            {worker && (
              <>
                {boosterProfileError && (
                  <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {boosterProfileError}
                  </div>
                )}
                <button
                  onClick={saveBoosterProfile}
                  disabled={boosterProfileSaving}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--border-default)] text-[var(--text-primary)] text-sm font-medium hover:bg-white/[0.03] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {boosterProfileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : boosterProfileSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {boosterProfileSaved ? "Saved!" : "Save public profile"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Payout tab */}
      {activeTab === "payout" && (
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-5">
          <h2 className="font-heading font-semibold">Payout method</h2>
          <div className="space-y-3">
            {PAYOUT_METHODS.map((method) => (
              <label
                key={method.value}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  payoutMethod === method.value
                    ? "border-primary bg-primary/10"
                    : "border-[var(--border-default)] hover:border-primary/30"
                }`}
              >
                <input
                  type="radio"
                  name="payout_method"
                  value={method.value}
                  checked={payoutMethod === method.value}
                  onChange={() => setPayoutMethod(method.value)}
                  className="accent-primary"
                />
                <span className="text-sm font-medium">{method.label}</span>
              </label>
            ))}
          </div>
          {payoutMethod && (
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {payoutMethod === "paypal" ? "PayPal email address" : payoutMethod === "bank" ? "IBAN account number" : "Wallet address"}
              </label>
              {hasPayoutDetails && (
                <div className="flex items-center gap-2 mb-2 text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-lg px-3 py-2">
                  <Check className="h-3.5 w-3.5 flex-shrink-0" />
                  Payout details are configured. Leave blank to keep existing details.
                </div>
              )}
              <input
                type="text"
                value={payoutDetails}
                onChange={(e) => setPayoutDetails(e.target.value)}
                placeholder={hasPayoutDetails ? "Enter new details to update…" : payoutMethod === "paypal" ? "name@email.com" : payoutMethod === "bank" ? "BE00 0000 0000 0000" : "0x..."}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          )}
          {payoutError && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {payoutError}
            </div>
          )}
          <button
            onClick={savePayout}
            disabled={payoutSaving || !payoutMethod}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {payoutSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : payoutSaved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {payoutSaved ? "Saved!" : "Save"}
          </button>
        </div>
      )}

      {/* Security tab */}
      {activeTab === "security" && (
        <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-5">
          <h2 className="font-heading font-semibold">Change password</h2>
          <div className="space-y-3">
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
                <label className="block text-sm font-medium mb-1.5">Confirm password</label>
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
      )}
    </div>
  );
}
