import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import { ArrowRight, Gamepad2 } from "lucide-react";
import FavoriteButton from "@/components/storefront/favorite-button";

type GameRow = Pick<
  Database["public"]["Tables"]["games"]["Row"],
  "id" | "name" | "slug" | "logo_url" | "banner_url" | "short_description" | "is_featured"
>;

export const metadata: Metadata = {
  title: "Games",
  description: "Browse all available games and discover our boosting services.",
};

export default async function GamesPage() {
  const supabase = createAdminClient();

  const { data: games } = await supabase
    .from("games")
    .select("id, name, slug, logo_url, banner_url, short_description, is_featured")
    .eq("is_active", true)
    .order("sort_order", { ascending: true }) as { data: GameRow[] | null };

  const allGames = games ?? [];
  const featured = allGames.filter((g) => g.is_featured);
  const rest = allGames.filter((g) => !g.is_featured);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Catalog</p>
        <h1 className="font-heading text-4xl font-semibold text-white">All Games</h1>
        <p className="text-[var(--text-secondary)] mt-2">
          Choose your game and browse available boosting services.
        </p>
      </div>

      {allGames.length === 0 ? (
        <div className="text-center py-24 text-[var(--text-muted)]">
          <Gamepad2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Coming soon</p>
          <p className="text-sm mt-1">We&apos;re adding games shortly.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Featured games — large hero cards */}
          {featured.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">Featured</p>
              <div className={`grid gap-5 ${featured.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
                {featured.map((game) => (
                  <FeaturedGameCard key={game.id} game={game} />
                ))}
              </div>
            </section>
          )}

          {/* All other games — compact grid */}
          {rest.length > 0 && (
            <section>
              {featured.length > 0 && (
                <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">All games</p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {rest.map((game) => (
                  <CompactGameCard key={game.id} game={game} />
                ))}
              </div>
            </section>
          )}

          {/* If no featured — show all in standard grid */}
          {featured.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {allGames.map((game) => (
                <StandardGameCard key={game.id} game={game} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Large hero-style card for featured games */
function FeaturedGameCard({ game }: { game: GameRow }) {
  return (
    <div className="group relative">
      <FavoriteButton gameId={game.id} className="absolute top-4 right-4 z-10" size="sm" />
      <Link
        href={`/games/${game.slug}`}
        className="block relative overflow-hidden rounded-2xl border border-[var(--border-default)] hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10"
        style={{ minHeight: 260 }}
      >
        {/* Full banner background */}
        <div className="absolute inset-0">
          {game.banner_url ? (
            <Image
              src={game.banner_url}
              alt={game.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-purple-600/30 to-[var(--bg-card)]" />
          )}
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        </div>

        {/* Featured badge */}
        <div className="absolute top-4 left-4">
          <span className="px-2.5 py-1 rounded-full bg-yellow-400/15 border border-yellow-400/40 text-yellow-400 text-[10px] font-bold uppercase tracking-wider">
            Featured
          </span>
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end gap-4">
          {/* Logo */}
          <div className="w-16 h-16 rounded-xl bg-black/60 backdrop-blur border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xl">
            {game.logo_url ? (
              <Image src={game.logo_url} alt={game.name} width={64} height={64} className="object-cover" />
            ) : (
              <span className="text-2xl">🎮</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading text-xl sm:text-2xl font-bold text-white group-hover:text-primary transition-colors truncate">
              {game.name}
            </h2>
            {game.short_description && (
              <p className="text-sm text-white/60 mt-0.5 line-clamp-1">{game.short_description}</p>
            )}
            <div className="flex items-center gap-1.5 mt-2 text-sm text-primary font-medium">
              View services
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

/** Compact card for the secondary games grid */
function CompactGameCard({ game }: { game: GameRow }) {
  return (
    <div className="group relative">
      <FavoriteButton gameId={game.id} className="absolute top-2 right-2 z-10" size="sm" />
      <Link
        href={`/games/${game.slug}`}
        className="block overflow-hidden rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-primary/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
      >
        {/* Banner thumbnail */}
        <div className="relative h-24 bg-[var(--bg-elevated)] overflow-hidden">
          {game.banner_url ? (
            <Image
              src={game.banner_url}
              alt={game.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] to-transparent" />
          {/* Logo */}
          <div className="absolute bottom-2 left-2 w-9 h-9 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center justify-center overflow-hidden shadow-md">
            {game.logo_url ? (
              <Image src={game.logo_url} alt={game.name} width={36} height={36} className="object-cover" />
            ) : (
              <span className="text-base">🎮</span>
            )}
          </div>
        </div>
        <div className="p-3">
          <h2 className="font-heading font-semibold text-sm text-[var(--text-primary)] group-hover:text-primary transition-colors line-clamp-1">
            {game.name}
          </h2>
          <div className="flex items-center gap-1 mt-1.5 text-xs text-primary font-medium">
            Browse
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Link>
    </div>
  );
}

/** Standard card — used when there are no featured games at all */
function StandardGameCard({ game }: { game: GameRow }) {
  return (
    <div className="group relative">
      <FavoriteButton gameId={game.id} className="absolute top-3 right-3 z-10" size="sm" />
      <Link
        href={`/games/${game.slug}`}
        className="block relative overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-primary/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
      >
        <div className="relative h-36 bg-gradient-to-br from-primary/20 to-purple-500/20 overflow-hidden">
          {game.banner_url ? (
            <Image
              src={game.banner_url}
              alt={game.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-purple-500/20 to-transparent" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-card)] via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 w-14 h-14 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] flex items-center justify-center overflow-hidden shadow-lg">
            {game.logo_url ? (
              <Image src={game.logo_url} alt={game.name} width={56} height={56} className="object-cover" />
            ) : (
              <span className="text-2xl">🎮</span>
            )}
          </div>
          {game.is_featured && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-[10px] font-semibold">
              FEATURED
            </div>
          )}
        </div>
        <div className="p-4 pt-2">
          <h2 className="font-heading font-semibold group-hover:text-primary transition-colors">
            {game.name}
          </h2>
          {game.short_description && (
            <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">
              {game.short_description}
            </p>
          )}
          <div className="flex items-center gap-1 mt-3 text-sm text-primary font-medium">
            View services
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Link>
    </div>
  );
}
