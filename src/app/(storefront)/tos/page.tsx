import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://boosting-self.vercel.app";

export const metadata: Metadata = {
  title: "Terms of Service | BoostPlatform",
  description:
    "Terms of Service for BoostPlatform — read our terms and conditions before using our services.",
  openGraph: {
    title: "Terms of Service | BoostPlatform",
    description: "Terms and conditions for BoostPlatform services.",
    url: `${appUrl}/tos`,
    type: "website",
  },
  alternates: { canonical: `${appUrl}/tos` },
};

export const revalidate = 3600;

// ─── Default sections ─────────────────────────────────────────────────────────

const SECTIONS = [
  {
    id: "disclaimer",
    title: "Disclaimer",
    content:
      "BoostPlatform is an independent service and is **not affiliated** with RuneScape®, Old School RuneScape®, or Jagex Ltd. (or any of their subsidiaries or affiliates). All trademarks, game assets, and related intellectual property belong to their respective owners.",
  },
  {
    id: "security",
    title: "Security First",
    badge: "Important",
    content: `Your safety and privacy are our top priorities.

- We will **never DM you first** on Discord.
- All communication happens inside an official ticket or via verified staff.
- Always confirm that staff have the **Staff**, **Admin**, or **Owner** role.
- When in doubt, ping a staff member to verify identity on Discord.`,
  },
  {
    id: "rules",
    title: "Rules",
    content: `To maintain a safe and fair environment, you agree to follow:

- Discord Terms of Service and Community Guidelines.
- No illegal or dangerous activities (doxing, threats, exploits, etc.).
- No impersonation of individuals, companies, or staff.
- No unauthorized access or attempts to damage accounts, networks, or systems.
- No distribution of stolen, pirated, or hacked material (including cheats, cracks, or account dumps).

Violations are enforced by automated filters and our moderation team. Consequences may include warnings, mutes, or permanent bans.`,
  },
  {
    id: "agreement",
    title: "Agreement",
    content: `By using BoostPlatform services, you agree that:

- You enter and use our services **at your own risk**.
- You have read and agree to these Terms of Service.
- BoostPlatform provides services "as-is" without guaranteed outcomes beyond what is stated in your order or ticket.
- You release Discord and Jagex from any liability related to your use of this server or our services.`,
  },
  {
    id: "scope",
    title: "Scope & Disclaimer",
    content: `BoostPlatform is independent and not affiliated with Jagex Ltd.

Use of our services carries inherent risk, including but not limited to: temporary or permanent bans, mutes, rollbacks, disconnections, or Hardcore Ironman deaths.

We accept no liability (express or implied) for any actions taken by Jagex or third parties before, during, or after your service.`,
  },
  {
    id: "payments",
    title: "Payments",
    content: `- All payments are **100% upfront**.
- We reserve the right to refuse or refund any order if no worker is available.`,
  },
  {
    id: "account-security",
    title: "Account Security & Supplies",
    content: `- Always **change your password** before and after your service.
- Remove all wealth not needed for the order — BoostPlatform is not responsible for losses after your confirmation.
- Provide all supplies required for the job unless otherwise agreed.
- You keep all resources gained during training.`,
  },
  {
    id: "service-conditions",
    title: "Service Conditions",
    content: `- Progress screenshots will be posted in your ticket when possible.
- During service, you may only log in **with staff permission**.
- No guaranteed completion times — we aim for the fastest reasonable delivery.
- If you post credentials publicly or in a shared ticket, you assume all risk. **Always change your password immediately after service.**`,
  },
  {
    id: "conduct",
    title: "Conduct & Anti-Scam",
    content: `- Treat staff and clients respectfully.
- Harassment, discrimination, threats, or spam lead to **immediate removal** and loss of wallet balance.
- Attempts to scam, chargeback, or bypass commission = **permanent ban without refund**.`,
  },
  {
    id: "tickets",
    title: "Ticket Retention & Data",
    content:
      "Tickets (excluding login data) are stored indefinitely for quality control and dispute resolution.",
  },
  {
    id: "commission",
    title: "Commission Circumvention",
    content:
      "Any attempt to bypass the official ticket system or avoid commission fees results in **permanent ban** and forfeiture of balances.",
  },
  {
    id: "exit",
    title: "Exit-Forfeit",
    content:
      'Leaving the server or remaining inactive for more than **3 months** after a disruption ("nuke") forfeits any remaining wallet balance.',
  },
  {
    id: "refunds",
    title: "Refunds",
    content: `- **Cancel before work starts:** 80% refund.
- **Cancel after work starts:** 80% of the unused portion.
- Refunds require owner approval and are paid in the original currency used.`,
  },
  {
    id: "fees",
    title: "Fees & Price Fluctuations",
    content: `- The sender pays all transaction fees, unless agreed otherwise.
- Crypto volatility after payment is at the client's risk.
- Jagex updates may affect pricing — any surcharges are communicated before continuing work.`,
  },
  {
    id: "wallet",
    title: "Wallet & Deposit Policy",
    content: `- Wallet balances or worker deposits may be held in third-party instruments.
- In case of loss, payouts are made pro-rata.
- Any alternate arrangement requires written owner approval.`,
  },
  {
    id: "ironman",
    title: "Ironman & Hardcore Ironman Services",
    content: `- State your Ironman bank value before starting.
- We assign a worker with a matching deposit for your protection.
- Verified worker-caused GP loss is compensated up to the deposit.
- RNG-related losses cannot be reimbursed.
- **Hardcore Ironman deaths** are at your own risk and may include additional fees.`,
  },
  {
    id: "liability",
    title: "Liability Waiver",
    content: `- We are not liable for accidental XP gains (e.g., Attack on a pure).
- We are not responsible for bans, mutes, rollbacks, or item losses, except as explicitly stated.`,
  },
  {
    id: "modifications",
    title: "Modifications",
    content:
      "Terms may change at any time. Updates will be posted in announcements and apply to all new orders immediately.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function TosPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("static_pages")
    .select("title, content")
    .eq("slug", "tos")
    .eq("is_published", true)
    .maybeSingle();

  // If the admin has set custom content, render it as markdown
  if (data?.content) {
    return (
      <div className="min-h-screen py-20 px-4">
        <article className="max-w-2xl mx-auto prose prose-invert prose-headings:font-heading">
          <h1 className="font-heading text-3xl font-bold mb-8">
            {data.title ?? "Terms of Service"}
          </h1>
          <div className="prose-p:text-[var(--text-secondary)] prose-li:text-[var(--text-secondary)]">
            <ReactMarkdown>{data.content}</ReactMarkdown>
          </div>
          <p className="mt-12 text-sm text-[var(--text-muted)]">
            <Link href="/" className="hover:text-[var(--text-primary)] transition-colors">
              ← Back to home
            </Link>
          </p>
        </article>
      </div>
    );
  }

  // Default: render the styled hardcoded ToS
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-white/[0.02]">
        <div className="max-w-3xl mx-auto px-6 py-14 sm:py-20">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors mb-8"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>

          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
                Legal
              </p>
              <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] leading-tight">
                Terms of Service
              </h1>
              <p className="mt-3 text-[var(--text-secondary)] text-base leading-relaxed max-w-xl">
                Please read these terms carefully before using BoostPlatform services. By
                opening a ticket or placing an order you agree to all terms below.
              </p>
              <p className="mt-4 text-xs text-[var(--text-muted)]">
                Last updated: <span className="text-[var(--text-secondary)]">11 October 2025</span>
              </p>
            </div>
          </div>

          {/* Quick nav */}
          <div className="mt-8 flex flex-wrap gap-2">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-[11px] px-2.5 py-1 rounded-full border border-white/[0.08] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-white/20 transition-colors"
              >
                {s.title}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-0 divide-y divide-white/[0.05]">
        {SECTIONS.map((section, i) => (
          <section key={section.id} id={section.id} className="py-8 first:pt-0">
            <div className="flex items-start gap-4">
              {/* Section number */}
              <span className="shrink-0 mt-0.5 flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.04] border border-white/[0.07] text-[11px] font-semibold text-[var(--text-muted)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">
                    {section.title}
                  </h2>
                  {section.badge && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase tracking-wide">
                      {section.badge}
                    </span>
                  )}
                </div>
                <div className="prose prose-sm prose-invert max-w-none
                  prose-p:text-[var(--text-secondary)] prose-p:leading-relaxed prose-p:my-2
                  prose-li:text-[var(--text-secondary)] prose-li:my-1
                  prose-ul:my-2 prose-ul:pl-5
                  prose-strong:text-[var(--text-primary)] prose-strong:font-semibold
                  prose-headings:text-[var(--text-primary)]">
                  <ReactMarkdown>{section.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          </section>
        ))}

        {/* Acceptance block */}
        <section id="acceptance" className="py-8">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
              Acceptance
            </p>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              By opening a ticket, making a payment, or continuing to use our services, you
              acknowledge that you have read, understood, and agreed to these Terms of Service.
            </p>
            <div className="mt-6 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-[var(--text-primary)] font-medium">
                Have fun &amp; stay safe!
                <span className="block text-sm text-[var(--text-muted)] font-normal mt-0.5">
                  — The BoostPlatform Team
                </span>
              </p>
              <Link
                href="/games"
                className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent-primary)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Browse services
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer note */}
        <div className="pt-8 pb-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <p>
            BoostPlatform is not affiliated with Jagex Ltd., RuneScape®, or Old School RuneScape®.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-[var(--text-secondary)] transition-colors">
              Privacy Policy
            </Link>
            <Link href="/" className="hover:text-[var(--text-secondary)] transition-colors">
              Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
