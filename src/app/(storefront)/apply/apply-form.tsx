"use client";

import { useState } from "react";
import {
  Sword, CheckCircle, Loader2, ArrowRight, Shield, Coins,
  Clock, Star, ChevronRight, AlertCircle,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface Game {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

const PERKS = [
  {
    icon: Coins,
    title: "Competitive pay",
    desc: "Earn a fair commission on every completed order, paid out directly to you.",
    color: "text-green-400",
  },
  {
    icon: Clock,
    title: "Flexible hours",
    desc: "Work whenever it suits you — no fixed schedules or minimum hours.",
    color: "text-primary",
  },
  {
    icon: Shield,
    title: "Secure platform",
    desc: "Our platform handles payments, disputes and customer support for you.",
    color: "text-blue-400",
  },
  {
    icon: Star,
    title: "Rank up & earn more",
    desc: "Grow your tier with great reviews and unlock higher commission rates.",
    color: "text-orange-400",
  },
];

export default function ApplyForm({ games, defaultDiscordUsername }: { games: Game[]; defaultDiscordUsername?: string | null }) {
  const [form, setForm] = useState({
    discord_username: defaultDiscordUsername ?? "",
    rsn: "",
    motivation: "",
  });
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const toggleGame = (slug: string) => {
    setSelectedGames((prev) =>
      prev.includes(slug) ? prev.filter((g) => g !== slug) : [...prev, slug]
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGames.length) {
      setError("Please select at least one game.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discord_username: form.discord_username,
          rsn: form.rsn,
          games: selectedGames,
          motivation: form.motivation,
        }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }
      setSuccess(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
            <Sword className="h-3.5 w-3.5" /> Booster Program
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold">
            Get paid to play
          </h1>
          <p className="text-[var(--text-muted)] text-lg max-w-xl mx-auto">
            Turn your game skills into real income. Apply to join our team of verified boosters and start earning today.
          </p>
          <a
            href="#apply"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
          >
            Apply now <ChevronRight className="h-4 w-4" />
          </a>
        </div>
      </section>

      {/* Perks */}
      <section className="max-w-4xl mx-auto px-4 pb-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PERKS.map((p) => (
          <div key={p.title} className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-3">
            <p.icon className={`h-6 w-6 ${p.color}`} />
            <h3 className="font-heading font-semibold text-sm">{p.title}</h3>
            <p className="text-xs text-[var(--text-muted)]">{p.desc}</p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="font-heading text-2xl font-semibold text-center mb-8">How it works</h2>
        <div className="relative flex flex-col sm:flex-row gap-4">
          {[
            { step: "1", title: "Submit application", desc: "Fill in the form below with your details and experience." },
            { step: "2", title: "Review", desc: "We review your application within 1–3 business days." },
            { step: "3", title: "Start boosting", desc: "Get access to the booster dashboard and claim your first order." },
          ].map((s, i) => (
            <div key={s.step} className="flex-1 flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                {s.step}
              </div>
              <div>
                <p className="font-semibold text-sm">{s.title}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{s.desc}</p>
              </div>
              {i < 2 && <ArrowRight className="h-4 w-4 text-[var(--text-muted)] hidden sm:block mt-2 shrink-0" />}
            </div>
          ))}
        </div>
      </section>

      {/* Application form */}
      <section id="apply" className="max-w-lg mx-auto px-4 pb-24">
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] p-8">
          {success ? (
            <div className="text-center space-y-4 py-6">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto" />
              <h2 className="font-heading text-xl font-semibold">Application submitted!</h2>
              <p className="text-sm text-[var(--text-muted)]">
                We will review your application and get back to you via Discord within 1–3 business days.
              </p>
              <Link href="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                Back to home <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div>
                <h2 className="font-heading text-xl font-semibold mb-1">Apply to become a booster</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  You need to be{" "}
                  <Link href="/auth/sign-up" className="text-primary hover:underline">
                    logged in
                  </Link>{" "}
                  to submit an application.
                </p>
              </div>

              {/* Discord */}
              <div>
                <label className="block text-xs font-medium mb-1.5">
                  Discord username <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.discord_username}
                  onChange={(e) => setForm((p) => ({ ...p, discord_username: e.target.value }))}
                  placeholder="e.g. username#0000 or username"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              {/* Games — dynamisch geladen */}
              <div>
                <label className="block text-xs font-medium mb-1.5">
                  Games you want to boost <span className="text-red-400">*</span>
                </label>
                {games.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">No games available yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {games.map((g) => {
                      const selected = selectedGames.includes(g.slug);
                      return (
                        <button
                          key={g.slug}
                          type="button"
                          onClick={() => toggleGame(g.slug)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-[var(--border-default)] hover:border-primary/40 text-[var(--text-secondary)]"
                          }`}
                        >
                          {g.logo_url ? (
                            <Image
                              src={g.logo_url}
                              alt={g.name}
                              width={20}
                              height={20}
                              className="rounded object-cover shrink-0"
                              unoptimized
                            />
                          ) : (
                            <span className="text-base shrink-0">🎮</span>
                          )}
                          <span className="font-medium text-xs truncate">{g.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* RSN (optional) */}
              <div>
                <label className="block text-xs font-medium mb-1.5">
                  RSN / In-game name{" "}
                  <span className="text-[var(--text-muted)] font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.rsn}
                  onChange={(e) => setForm((p) => ({ ...p, rsn: e.target.value }))}
                  placeholder="Your in-game username"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              {/* Motivation */}
              <div>
                <label className="block text-xs font-medium mb-1.5">
                  Why do you want to become a booster? <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={form.motivation}
                  onChange={(e) => setForm((p) => ({ ...p, motivation: e.target.value }))}
                  placeholder="Tell us about your experience, stats, and why you'd be a great booster..."
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm resize-none focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sword className="h-4 w-4" />}
                Submit application
              </button>

              <p className="text-xs text-center text-[var(--text-muted)]">
                Already a booster?{" "}
                <Link href="/booster" className="text-primary hover:underline">
                  Go to your dashboard
                </Link>
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
