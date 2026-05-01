import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { JsonLdBreadcrumb } from "@/components/seo/json-ld";

type GameRow = Database["public"]["Tables"]["games"]["Row"] & {
  config?: { has_account_builder?: boolean; accent_color?: string } | null;
};
type ServiceCategoryRow = Database["public"]["Tables"]["service_categories"]["Row"] & {
  image_url?: string | null;
};

export const dynamic = "force-dynamic";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://boosting-self.vercel.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: game } = await supabase
    .from("games")
    .select("name, meta_title, meta_description, banner_url, logo_url")
    .eq("slug", slug)
    .single() as unknown as { data: Pick<GameRow, "name" | "meta_title" | "meta_description" | "banner_url" | "logo_url"> | null; error: unknown };

  const title = game?.meta_title ?? (game?.name ? `${game.name} Boosting` : "Game");
  const description =
    game?.meta_description ??
    (game?.name
      ? `Professional ${game.name} boosting services. Fast, safe, and 100% manual by verified players. Order now.`
      : undefined);
  const ogImage = game?.banner_url ?? game?.logo_url ?? "/og-image.png";
  const imageUrl = ogImage.startsWith("http") ? ogImage : `${baseUrl}${ogImage.startsWith("/") ? "" : "/"}${ogImage}`;
  const url = `${baseUrl}/games/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
  };
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: game } = await supabase
    .from("games")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single() as unknown as { data: GameRow | null; error: unknown };

  if (!game) notFound();

  // Fetch categories for this specific game + count services per category
  const [{ data: categories }, { data: serviceCounts }] = await Promise.all([
    db
      .from("service_categories")
      .select("id, name, slug, icon, image_url")
      .eq("game_id", game.id)
      .eq("is_active", true)
      .order("sort_order") as Promise<{ data: Pick<ServiceCategoryRow, "id" | "name" | "slug" | "icon" | "image_url">[] | null; error: unknown }>,
    db
      .from("services")
      .select("category_id")
      .eq("game_id", game.id)
      .eq("is_active", true) as Promise<{ data: { category_id: string | null }[] | null }>,
  ]);

  const countMap: Record<string, number> = {};
  for (const s of serviceCounts ?? []) {
    if (s.category_id) countMap[s.category_id] = (countMap[s.category_id] ?? 0) + 1;
  }

  // Only show categories that have at least one service for this game
  const activeCategories = (categories ?? []).filter((c) => (countMap[c.id] ?? 0) > 0);

  const accentColor = (game.config as { accent_color?: string } | null)?.accent_color ?? null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <JsonLdBreadcrumb items={[
        { name: "Games", url: `${baseUrl}/games` },
        { name: game.name, url: `${baseUrl}/games/${slug}` },
      ]} />
      {/* Breadcrumb */}
      <Link
        href="/games"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        All games
      </Link>

      {/* Game header */}
      <div className="relative rounded-2xl overflow-hidden mb-12 h-48 sm:h-64 bg-[var(--bg-elevated)]">
        {game.banner_url && (
          <Image src={game.banner_url} alt={game.name} fill className="object-cover opacity-70" />
        )}
        {/* Accent-color overlay or default */}
        <div
          className="absolute inset-0"
          style={accentColor
            ? { background: `linear-gradient(to right, ${accentColor}dd 0%, ${accentColor}66 50%, transparent 100%)` }
            : { background: "linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)" }
          }
        />
        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--bg-primary)] to-transparent" />

        <div className="absolute inset-0 flex items-end p-6 sm:p-8">
          <div className="flex items-end gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-black/50 backdrop-blur border border-white/10 flex items-center justify-center overflow-hidden shadow-xl flex-shrink-0">
              {game.logo_url ? (
                <Image src={game.logo_url} alt={game.name} width={80} height={80} className="object-cover" />
              ) : (
                <span className="text-3xl">🎮</span>
              )}
            </div>
            <div>
              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white drop-shadow-md">{game.name}</h1>
              {game.short_description && (
                <p className="text-white/70 mt-1 text-sm sm:text-base max-w-lg">
                  {game.short_description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account Builder CTA — only for games that explicitly enable it */}
      {(game.config as { has_account_builder?: boolean } | null)?.has_account_builder && (
        <Link
          href={`/games/${slug}/builder`}
          className="mb-8 flex items-center gap-4 p-5 rounded-2xl bg-primary/10 border border-primary/30 hover:bg-primary/15 transition-colors group"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
            🛠️
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-[var(--text-primary)]">Account Builder</h3>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">Build your entire account in one place — skills, quests, and more</p>
          </div>
          <ChevronRight className="h-5 w-5 text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Category grid */}
      {activeCategories.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <p className="font-medium">Coming soon</p>
          <p className="text-sm mt-1">Services for this game will be added shortly.</p>
        </div>
      ) : (
        <>
          <div className="mb-8">
            <h2 className="font-heading text-2xl font-semibold text-white">Choose a category</h2>
            <p className="text-[var(--text-muted)] text-sm mt-1">Select a category to browse available services.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeCategories.map((cat) => (
              <CategoryCard
                key={cat.id}
                cat={cat}
                gameSlug={slug}
                serviceCount={countMap[cat.id] ?? 0}
                accentColor={accentColor}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CategoryCard({
  cat,
  gameSlug,
  serviceCount,
  accentColor,
}: {
  cat: { id: string; name: string; slug: string; icon: string | null; image_url?: string | null };
  gameSlug: string;
  serviceCount: number;
  accentColor: string | null;
}) {
  return (
    <Link
      href={`/games/${gameSlug}/${cat.slug}`}
      className="group relative overflow-hidden rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={accentColor ? { ["--hover-border" as string]: `${accentColor}66` } : undefined}
      onMouseEnter={undefined}
    >
      <style>{accentColor ? `a:hover { border-color: ${accentColor}66; }` : ""}</style>

      {/* Image area */}
      <div className="relative h-40 bg-[var(--bg-elevated)] overflow-hidden flex items-center justify-center">
        {cat.image_url ? (
          <Image
            src={cat.image_url}
            alt={cat.name}
            fill
            className="object-contain p-4 group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-6xl opacity-20 group-hover:opacity-30 transition-opacity">
              {cat.icon ?? "🎮"}
            </span>
          </div>
        )}
        {/* Accent gradient at bottom */}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-transparent to-transparent"
          style={accentColor ? { background: `linear-gradient(to top, var(--bg-card) 0%, ${accentColor}22 60%, transparent 100%)` } : undefined}
        />
      </div>

      {/* Content */}
      <div className="p-5 pt-3">
        <div className="flex items-center justify-between">
          <div>
            <h3
              className="font-heading font-semibold text-[var(--text-primary)] transition-colors"
              style={accentColor ? undefined : undefined}
            >
              {cat.name}
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {serviceCount} service{serviceCount !== 1 ? "s" : ""}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
        </div>
      </div>

      {/* Accent bottom bar */}
      {accentColor && (
        <div
          className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: accentColor }}
        />
      )}
    </Link>
  );
}
