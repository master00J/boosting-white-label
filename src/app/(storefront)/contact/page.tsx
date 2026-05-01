import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://boosting-self.vercel.app";

export const metadata: Metadata = {
  title: { absolute: "Contact | BoostPlatform" },
  description:
    "Got questions or want to start your order? Reach BoostPlatform via Discord or email — our team is available 24/7.",
  openGraph: {
    title: "Contact | BoostPlatform",
    description: "24/7 support via Discord and email. We aim to respond within minutes.",
    url: `${appUrl}/contact`,
    type: "website",
  },
  alternates: { canonical: `${appUrl}/contact` },
};

export const dynamic = "force-dynamic";

// ─── Icons ────────────────────────────────────────────────────────────────────

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function EnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

async function loadContactSettings(): Promise<{ discordInviteUrl: string; supportEmail: string }> {
  let discordInviteUrl =
    (typeof process.env.NEXT_PUBLIC_DISCORD_INVITE_URL === "string"
      ? process.env.NEXT_PUBLIC_DISCORD_INVITE_URL
      : "") || "";
  let supportEmail = "support@example.com";

  try {
    const admin = createAdminClient();
    const { data: rows } = await admin
      .from("site_settings")
      .select("key, value")
      .in("key", ["discord_invite_url", "general"]);

    const inviteRow = rows?.find((r) => r.key === "discord_invite_url");
    const fromDb =
      typeof inviteRow?.value === "string" ? inviteRow.value.trim() : "";
    if (fromDb) discordInviteUrl = fromDb;

    const generalRow = rows?.find((r) => r.key === "general");
    const gv = generalRow?.value;
    if (gv && typeof gv === "object" && gv !== null && "support_email" in gv) {
      const em = String((gv as { support_email?: string }).support_email ?? "").trim();
      if (em) supportEmail = em;
    }
  } catch {
    /* env fallback */
  }

  discordInviteUrl = discordInviteUrl.trim();
  const validDiscord =
    discordInviteUrl && /^https?:\/\//i.test(discordInviteUrl) ? discordInviteUrl : "";

  return { discordInviteUrl: validDiscord, supportEmail };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ContactPage() {
  const { discordInviteUrl, supportEmail } = await loadContactSettings();

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">

      {/* ── Hero ── */}
      <div className="relative border-b border-[#E8720C]/15 overflow-hidden">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[260px] opacity-[0.07] pointer-events-none"
          style={{ background: "radial-gradient(ellipse, #E8720C 0%, transparent 70%)" }}
        />

        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-16 sm:pt-28 sm:pb-24 text-center">
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[#FF9438] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to home
            </Link>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E8720C]/25 bg-[#E8720C]/[0.06] text-xs text-[#FF9438]/90 font-medium tracking-wider uppercase mb-6">
            Get in touch
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)]">Contact us</h1>
          <p className="mt-5 text-[var(--text-secondary)] text-lg leading-relaxed max-w-xl mx-auto">
            Got questions or want to start your order? We&apos;re here to help fast — whether
            you need service details, a custom request, or just want to talk directly.
          </p>

          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#E8720C]/25 bg-[#E8720C]/[0.06] text-sm text-[#FF9438]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9438] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E8720C]" />
            </span>
            Support team active — we aim to respond within minutes
          </div>
        </div>
      </div>

      {/* ── Contact cards ── */}
      <div className="max-w-2xl mx-auto px-6 py-16 sm:py-20 space-y-10">

        <div className="grid sm:grid-cols-2 gap-4">

          {/* Discord */}
          <div className="rounded-2xl border border-[#5865F2]/25 bg-[#5865F2]/[0.05] p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5865F2]/15 border border-[#5865F2]/25 flex items-center justify-center">
                <DiscordIcon className="w-5 h-5 text-[#7289da]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Discord</p>
                <p className="text-xs text-[var(--text-muted)]">Live support & order updates</p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-1">
              Join our server for live support, real-time order updates, and direct communication with our team.
            </p>
            {discordInviteUrl ? (
              <a
                href={discordInviteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white text-sm font-semibold transition-colors"
              >
                <DiscordIcon className="w-4 h-4" />
                Join Discord server
              </a>
            ) : (
              <div className="rounded-xl border border-[#5865F2]/20 bg-[#5865F2]/[0.08] px-3 py-3 text-center space-y-2">
                <p className="text-xs text-[var(--text-secondary)]">
                  No invite link yet. Add your public server URL under{" "}
                  <strong className="text-[var(--text-primary)]">Admin → Discord → Public invite URL</strong>,
                  or set <code className="text-[10px] px-1 rounded bg-black/30 font-mono">NEXT_PUBLIC_DISCORD_INVITE_URL</code>{" "}
                  on Vercel.
                </p>
                <Link
                  href="/admin/discord"
                  className="inline-flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-[#5865F2]/80 hover:bg-[#5865F2] text-white text-xs font-semibold transition-colors"
                >
                  Open Discord settings
                </Link>
              </div>
            )}
          </div>

          {/* Email */}
          <div className="rounded-2xl border border-[#E8720C]/15 bg-[#E8720C]/[0.03] p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E8720C]/[0.08] border border-[#E8720C]/20 flex items-center justify-center">
                <EnvelopeIcon className="w-5 h-5 text-[#FF9438]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Email</p>
                <p className="text-xs text-[var(--text-muted)]">Inquiries & confirmations</p>
              </div>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed flex-1">
              For general inquiries or payment confirmations. We&apos;ll get back to you as soon as possible.
            </p>
            <a
              href={`mailto:${supportEmail}`}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-[#E8720C]/30 text-sm font-semibold text-[#FF9438] hover:bg-[#E8720C]/[0.08] hover:border-[#E8720C]/50 transition-colors"
            >
              <EnvelopeIcon className="w-4 h-4" />
              {supportEmail}
            </a>
          </div>
        </div>

        {/* Availability info */}
        <div className="rounded-xl border border-[#E8720C]/12 bg-[#E8720C]/[0.03] px-5 py-4 flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            <svg className="w-4 h-4 text-[#E8720C]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-[var(--text-primary)]">Availability: 24 / 7</p>
            <p className="text-sm text-[var(--text-secondary)]">
              Our support team is active around the clock, ensuring quick replies and smooth communication.
              We aim to respond <span className="text-[var(--text-primary)] font-medium">within minutes</span>,
              because your time matters as much as your trust.
            </p>
          </div>
        </div>

        {/* Quick links */}
        <div className="pt-2 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Quick links</p>
          <div className="flex flex-wrap gap-2">
            {[
              { href: "/games", label: "Browse services" },
              { href: "/how-it-works", label: "How does it work?" },
              { href: "/about", label: "About us" },
              { href: "/tos", label: "Terms of Service" },
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center px-3 py-1.5 rounded-lg border border-[#E8720C]/15 bg-[#E8720C]/[0.03] text-sm text-[var(--text-secondary)] hover:text-[#FF9438] hover:border-[#E8720C]/35 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <p className="text-center text-sm text-[var(--text-muted)] pt-4">
          Play smarter. Boost safer.{" "}
          <span className="text-[var(--text-secondary)]">Contact BoostPlatform today.</span>
        </p>

        <div className="pt-6 border-t border-[#E8720C]/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <p>BoostPlatform is not affiliated with Jagex Ltd., RuneScape® or Old School RuneScape®.</p>
          <div className="flex items-center gap-4">
            <Link href="/tos" className="hover:text-[var(--text-secondary)] transition-colors">Terms</Link>
            <Link href="/how-it-works" className="hover:text-[var(--text-secondary)] transition-colors">How it works</Link>
            <Link href="/" className="hover:text-[var(--text-secondary)] transition-colors">Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
