"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Star,
  ChevronDown,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Hero Background (static image) ─── */
function HeroBackground({
  imageUrl,
  overlayOpacity = 0.65,
}: {
  imageUrl?: string;
  overlayOpacity?: number;
}) {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {/* Background image */}
      {imageUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      ) : (
        /* Fallback: dark orange gradient */
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 60% 40%, #1E0E04 0%, #0C0906 70%)",
          }}
        />
      )}

      {/* Dark overlay: configurable from admin. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom,
            rgba(0,0,0,${overlayOpacity * 0.25}) 0%,
            rgba(0,0,0,${overlayOpacity * 0.55}) 45%,
            rgba(0,0,0,${Math.min(overlayOpacity + 0.15, 1)}) 100%)`,
        }}
      />

      {/* Subtle orange glow for branding. */}
      <div
        className="absolute bottom-0 left-0 right-0 w-full h-1/2 pointer-events-none opacity-[0.07]"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, #E8720C 0%, transparent 65%)",
        }}
      />

      {/* Onderste vervaging naar pagina-achtergrond */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[var(--bg-primary)] to-transparent pointer-events-none" />
    </div>
  );
}

/* ─── Types ─── */
interface Game {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  banner_url: string | null;
  short_description: string | null;
  is_featured: boolean | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: { display_name: string | null; avatar_url: string | null } | null;
}

interface FeaturedWorker {
  id: string;
  slug?: string | null;
  profile_photo_url?: string | null;
  profile: { display_name: string | null; avatar_url: string | null } | null;
}

export type StorefrontStats = {
  completed_orders: number;
  review_count: number;
  avg_rating: number;
};

/* ─── Hooks ─── */
function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12, ...options }
    );
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, inView };
}

/* ─── OSRS wiki icon helper ─── */
const WIKI = "https://oldschool.runescape.wiki/images";

/* ─── Static Data ─── */
const TRUST_FEATURES = [
  {
    osrsIcon: `${WIKI}/Defence_icon.png`,
    iconAlt: "Defence",
    number: "01",
    title: "Account safety guaranteed",
    description:
      "Boosters use VPN connections matching your region and work within game guidelines. No bans, no risks.",
  },
  {
    osrsIcon: `${WIKI}/Agility_icon.png`,
    iconAlt: "Agility",
    number: "02",
    title: "Booster assigned within 1 hour",
    description:
      "After payment your order is visible to our verified boosters. Average assignment time is under 60 minutes.",
  },
  {
    osrsIcon: `${WIKI}/Quest_point_icon.png`,
    iconAlt: "Quest points",
    number: "03",
    title: "Verified boosters only",
    description:
      "Every booster passes a skill test and maintains a minimum 4.5/5 rating. No exceptions.",
  },
];

function getFaqItems(completedOrders: number) {
  const orderText =
    completedOrders > 0
      ? `We've completed ${completedOrders.toLocaleString()} orders without a single ban.`
      : "We take account safety seriously and have a strong track record.";
  return [
    {
      question: "Is game boosting safe for my account?",
      answer: `Yes. Our boosters work with VPN connections matching your region and always stay within the game's terms of service. ${orderText}`,
    },
    {
      question: "How long until my order starts?",
      answer:
        "After payment, your order is immediately visible to available boosters. On average someone starts within 1 hour. During off-peak hours this can take up to 3 hours.",
    },
    {
      question: "Can I track progress while my order is active?",
      answer:
        "Yes. Through your dashboard you can follow progress in real-time and message your booster directly. You'll also receive notifications on every status update.",
    },
    {
      question: "What payment methods do you accept?",
      answer:
        "We accept credit and debit cards (Visa, Mastercard), PayPal, and account balance top-ups. All payments are processed securely via Whop and Stripe.",
    },
  ];
}

