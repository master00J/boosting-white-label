"use client";

import { useState } from "react";
import { Link2, TrendingUp, DollarSign, Users, CheckCircle, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function BecomeAffiliatePage() {
  const [form, setForm] = useState({ company_name: "", website_url: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/affiliate/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = await res.json() as { error?: string };
        setError(j.error ?? "Something went wrong.");
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
            <Link2 className="h-3.5 w-3.5" /> Affiliate Program
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold">
            Earn money by referring players
          </h1>
          <p className="text-[var(--text-muted)] text-lg max-w-xl mx-auto">
            Join our affiliate program and earn a commission for every customer you refer. Share your unique link and get paid automatically.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-4xl mx-auto px-4 pb-16 grid sm:grid-cols-3 gap-6">
        {[
          {
            icon: DollarSign,
            title: "Competitive commissions",
            desc: "Earn a percentage of every order placed through your referral link.",
            color: "text-green-400",
          },
          {
            icon: TrendingUp,
            title: "Real-time dashboard",
            desc: "Track your clicks, conversions and earnings in your account dashboard.",
            color: "text-primary",
          },
          {
            icon: Users,
            title: "30-day cookie",
            desc: "Visitors referred by you are tracked for 30 days — even if they don't order immediately.",
            color: "text-orange-400",
          },
        ].map((b) => (
          <div key={b.title} className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-3">
            <b.icon className={`h-6 w-6 ${b.color}`} />
            <h3 className="font-heading font-semibold">{b.title}</h3>
            <p className="text-sm text-[var(--text-muted)]">{b.desc}</p>
          </div>
        ))}
      </section>

      {/* Application form */}
      <section className="max-w-lg mx-auto px-4 pb-24">
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] p-8">
          {success ? (
            <div className="text-center space-y-4 py-6">
              <CheckCircle className="h-12 w-12 text-green-400 mx-auto" />
              <h2 className="font-heading text-xl font-semibold">Application submitted!</h2>
              <p className="text-sm text-[var(--text-muted)]">
                We will review your application and get back to you within 1–3 business days.
              </p>
              <Link href="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                Back to home <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-5">
              <div>
                <h2 className="font-heading text-xl font-semibold mb-1">Apply to become an affiliate</h2>
                <p className="text-sm text-[var(--text-muted)]">Fill in the form below and we will review your application.</p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">Company / Channel name</label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                  placeholder="Your brand or channel name"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">Website / Social media URL</label>
                <input
                  type="url"
                  value={form.website_url}
                  onChange={(e) => setForm((p) => ({ ...p, website_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">
                  Why do you want to join? <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={form.reason}
                  onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Tell us about your audience and how you plan to promote us..."
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm resize-none focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Submit application
              </button>

              <p className="text-xs text-center text-[var(--text-muted)]">
                Already applied?{" "}
                <Link href="/dashboard" className="text-primary hover:underline">
                  Check your dashboard
                </Link>
              </p>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
