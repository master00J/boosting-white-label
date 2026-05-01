import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, RefreshCw, MessageCircle, CreditCard, Star, Shield, Zap, Clock, ChevronRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import ServiceConfigurator from "./service-configurator";
import CartPreview from "@/components/storefront/CartPreview";
import { JsonLdService, JsonLdBreadcrumb } from "@/components/seo/json-ld";

export const dynamic = "force-dynamic";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://boosting-self.vercel.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; categorySlug: string; serviceSlug: string }>;
}): Promise<Metadata> {
  const { slug, categorySlug, serviceSlug } = await params;
  const supabase = createAdminClient();
  const { data: service } = await supabase
    .from("services")
    .select("name, meta_title, meta_description, image_url")
    .eq("slug", serviceSlug)
    .single() as unknown as { data: Pick<ServiceRow, "name" | "meta_title" | "meta_description" | "image_url"> | null; error: unknown };

  const { data: game } = await supabase
    .from("games")
    .select("logo_url")
    .eq("slug", slug)
    .single() as unknown as { data: Pick<GameRow, "logo_url"> | null };

  const title = service?.meta_title ?? service?.name ?? "Service";
  const description =
    service?.meta_description ??
    (service?.name
      ? `Buy ${service.name} boosting on BoostPlatform. Fast, safe, and 100% manual by verified players. Get started within the hour.`
      : undefined);
  const url = `${baseUrl}/games/${slug}/${categorySlug}/${serviceSlug}`;
  const rawImage = service?.image_url ?? game?.logo_url;
  const ogImage = rawImage
    ? (rawImage.startsWith("http") ? rawImage : `${baseUrl}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`)
    : "/og-image.png";

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<{ slug: string; categorySlug: string; serviceSlug: string }>;
}) {
  const { slug, categorySlug, serviceSlug } = await params;
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: game } = await supabase
    .from("games")
    .select("id, name, slug, logo_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .single() as unknown as { data: Pick<GameRow, "id" | "name" | "slug" | "logo_url"> | null };

  if (!game) notFound();

  const { data: cat } = await db
    .from("service_categories")
    .select("id, name, slug")
    .eq("slug", categorySlug)
    .eq("game_id", game.id)
    .single() as { data: { id: string; name: string; slug: string } | null };

  if (!cat) notFound();

  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("slug", serviceSlug)
    .eq("game_id", game.id)
    .eq("is_active", true)
    .single() as unknown as { data: ServiceRow | null; error: unknown };

  if (!service) notFound();

  type ReviewResult = { id: string; rating: number; comment: string | null; created_at: string; reviewer: { display_name: string | null } | null };
  const { data: orderIds } = await supabase.from("orders").select("id").eq("service_id", service.id);
  const orderIdList = (orderIds ?? []).map((o) => o.id);
  let reviews: ReviewResult[] = [];
  let totalReviewCount = 0;
  let totalRatingValue = 0;
  if (orderIdList.length > 0) {
    const [displayReviews, allRatings] = await Promise.all([
      db
        .from("order_reviews")
        .select("id, rating, comment, created_at, reviewer:profiles(display_name)")
        .in("order_id", orderIdList)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(5) as Promise<{ data: ReviewResult[] | null }>,
      db
        .from("order_reviews")
        .select("rating")
        .in("order_id", orderIdList)
        .eq("is_public", true) as Promise<{ data: { rating: number }[] | null }>,
    ]);
    reviews = displayReviews.data ?? [];
    const ratings = allRatings.data ?? [];
    totalReviewCount = ratings.length;
    totalRatingValue =
      totalReviewCount > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalReviewCount
        : 0;
  }

  const serviceUrl = `${baseUrl}/games/${slug}/${categorySlug}/${serviceSlug}`;
  const rawImage = service.image_url ?? game.logo_url;
  const serviceImage = rawImage
    ? (rawImage.startsWith("http") ? rawImage : `${baseUrl}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`)
    : null;

  const reviewCount = totalReviewCount;
  const ratingValue = totalRatingValue;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <JsonLdService
        name={service.name}
        description={service.description}
        url={serviceUrl}
        image={serviceImage}
        price={service.base_price}
        currency="USD"
        availability="InStock"
        reviewCount={reviewCount}
        ratingValue={ratingValue}
      />
      <JsonLdBreadcrumb items={[
        { name: "Games", url: `${baseUrl}/games` },
        { name: game.name, url: `${baseUrl}/games/${slug}` },
        { name: cat.name, url: `${baseUrl}/games/${slug}/${categorySlug}` },
        { name: service.name, url: serviceUrl },
      ]} />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mb-8 flex-wrap">
        <Link href="/games" className="hover:text-[var(--text-primary)] transition-colors">
          Games
        </Link>
        <span>/</span>
        <Link href={`/games/${slug}`} className="hover:text-[var(--text-primary)] transition-colors">
          {game.name}
        </Link>
        <span>/</span>
        <Link href={`/games/${slug}/${categorySlug}`} className="hover:text-[var(--text-primary)] transition-colors">
          {cat.name}
        </Link>
        <span>/</span>
        <span className="text-[var(--text-primary)]">{service.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.85fr)] gap-10">
        {/* Left: info */}
        <div className="space-y-8">

          {/* Hero: breadcrumb pill + title */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Link href={`/games/${slug}/${categorySlug}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                <span>{cat.name}</span>
              </Link>
              <ChevronRight className="h-3 w-3 opacity-40" />
              <span className="text-[var(--text-secondary)]">{service.name}</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-5xl font-bold leading-tight tracking-tight">
              <span className="text-[var(--text-primary)]">{service.name}</span>
            </h1>
            {service.description && (
              <p className="text-[var(--text-secondary)] leading-relaxed text-sm sm:text-base max-w-lg">
                {service.description}
              </p>
            )}
            {/* Quick trust badges */}
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { icon: Shield, label: "Safe & Discreet" },
                { icon: Zap, label: "Fast Start" },
                { icon: Clock, label: "< 1h Assignment" },
                { icon: MessageCircle, label: "24/7 Support" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)] text-xs font-medium text-[var(--text-secondary)] hover:border-primary/30 hover:text-[var(--text-primary)] transition-colors">
                  <Icon className="h-3 w-3 text-primary shrink-0" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Feature cards grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Shield, title: "Account safety", desc: "100% manual, no bots ever used", color: "text-green-400", bg: "bg-green-400/8" },
              { icon: Zap, title: "Instant start", desc: "Booster assigned within the hour", color: "text-yellow-400", bg: "bg-yellow-400/8" },
              { icon: RefreshCw, title: "Money-back", desc: "Full refund if not completed", color: "text-blue-400", bg: "bg-blue-400/8" },
              { icon: MessageCircle, title: "Live support", desc: "Available 24/7 via chat", color: "text-primary", bg: "bg-primary/8" },
            ].map(({ icon: Icon, title, desc, color, bg }) => (
              <div key={title} className="flex items-start gap-3 p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-primary/20 transition-colors group">
                <div className={`w-9 h-9 rounded-xl ${bg} border border-white/[0.06] flex items-center justify-center shrink-0 mt-0.5`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-white transition-colors">{title}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* How it works — modern stepped flow */}
          <div className="space-y-3">
            <h2 className="font-heading font-bold text-[var(--text-primary)] text-lg">How it works</h2>
            <div className="relative space-y-1">
              {/* Gradient connector line */}
              <div className="absolute left-[22px] top-12 bottom-12 w-px bg-gradient-to-b from-primary/40 via-primary/15 to-transparent pointer-events-none" />
              {[
                { step: "1", title: "Configure & checkout", desc: "Choose your options and complete the secure payment in seconds.", icon: CreditCard },
                { step: "2", title: "Booster gets assigned", desc: "A verified booster claims your order — average wait under 1 hour.", icon: Zap },
                { step: "3", title: "Track & receive", desc: "Follow live progress in your dashboard and get notified on completion.", icon: Check },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4 px-4 py-4 rounded-2xl hover:bg-[var(--bg-elevated)] transition-colors group">
                  <div className="relative z-10 w-11 h-11 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-default)] group-hover:border-primary/40 flex items-center justify-center shrink-0 transition-colors">
                    <span className="text-sm font-bold text-primary">{item.step}</span>
                  </div>
                  <div className="pt-1.5 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* What we need */}
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-primary" />
              <h2 className="font-heading font-semibold text-[var(--text-primary)] text-sm">What we need from you</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              {[
                { icon: "🔑", text: "Your account login credentials (shared securely, deleted after completion)" },
                { icon: "🌐", text: "Your server / region" },
                { icon: "📝", text: "Any specific preferences or notes for the booster" },
              ].map((item) => (
                <div key={item.text} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                  <span className="text-base leading-5 shrink-0">{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>
          </div>

          {/* Reviews */}
          {reviews.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="font-heading font-bold text-[var(--text-primary)] text-lg">Customer reviews</h2>
                {totalRatingValue > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-400/10 border border-yellow-400/20">
                    <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-semibold text-yellow-400">{totalRatingValue.toFixed(1)}</span>
                    <span className="text-xs text-[var(--text-muted)]">({totalReviewCount})</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-primary/15 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${i <= review.rating ? "text-yellow-400 fill-yellow-400" : "text-[var(--text-muted)]"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-[var(--text-muted)]">
                        {(review.reviewer as { display_name: string | null } | null)?.display_name ?? "Anonymous"}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: configurator + trust */}
        <div>
          <div className="sticky top-24 space-y-4">
            {/* Mini cart */}
            <CartPreview />

            <ServiceConfigurator service={service} game={game} categorySlug={categorySlug} />

            {/* Trust block */}
            <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-elevated)] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-blue-400/10 flex items-center justify-center shrink-0">
                  <RefreshCw className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Refund policy</p>
                  <p className="text-xs text-[var(--text-muted)]">Full refund if the order is not completed</p>
                </div>
              </div>
              <div className="w-full h-px bg-[var(--border-subtle)]" />
              <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-elevated)] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageCircle className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Support</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    Questions?{" "}
                    <Link href="/support" className="text-primary hover:underline font-medium">
                      Chat with us
                    </Link>
                  </p>
                </div>
              </div>
              <div className="w-full h-px bg-[var(--border-subtle)]" />
              <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--bg-elevated)] transition-colors">
                <div className="w-8 h-8 rounded-lg bg-green-400/10 flex items-center justify-center shrink-0">
                  <CreditCard className="h-3.5 w-3.5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">Secure payment</p>
                  <p className="text-xs text-[var(--text-muted)]">Processed by Whop · Stripe · PayPal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