const HOW_IT_WORKS = [
  {
    step: "01",
    osrsIcon: `${WIKI}/Coins_1000.png`,
    iconAlt: "Coins",
    title: "Select service",
    description: "Browse our services and choose the boost you need.",
  },
  {
    step: "02",
    osrsIcon: `${WIKI}/Old_school_bond.png`,
    iconAlt: "Bond",
    title: "Checkout",
    description:
      "Pay securely with Card, Crypto, or in-game Gold. Your data is encrypted.",
  },
  {
    step: "03",
    osrsIcon: `${WIKI}/Magic_icon.png`,
    iconAlt: "Magic",
    title: "Ticket created",
    description:
      "A private Discord ticket is created for your order so you can follow progress.",
  },
  {
    step: "04",
    osrsIcon: `${WIKI}/Dragon_scimitar.png`,
    iconAlt: "Dragon scimitar",
    title: "We play",
    description:
      "Sit back while our vetted boosters complete your order securely.",
  },
];

const SERVICE_CATEGORIES = [
  {
    osrsIcon: `${WIKI}/Coins_detail.png`,
    iconAlt: "Coins",
    title: "Gold & Items",
    desc: "Buy & sell in-game currency and rare items safely.",
    cta: "Trade Gold",
    href: "/games",
  },
  {
    osrsIcon: `${WIKI}/Dragon_scimitar.png`,
    iconAlt: "Dragon scimitar",
    title: "Boosting Services",
    desc: "PVM, raids, quests, skilling & more from verified boosters.",
    cta: "Browse services",
    href: "/games",
  },
  {
    osrsIcon: `${WIKI}/Prayer_icon.png`,
    iconAlt: "Prayer",
    title: "Accounts",
    desc: "Ready-made & custom builds available immediately.",
    cta: "Shop accounts",
    href: "/games",
  },
];

/* ─── Other sub-components ─── */

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.65s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i <= rating ? "text-[#FF9438] fill-[#FF9438]" : "text-white/10"
          )}
        />
      ))}
    </div>
  );
}

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});

  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setStyle({
      transform: `perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) scale(1.02)`,
      transition: "transform 0.1s ease-out",
    });
  }, []);

  const handleLeave = useCallback(() => {
    setStyle({
      transform: "perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)",
      transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1)",
    });
  }, []);

  return (
    <div ref={cardRef} className={className} style={style} onMouseMove={handleMove} onMouseLeave={handleLeave}>
      {children}
    </div>
  );
}

