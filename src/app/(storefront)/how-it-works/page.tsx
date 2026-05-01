import type { Metadata } from "next";
import Link from "next/link";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://boosting-self.vercel.app";

export const metadata: Metadata = {
  title: { absolute: "How Does It Work? | BoostPlatform" },
  description:
    "Learn how BoostPlatform works — from choosing your OSRS service to secure delivery via Parsec or VPN-protected login. Safe, manual, and transparent.",
  openGraph: {
    title: "How Does It Work? | BoostPlatform",
    description:
      "Safe, manual OSRS boosting — Infernal Capes, raids, skilling and more. Delivered by verified boosters via Parsec or VPN.",
    url: `${appUrl}/how-it-works`,
    type: "website",
  },
  alternates: { canonical: `${appUrl}/how-it-works` },
};

// ─── Step data ────────────────────────────────────────────────────────────────

const STEPS = [
  {
    number: "01",
    title: "Choose Your Service",
    description:
      "Browse our list of OSRS services and pick the one that suits your goal — Inferno, raids, minigames, or skilling. Once you place your order, you'll receive an instant confirmation email with all the next steps.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Complete Payment",
    description:
      "After checkout, you'll get an email guiding you to join our Discord for live updates or log in to your BoostPlatform account to track your order status. Both options keep you informed from start to finish.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Provide Account Details",
    description:
      "Share your credentials (username and a temporary password) securely through our Discord ticket system or directly on your order page. All information is handled privately and deleted immediately after your service.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Choose Your Access Method",
    description: "",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    options: [
      {
        label: "Parsec (Watch Live)",
        desc: "You host a Parsec session — our booster connects securely so you can watch every step in real-time.",
        accent: "emerald",
      },
      {
        label: "Direct Login (VPN Protected)",
        desc: "Our verified booster logs in using a region-matched VPN, ensuring your account's security and privacy.",
        accent: "blue",
      },
    ],
  },
  {
    number: "05",
    title: "Live Updates & Completion",
    description:
      "Get real-time progress updates through Discord and your order page. Once complete, we provide screenshots, video proof, or Parsec confirmation — whatever suits you best.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const WHY_ITEMS = [
  {
    title: "VPN-Protected & Secure Access",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: "Experienced, Verified Boosters",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    title: "24/7 Support via Discord or Website",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    title: "Completely Manual — No Bots",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  {
    title: "Fast, Transparent & Reliable",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">

      {/* ── Hero ── */}
      <div className="relative border-b border-[#E8720C]/15 overflow-hidden">
        {/* Subtle gold radial glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-[0.07] pointer-events-none"
          style={{ background: "radial-gradient(ellipse, #E8720C 0%, transparent 70%)" }}
        />
        <div className="relative max-w-4xl mx-auto px-6 py-16 sm:py-24 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[#FF9438] transition-colors mb-10"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8720C]/[0.08] border border-[#E8720C]/25 mb-5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF9438] animate-pulse" />
            <span className="text-xs text-[#FF9438]/90 font-medium tracking-wide uppercase">The process</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] leading-tight">
            How does it work?
          </h1>
          <p className="mt-5 text-[var(--text-secondary)] text-lg leading-relaxed max-w-2xl mx-auto">
            At BoostPlatform, we keep the process{" "}
            <span className="text-[#FF9438] font-medium">simple, safe, and transparent</span>.
            Every service is completed 100% manually by verified boosters using Parsec or
            secure login access protected with VPN encryption.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/games"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#E8720C] text-[#0E0B07] text-sm font-bold hover:bg-[#FF9438] hover:shadow-lg hover:shadow-[#E8720C]/25 transition-all duration-300"
            >
              Browse services
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[#E8720C]/25 text-sm font-medium text-[var(--text-secondary)] hover:text-[#FF9438] hover:border-[#E8720C]/50 transition-colors"
            >
              Contact support
            </Link>
          </div>
        </div>
      </div>

      {/* ── Steps ── */}
      <div className="max-w-3xl mx-auto px-6 py-16 sm:py-20">
        <div className="space-y-0">
          {STEPS.map((step, i) => (
            <div key={step.number} className="relative flex gap-6 pb-10 last:pb-0">
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="absolute left-[19px] top-12 bottom-0 w-px bg-gradient-to-b from-[#E8720C]/30 to-transparent" />
              )}

              {/* Icon bubble */}
              <div className="shrink-0 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full border border-[#E8720C]/30 bg-[#E8720C]/[0.06] flex items-center justify-center text-[#FF9438]">
                  {step.icon}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 pt-1.5 pb-2">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[11px] font-bold text-[var(--text-muted)] font-mono tracking-wider">
                    STEP {step.number}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                  {step.title}
                </h2>

                {step.description && (
                  <p className="text-[var(--text-secondary)] leading-relaxed">{step.description}</p>
                )}

                {/* Access method options (step 4) */}
                {step.options && (
                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    {step.options.map((opt) => (
                      <div
                        key={opt.label}
                        className="rounded-xl border p-4 space-y-1.5 border-[#E8720C]/20 bg-[#E8720C]/[0.04]"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[#FF9438]" />
                          <p className="text-sm font-semibold text-[#FF9438]">
                            {opt.label}
                          </p>
                        </div>
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                          {opt.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Why BoostPlatform ── */}
        <div className="mt-16 rounded-2xl border border-[#E8720C]/15 bg-[#E8720C]/[0.03] overflow-hidden">
          <div className="px-6 sm:px-8 pt-8 pb-6 border-b border-[#E8720C]/12">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
              Why choose us
            </p>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">Why BoostPlatform?</h2>
          </div>

          <div className="px-6 sm:px-8 py-6 grid sm:grid-cols-2 gap-3">
            {WHY_ITEMS.map((item) => (
              <div key={item.title} className="flex items-center gap-3 py-2">
                <div className="shrink-0 w-8 h-8 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)]">
                  {item.icon}
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)]">{item.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Closing CTA ── */}
        <div className="mt-10 text-center space-y-3">
          <p className="text-lg font-semibold text-[var(--text-primary)]">
            Play Smarter. Level Faster. Stay Safe.
          </p>
          <p className="text-[var(--text-secondary)] max-w-lg mx-auto">
            At BoostPlatform, we combine efficiency, security, and transparency — so you can
            enjoy your OSRS goals without the grind.
          </p>
          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/games"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#E8720C] text-[#0E0B07] text-sm font-bold hover:bg-[#FF9438] hover:shadow-lg hover:shadow-[#E8720C]/25 transition-all duration-300"
            >
              Get started
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link
              href="/tos"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[#E8720C]/25 text-sm font-medium text-[var(--text-secondary)] hover:text-[#FF9438] hover:border-[#E8720C]/50 transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-16 pt-8 border-t border-[#E8720C]/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <p>BoostPlatform is not affiliated with Jagex Ltd., RuneScape® or Old School RuneScape®.</p>
          <div className="flex items-center gap-4">
            <Link href="/tos" className="hover:text-[var(--text-secondary)] transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-[var(--text-secondary)] transition-colors">Privacy</Link>
            <Link href="/" className="hover:text-[var(--text-secondary)] transition-colors">Home</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
