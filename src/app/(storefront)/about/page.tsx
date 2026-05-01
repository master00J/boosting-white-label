import type { Metadata } from "next";
import Link from "next/link";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://boosting-self.vercel.app";

export const metadata: Metadata = {
  title: { absolute: "About Us | BoostPlatform" },
  description:
    "Experience, precision, trust. Discover the story behind BoostPlatform — elite OSRS players delivering 100% manual services with full account safety.",
  openGraph: {
    title: "About Us | BoostPlatform",
    description:
      "What began as a small circle of elite OSRS players has evolved into one of the most respected names in OSRS services.",
    url: `${appUrl}/about`,
    type: "website",
  },
  alternates: { canonical: `${appUrl}/about` },
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const WHY_ITEMS = [
  {
    title: "Account Safety First",
    desc: "100% manual services with Parsec & VPN protection on every single order.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    accent: "emerald",
  },
  {
    title: "Fast & Reliable Delivery",
    desc: "Realistic deadlines you can count on, communicated clearly before you pay.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    accent: "blue",
  },
  {
    title: "Transparent Communication",
    desc: "Real-time progress updates through Discord and your personal order page.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    accent: "purple",
  },
  {
    title: "Elite Team",
    desc: "Thousands of hours of in-game expertise across every piece of high-end OSRS content.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    accent: "amber",
  },
  {
    title: "Flexible Payments",
    desc: "Pay in GP, crypto, or traditional payment methods — whatever is most convenient for you.",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    accent: "rose",
  },
];

const ACCENT_CLASSES: Record<string, { border: string; bg: string; text: string }> = {
  emerald: { border: "border-[#E8720C]/20", bg: "bg-[#E8720C]/[0.05]", text: "text-[#FF9438]" },
  blue:    { border: "border-[#E8720C]/20", bg: "bg-[#E8720C]/[0.04]", text: "text-[#FF9438]" },
  purple:  { border: "border-[#E8720C]/20", bg: "bg-[#E8720C]/[0.04]", text: "text-[#FF9438]" },
  amber:   { border: "border-[#E8720C]/20", bg: "bg-[#E8720C]/[0.06]", text: "text-[#FF9438]" },
  rose:    { border: "border-[#E8720C]/20", bg: "bg-[#E8720C]/[0.04]", text: "text-[#FF9438]" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">

      {/* ── Hero ── */}
      <div className="relative border-b border-[#E8720C]/15 overflow-hidden">
        {/* Gold radial glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] opacity-[0.08] pointer-events-none"
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

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#E8720C]/25 bg-[#E8720C]/[0.06] text-xs text-[#FF9438]/90 font-medium tracking-wider uppercase mb-6">
            About us
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] leading-tight">
            BoostPlatform
          </h1>
          <p className="mt-3 text-xl sm:text-2xl font-light text-[var(--text-secondary)] tracking-wide">
            Experience.{" "}
            <span className="text-[#FF9438] font-medium">Precision.</span>{" "}
            Trust.
          </p>

          <p className="mt-6 text-[var(--text-secondary)] text-lg leading-relaxed max-w-2xl mx-auto">
            What began as a small circle of elite Old School RuneScape players has evolved into
            one of the most respected names in OSRS services. At BoostPlatform, we turn
            experience into results — making high-end content accessible to every player.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-16 sm:py-20 space-y-16">

        {/* ── Mission ── */}
        <section>
          <div className="rounded-2xl border border-[#E8720C]/15 bg-[#E8720C]/[0.03] px-6 sm:px-10 py-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">
              Our mission
            </p>
            <blockquote className="text-xl sm:text-2xl font-medium text-[var(--text-primary)] leading-relaxed">
              &ldquo;Keep your account safe, respect your time,
              and deliver with transparency.&rdquo;
            </blockquote>
          </div>
        </section>

        {/* ── What we do ── */}
        <section className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
              What we do
            </p>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              Elite manual services — no bots, no shortcuts.
            </h2>
          </div>

          <p className="text-[var(--text-secondary)] leading-relaxed">
            From Infernal Capes and raid carries to skilling and minigames, every service is
            handled manually by our verified boosters. We operate through Parsec sessions and
            VPN protection, ensuring full privacy and account safety.
          </p>

          <div className="grid sm:grid-cols-3 gap-3 pt-2">
            {[
              { label: "No bots", icon: "🚫" },
              { label: "No shortcuts", icon: "⚡" },
              { label: "Just skill & integrity", icon: "🏆" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#E8720C]/15 bg-[#E8720C]/[0.03]"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Why players choose us ── */}
        <section className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
              Why players choose us
            </p>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              What sets BoostPlatform apart
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {WHY_ITEMS.map((item) => {
              const a = ACCENT_CLASSES[item.accent];
              return (
                <div
                  key={item.title}
                  className={`rounded-xl border p-5 space-y-2.5 ${a.border} ${a.bg}`}
                >
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${a.border} bg-black/20 ${a.text}`}>
                    {item.icon}
                  </div>
                  <p className={`text-sm font-semibold ${a.text}`}>{item.title}</p>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Our promise ── */}
        <section className="space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
              Our promise
            </p>
            <h2 className="text-2xl font-bold text-[var(--text-primary)]">
              We boost more than accounts.
            </h2>
          </div>

          <div className="space-y-4 text-[var(--text-secondary)] leading-relaxed">
            <p>
              At BoostPlatform, we don&apos;t just boost accounts — we boost <em className="text-[var(--text-primary)] not-italic font-medium">experiences</em>.
              Every order is treated with the same care we&apos;d want for our own accounts.
            </p>
            <p>
              We believe in <strong className="text-[var(--text-primary)] font-semibold">trust</strong>,{" "}
              <strong className="text-[var(--text-primary)] font-semibold">transparency</strong>, and{" "}
              <strong className="text-[var(--text-primary)] font-semibold">quality</strong> — and
              that&apos;s what keeps thousands of players coming back.
            </p>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="rounded-2xl border border-[#E8720C]/20 bg-gradient-to-br from-[#E8720C]/[0.06] to-transparent px-6 sm:px-10 py-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E8720C]/[0.08] border border-[#E8720C]/25 mb-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF9438] animate-pulse" />
            <span className="text-xs text-[#FF9438]/90 font-medium tracking-wide uppercase">Ready to get started?</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
            Join the community.{" "}
            <span className="text-[#FF9438]">Boost with confidence.</span>
          </h2>
          <p className="text-[var(--text-secondary)] max-w-md mx-auto">
            BoostPlatform — where experience meets excellence.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
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
              href="/how-it-works"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-[#E8720C]/25 text-sm font-medium text-[var(--text-secondary)] hover:text-[#FF9438] hover:border-[#E8720C]/50 transition-colors"
            >
              How does it work?
            </Link>
          </div>
        </section>

        {/* Footer note */}
        <div className="pt-4 border-t border-[#E8720C]/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
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