function GameCard({ game, index }: { game: Game; index: number }) {
  return (
    <Reveal delay={index * 80}>
      <TiltCard>
        <Link
          href={`/games/${game.slug}`}
          className="group relative block overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[#E8720C]/40 transition-all duration-300"
        >
          {/* Hover glow */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none z-10">
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{ background: "radial-gradient(circle at 50% 0%, var(--color-primary), transparent 70%)" }}
            />
          </div>

          <div className="relative h-36 bg-[var(--bg-elevated)] overflow-hidden">
            {game.banner_url ? (
              <Image
                src={game.banner_url}
                alt={game.name}
                fill
                className="object-cover group-hover:scale-[1.08] transition-transform duration-700 ease-out"
              />
            ) : (
              <div className="absolute inset-0 bg-[var(--bg-elevated)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-[var(--bg-card)]/30 to-transparent" />

            <div className="absolute bottom-3 left-3 w-11 h-11 rounded-xl bg-[var(--bg-card)]/90 backdrop-blur border border-white/[0.08] flex items-center justify-center overflow-hidden shadow-xl">
              {game.logo_url ? (
                <Image src={game.logo_url} alt={game.name} width={44} height={44} className="object-cover" />
              ) : (
                <span className="text-lg">🎮</span>
              )}
            </div>

            {game.is_featured && (
              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-[#E8720C]/20 border border-[#E8720C]/35 text-[#FF9438] text-[10px] font-semibold tracking-wide uppercase">
                Featured
              </div>
            )}
          </div>

          <div className="p-4 pt-2.5">
            <h3 className="font-heading font-semibold text-sm text-[var(--text-primary)] group-hover:text-white transition-colors">
              {game.name}
            </h3>
            {game.short_description && (
              <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2 leading-relaxed">
                {game.short_description}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-3 text-xs font-medium">
              <span className="text-[#E8720C] group-hover:text-white transition-colors">View services</span>
              <ArrowRight className="h-3 w-3 text-[#E8720C] group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </div>
        </Link>
      </TiltCard>
    </Reveal>
  );
}

function ReviewCard({ review, index }: { review: Review; index: number }) {
  const name = review.reviewer?.display_name ?? "Anonymous";
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Reveal delay={index * 80}>
      <div className="group flex flex-col h-full p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[#E8720C]/35 hover:-translate-y-0.5 transition-all duration-300">
        {/* Quote mark */}
        <div className="text-3xl leading-none text-[#E8720C]/25 font-serif mb-2 select-none">&ldquo;</div>
        <StarRating rating={review.rating} />
        {review.comment && (
          <p className="text-sm text-[var(--text-secondary)] mt-3 leading-relaxed line-clamp-4 flex-1">
            {review.comment}
          </p>
        )}
        <div className="flex items-center gap-2.5 mt-4 pt-4 border-t border-white/[0.04]">
          <div className="w-8 h-8 rounded-full bg-[#E8720C]/10 border border-[#E8720C]/20 flex items-center justify-center text-[10px] font-bold text-[#E8720C] flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">{name}</p>
            <p className="text-[10px] text-[var(--text-muted)]">
              {new Date(review.created_at).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

function FaqItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <Reveal delay={index * 60}>
      <div
        className={cn(
          "rounded-xl overflow-hidden border transition-all duration-300",
          open
            ? "border-[#E8720C]/30 bg-[#E8720C]/[0.03]"
            : "border-[var(--border-default)] hover:border-[#E8720C]/20"
        )}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left group"
          aria-expanded={open}
          aria-controls={`faq-answer-${index}`}
          aria-label={open ? `Collapse: ${question}` : `Expand: ${question}`}
        >
          <span className="font-medium text-sm text-[var(--text-primary)] pr-4 group-hover:text-white transition-colors">
            {question}
          </span>
          <div
            className={cn(
              "flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-300",
              open
                ? "bg-[#E8720C]/15 rotate-180"
                : "bg-white/[0.04]"
            )}
          >
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-colors",
                open ? "text-[#E8720C]" : "text-[var(--text-muted)]"
              )}
            />
          </div>
        </button>
        <div
          id={`faq-answer-${index}`}
          role="region"
          aria-hidden={!open}
          style={{
            display: "grid",
            gridTemplateRows: open ? "1fr" : "0fr",
            transition: "grid-template-rows 0.35s cubic-bezier(0.16,1,0.3,1)",
          }}
          className="overflow-hidden"
        >
          <div className="min-h-0 px-5 pb-5">
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{answer}</p>
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/* ─── Section Label ─── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 mb-3">
      <span className="w-4 h-px bg-[#E8720C]" />
      <p className="text-[10px] font-bold text-[#E8720C] uppercase tracking-[0.22em]">{children}</p>
    </div>
  );
}

/* ─── Main Component ─── */
export default function HomepageClient({
  games,
  reviews,
  featuredWorkers = [],
  discordInviteUrl: _discordInviteUrl = "",
  stats = { completed_orders: 0, review_count: 0, avg_rating: 0 },
  heroImages = [],
  heroVideoSlides: _heroVideoSlides = [],
  heroOverlayOpacity = 0.75,
  heroHeight = 65,
  heroMobileLogo = "",
  heroMobileLogoOnly = false,
}: {
  games: Game[];
  reviews: Review[];
  featuredWorkers?: FeaturedWorker[];
  discordInviteUrl?: string;
  stats?: StorefrontStats;
  heroImages?: string[];
  heroVideoSlides?: string[];
  heroOverlayOpacity?: number;
  heroHeight?: number;
  heroMobileLogo?: string;
  heroMobileLogoOnly?: boolean;
}) {
  const featuredGames = games.filter((g) => g.is_featured);
  const displayGames = featuredGames.length > 0 ? featuredGames : games;
  const displayWorkers = featuredWorkers.slice(0, 8);
  const moreCount = Math.max(0, featuredWorkers.length - 8);
  const faqItems = getFaqItems(stats.completed_orders);

  const statItems = [
    stats.completed_orders > 0
      ? { value: `${stats.completed_orders.toLocaleString()}+`, label: "Orders completed" }
      : null,
    stats.avg_rating > 0
      ? { value: `${stats.avg_rating.toFixed(1)}/5`, label: "Average rating" }
      : null,
    stats.review_count > 0
      ? { value: `${stats.review_count.toLocaleString()}+`, label: "Verified reviews" }
      : null,
    { value: "< 1hr", label: "Avg. start time" },
  ].filter(Boolean) as { value: string; label: string }[];

  return (
    <div className="overflow-x-hidden">

      {/* ── HERO ── */}
      <section
        className="relative overflow-hidden"
        style={{ height: `${heroHeight}vh`, minHeight: 480 }}
      >
        {/* Achtergrondafbeelding */}
        <HeroBackground
          imageUrl={heroImages[0]}
          overlayOpacity={heroOverlayOpacity}
        />

        {/* Mobiel: alleen logo (indien ingesteld via admin) */}
        {heroMobileLogoOnly && heroMobileLogo && (
          <div className="md:hidden absolute inset-0 z-[2] flex items-center justify-center bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-primary)]">
            <div className="w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center p-4">
              <Image
                src={heroMobileLogo}
                alt="Logo"
                width={160}
                height={160}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--bg-primary)] to-transparent pointer-events-none" />
          </div>
        )}

        {/* Hero text content — positioned at the bottom third to avoid covering the banner art */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center text-center px-4 pb-10 sm:pb-14"
          style={{ background: "linear-gradient(to top, rgba(12,9,6,0.92) 0%, rgba(12,9,6,0.6) 55%, transparent 100%)" }}
        >
          {/* Trust badge — alleen tonen als er echte data is */}
          {stats.completed_orders > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E8720C]/15 border border-[#E8720C]/35 backdrop-blur-sm mb-5">
              <Star className="h-3 w-3 text-[#FF9438] fill-[#FF9438]" />
              <span className="text-xs font-semibold text-[#FF9438] tracking-wide">
                {stats.completed_orders.toLocaleString()}+ orders completed
              </span>
            </div>
          )}

          {/* Headline */}
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white max-w-4xl leading-[1.1] tracking-tight">
            The Fastest &amp;{" "}
            <span
              className="text-transparent bg-clip-text"
              style={{
                backgroundImage: "linear-gradient(135deg, #E8720C 0%, #FF9438 50%, #FFB570 100%)",
              }}
            >
              Safest
            </span>{" "}
            Game Boosting
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-base sm:text-lg text-white/65 max-w-lg leading-relaxed">
            Verified boosters, instant start, and a satisfaction guarantee — for all your favourite games.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
            <Link
              href="/games"
              className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#E8720C]/30"
              style={{ background: "linear-gradient(135deg, #E8720C, #C95E08)" }}
            >
              Browse Services
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white/85 bg-white/[0.08] backdrop-blur border border-white/[0.15] hover:bg-white/[0.13] hover:text-white transition-all duration-300"
            >
              How it works
            </Link>
          </div>

          {/* Inline trust items */}
          <div className="flex flex-wrap justify-center items-center gap-4 mt-6 text-xs text-white/55">
            {stats.completed_orders > 0 && (
              <>
                <span>{stats.completed_orders.toLocaleString()}+ orders</span>
                <span className="w-px h-3 bg-white/20" />
              </>
            )}
            {stats.review_count > 0 && (
              <>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-[#FF9438] fill-[#FF9438]" />
                  <span>{stats.avg_rating.toFixed(1)} from {stats.review_count.toLocaleString()} reviews</span>
                </div>
                <span className="w-px h-3 bg-white/20" />
              </>
            )}
            <div className="flex items-center gap-1.5">
              <Check className="h-3 w-3 text-emerald-400" />
              <span>Satisfaction guaranteed</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS STRIP ── alleen tonen als er minimaal 1 echte stat is */}
      {statItems.length > 0 && (
        <div className="border-y border-[#E8720C]/10 bg-gradient-to-r from-[#E8720C]/[0.04] via-[#E8720C]/[0.02] to-[#E8720C]/[0.04]">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <div
              className="grid gap-6 divide-x divide-[#E8720C]/10"
              style={{ gridTemplateColumns: `repeat(${statItems.length}, minmax(0, 1fr))` }}
            >
              {statItems.map((s, i) => (
                <div key={s.label} className={cn("text-center px-4", i === 0 && "pl-0")}>
                  <p
                    className="text-2xl sm:text-3xl font-bold font-heading"
                    style={{
                      backgroundImage: "linear-gradient(135deg, #FF9438, #E8720C)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {s.value}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SERVICE CATEGORIES ── */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <SectionLabel>Services</SectionLabel>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-12">
              Everything you need for OSRS
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {SERVICE_CATEGORIES.map((cat, i) => (
              <Reveal key={cat.title} delay={i * 100}>
                <Link
                  href={cat.href}
                  className="group relative flex flex-col gap-5 p-7 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[#E8720C]/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                >
                  {/* Background hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div
                      className="absolute inset-0"
                      style={{
                        background: "radial-gradient(circle at 50% 0%, rgba(232,114,12,0.06), transparent 70%)",
                      }}
                    />
                  </div>

                  {/* OSRS icon */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
                    style={{ background: "linear-gradient(135deg, rgba(232,114,12,0.15), rgba(232,114,12,0.06))", border: "1px solid rgba(232,114,12,0.2)" }}
                  >
                    <Image
                      src={cat.osrsIcon}
                      alt={cat.iconAlt}
                      width={36}
                      height={36}
                      className="object-contain drop-shadow-[0_0_6px_rgba(232,114,12,0.4)]"
                      style={{ imageRendering: "pixelated" }}
                    />
                  </div>

                  <div>
                    <h3 className="font-heading font-bold text-lg text-white mb-1.5">{cat.title}</h3>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">{cat.desc}</p>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#E8720C] group-hover:text-[#FF9438] transition-colors">
                    {cat.cta}
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform duration-300" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── GAMES ── */}
      <section className="py-24 px-4 relative">
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #E8720C, transparent 60%)" }}
        />
        <div className="relative max-w-7xl mx-auto">
          <Reveal>
            <div className="flex items-end justify-between mb-12">
              <div>
                <SectionLabel>Catalog</SectionLabel>
                <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white">
                  Available games
                </h2>
              </div>
              <Link
                href="/games"
                className="hidden sm:flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[#FF9438] transition-colors"
              >
                View all
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </Reveal>

          {displayGames.length === 0 ? (
            <div className="text-center py-24 text-[var(--text-muted)]">
              <p className="font-medium">Coming soon</p>
              <p className="text-sm mt-1">Games will be added shortly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {displayGames.map((game, i) => (
                <GameCard key={game.id} game={game} index={i} />
              ))}
            </div>
          )}

          <div className="sm:hidden mt-6 text-center">
            <Link href="/games" className="text-sm text-[#E8720C] hover:text-[#FF9438] transition-colors">
              View all games →
            </Link>
          </div>
        </div>
      </section>

      {/* ── WHY US ── */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <Reveal>
            <SectionLabel>Why us</SectionLabel>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-12">
              Why players choose us
            </h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {TRUST_FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 80}>
                <div className="group flex items-start gap-5 p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[#E8720C]/35 hover:-translate-y-0.5 transition-all duration-300">
                  {/* OSRS icon with number badge */}
                  <div className="flex-shrink-0 relative">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg, rgba(232,114,12,0.15), rgba(232,114,12,0.05))",
                        border: "1px solid rgba(232,114,12,0.2)",
                      }}
                    >
                      <Image
                        src={feature.osrsIcon}
                        alt={feature.iconAlt}
                        width={28}
                        height={28}
                        className="object-contain drop-shadow-[0_0_4px_rgba(232,114,12,0.5)]"
                        style={{ imageRendering: "pixelated" }}
                      />
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#E8720C] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                      {feature.number}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-white mb-1.5">{feature.title}</h3>
                    <p className="text-sm text-[var(--text-muted)] leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      {reviews.length > 0 && (
        <section className="py-24 px-4 relative">
          <div
            className="absolute inset-0 opacity-[0.012]"
            style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #E8720C, transparent 60%)" }}
          />
          <div className="relative max-w-7xl mx-auto">
            <Reveal>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
                <div>
                  <SectionLabel>Reviews</SectionLabel>
                  <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white">
                    What customers say
                  </h2>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {stats.review_count > 0 && (
                    <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#E8720C]/[0.08] border border-[#E8720C]/20">
                      <StarRating rating={stats.avg_rating} />
                      <span className="text-sm font-semibold text-[#FF9438]">
                        {stats.avg_rating.toFixed(1)}
                      </span>
                      <span className="text-sm text-[var(--text-muted)]">
                        · {stats.review_count.toLocaleString()} reviews
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviews.map((review, i) => (
                <ReviewCard key={review.id} review={review} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── BOOSTERS ── */}
      {(displayWorkers.length > 0 || moreCount > 0) && (
        <section className="py-24 px-4">
          <div className="max-w-7xl mx-auto">
            <Reveal>
              <div className="rounded-2xl border border-[#E8720C]/15 p-8 sm:p-10 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, rgba(232,114,12,0.05), rgba(232,114,12,0.02) 50%, transparent)" }}>
                {/* Decorative glow */}
                <div
                  className="absolute top-0 right-0 w-64 h-64 opacity-[0.06] pointer-events-none"
                  style={{ background: "radial-gradient(circle, #E8720C, transparent 70%)" }}
                />
                <div className="relative">
                  <SectionLabel>Our team</SectionLabel>
                  <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white mb-1">
                    Meet the people behind the boosts
                  </h2>
                  <p className="text-[var(--text-secondary)] text-sm sm:text-base max-w-xl mb-8">
                    Hand-picked, verified boosters. See who might be playing on your account.
                  </p>
                  <div className="flex flex-wrap items-center gap-4">
                    {displayWorkers.map((w, i) => {
                      const name = w.profile?.display_name ?? "Booster";
                      const avatar = w.profile_photo_url ?? w.profile?.avatar_url;
                      const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                      return (
                        <Link
                          key={w.id}
                          href={`/boosters/${w.slug ?? w.id}`}
                          className="flex flex-col items-center gap-1.5 group"
                          title={name}
                          style={{ animationDelay: `${i * 60}ms` }}
                        >
                          <div className="w-14 h-14 rounded-full bg-[var(--bg-elevated)] border-2 border-white/[0.06] overflow-hidden flex items-center justify-center text-sm font-semibold text-[var(--text-secondary)] group-hover:border-[#E8720C]/60 group-hover:scale-110 transition-all duration-300">
                            {avatar ? (
                              <Image src={avatar} alt={name} width={56} height={56} className="object-cover w-full h-full" />
                            ) : (
                              initials
                            )}
                          </div>
                          <span className="text-xs text-[var(--text-muted)] max-w-[4rem] truncate group-hover:text-white transition-colors">
                            {name}
                          </span>
                        </Link>
                      );
                    })}
                    {moreCount > 0 && (
                      <Link
                        href="/boosters"
                        className="w-14 h-14 rounded-full bg-white/[0.02] border-2 border-dashed border-white/[0.08] flex items-center justify-center text-sm font-semibold text-[var(--text-muted)] hover:border-[#E8720C]/50 hover:text-[#E8720C] hover:scale-110 transition-all duration-300"
                        aria-label={`View ${moreCount} more boosters`}
                      >
                        +{moreCount}
                      </Link>
                    )}
                  </div>
                  <Link
                    href="/boosters"
                    className="inline-flex items-center gap-2 mt-6 text-[#E8720C] font-semibold hover:text-[#FF9438] transition-colors"
                  >
                    Meet our full team
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ── */}
      <section className="py-24 px-4 relative">
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #E8720C, transparent 60%)" }}
        />
        <div className="relative max-w-5xl mx-auto">
          <Reveal>
            <div className="mb-16 text-center">
              <SectionLabel>Process</SectionLabel>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white">
                Simple, secure, fast
              </h2>
              <p className="mt-3 text-[var(--text-secondary)] text-sm max-w-lg mx-auto">
                We&apos;ve streamlined the process so getting your boost is as easy as possible.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Connector line on desktop */}
            <div className="hidden lg:block absolute top-5 left-[calc(12.5%+22px)] right-[calc(12.5%+22px)] h-px"
              style={{ background: "linear-gradient(to right, transparent, #E8720C 30%, #E8720C 70%, transparent)" }}
            />

            {HOW_IT_WORKS.map((item, i) => (
                <Reveal key={item.step} delay={i * 120}>
                  <div className="flex flex-col gap-4 relative">
                    {/* Step circle with OSRS icon */}
                    <div
                      className="relative z-10 w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #E8720C, #C95E08)", boxShadow: "0 0 20px rgba(232,114,12,0.35)" }}
                    >
                      <Image
                        src={item.osrsIcon}
                        alt={item.iconAlt}
                        width={24}
                        height={24}
                        className="object-contain drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]"
                        style={{ imageRendering: "pixelated" }}
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#E8720C]/70 tracking-[0.18em] uppercase">
                        Step {item.step}
                      </span>
                      <h3 className="font-heading font-bold text-white mt-0.5 mb-1.5">{item.title}</h3>
                      <p className="text-sm text-[var(--text-muted)] leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 px-4">
        <div className="max-w-2xl mx-auto">
          <Reveal>
            <div className="mb-10">
              <SectionLabel>FAQ</SectionLabel>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white">
                Frequently asked questions
              </h2>
            </div>
          </Reveal>
          <div className="space-y-2">
            {faqItems.map((item, i) => (
              <FaqItem key={item.question} question={item.question} answer={item.answer} index={i} />
            ))}
          </div>
          <Reveal delay={300}>
            <p className="text-sm text-[var(--text-muted)] mt-8">
              Still have questions?{" "}
              <Link href="/faq" className="text-[#E8720C] hover:text-[#FF9438] transition-colors font-medium">
                Visit our full FAQ
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="relative rounded-3xl overflow-hidden">
              {/* Orange gradient background */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(135deg, #1A0D05 0%, #2A1008 30%, #1A0D05 100%)",
                }}
              />
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  background:
                    "radial-gradient(ellipse at 60% 50%, rgba(232,114,12,0.25), transparent 70%)",
                }}
              />
              {/* Border */}
              <div className="absolute inset-0 rounded-3xl border border-[#E8720C]/25" />

              {/* Decorative dot grid */}
              <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="cta-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="1" fill="white" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#cta-dots)" />
              </svg>

              <div className="relative p-10 sm:p-14 flex flex-col sm:flex-row items-center gap-10">
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-3">
                    Start your first order today
                  </h2>
                  <p className="text-[var(--text-secondary)] mb-8 text-base leading-relaxed max-w-lg">
                    Choose your game, configure your service, and let a verified booster handle the rest.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                    <Link
                      href="/games"
                      className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-[#E8720C]/30 text-base"
                      style={{ background: "linear-gradient(135deg, #E8720C, #C95E08)" }}
                    >
                      Browse games
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                    <div className="flex flex-col gap-2">
                      {["Booster assigned within 1 hour", "No hidden fees", "Satisfaction guaranteed"].map((item) => (
                        <div key={item} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                          <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Rating block — alleen tonen als er echte data is */}
                {stats.avg_rating > 0 && stats.review_count > 0 && (
                  <div className="flex-shrink-0 hidden sm:flex flex-col items-center justify-center w-44 h-44 rounded-2xl border border-[#E8720C]/20"
                    style={{ background: "linear-gradient(135deg, rgba(232,114,12,0.1), rgba(232,114,12,0.04))" }}>
                    <div className="text-4xl font-bold font-heading text-transparent bg-clip-text"
                      style={{ backgroundImage: "linear-gradient(135deg, #FF9438, #E8720C)" }}>
                      {stats.avg_rating.toFixed(1)}
                    </div>
                    <div className="flex gap-0.5 my-2">
                      {[1,2,3,4,5].map((s) => (
                        <Star key={s} className="h-4 w-4 text-[#FF9438] fill-[#FF9438]" />
                      ))}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] text-center leading-snug">
                      {stats.review_count.toLocaleString()}+ reviews
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
