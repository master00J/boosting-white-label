import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { Search as SearchIcon, Gamepad2, Package } from "lucide-react";

export const metadata: Metadata = {
  title: "Search",
  description: "Search games and boosting services on BoostPlatform.",
  openGraph: {
    title: "Search | BoostPlatform",
    description: "Search games and boosting services on BoostPlatform.",
    url: "/search",
    type: "website",
  },
  alternates: { canonical: "/search" },
  robots: { index: false, follow: false },
};

type GameRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  short_description: string | null;
};

type ServiceRow = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  game: { name: string; slug: string; logo_url: string | null } | null;
  category: { slug: string } | null;
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const supabase = await createClient();

  let games: GameRow[] = [];
  let services: ServiceRow[] = [];

  if (query.length >= 2) {
    const [gamesRes, servicesRes] = await Promise.all([
      supabase
        .from("games")
        .select("id, name, slug, logo_url, short_description")
        .eq("is_active", true)
        .ilike("name", `%${query}%`)
        .order("sort_order", { ascending: true })
        .limit(20),
      supabase
        .from("services")
        .select("id, name, slug, image_url, game:games(name, slug, logo_url), category:service_categories(slug)")
        .eq("is_active", true)
        .ilike("name", `%${query}%`)
        .limit(20),
    ]);

    games = (gamesRes.data as GameRow[]) ?? [];
    services = (servicesRes.data as ServiceRow[]) ?? [];
  }

  const hasResults = games.length > 0 || services.length > 0;
  const showEmpty = query.length >= 2 && !hasResults;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold text-[var(--text-primary)]">
          Search
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Find games and boosting services. Enter at least 2 characters.
        </p>
      </div>

      {!query && (
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] p-12 text-center text-[var(--text-muted)]">
          <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Enter a search term</p>
          <p className="text-sm mt-1">Use the search bar in the header or add ?q= to the URL.</p>
          <Link href="/games" className="inline-flex items-center gap-2 mt-4 text-primary font-medium hover:underline">
            Browse all games
          </Link>
        </div>
      )}

      {showEmpty && (
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] p-12 text-center text-[var(--text-muted)]">
          <SearchIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">No results for &ldquo;{query}&rdquo;</p>
          <p className="text-sm mt-1">Try a different term or browse games.</p>
          <Link href="/games" className="inline-flex items-center gap-2 mt-4 text-primary font-medium hover:underline">
            Browse all games
          </Link>
        </div>
      )}

      {hasResults && (
        <div className="space-y-8">
          {services.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">
                Services ({services.length})
              </h2>
              <ul className="space-y-2">
                {services.map((svc) => {
                  const game = svc.game as { name: string; slug: string; logo_url: string | null } | null;
                  const category = svc.category as { slug: string } | null;
                  const href = game && category
                    ? `/games/${game.slug}/${category.slug}/${svc.slug}`
                    : `/games`;
                  const thumb = svc.image_url ?? game?.logo_url;
                  return (
                    <li key={svc.id}>
                      <Link
                        href={href}
                        className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-primary/30 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center overflow-hidden shrink-0">
                          {thumb ? (
                            <Image src={thumb} alt={svc.name} width={40} height={40} className="object-contain" />
                          ) : (
                            <Package className="h-5 w-5 text-[var(--text-muted)]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[var(--text-primary)] truncate">{svc.name}</p>
                          {game && (
                            <p className="text-xs text-[var(--text-muted)] truncate">{game.name}</p>
                          )}
                        </div>
                        <span className="text-xs text-primary font-medium shrink-0">View</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {games.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-primary mb-4">
                Games ({games.length})
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {games.map((game) => (
                  <li key={game.id}>
                    <Link
                      href={`/games/${game.slug}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-primary/30 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center overflow-hidden shrink-0">
                        {game.logo_url ? (
                          <Image src={game.logo_url} alt={game.name} width={48} height={48} className="object-cover w-full h-full" />
                        ) : (
                          <Gamepad2 className="h-6 w-6 text-[var(--text-muted)]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[var(--text-primary)] truncate">{game.name}</p>
                        {game.short_description && (
                          <p className="text-xs text-[var(--text-muted)] line-clamp-1">{game.short_description}</p>
                        )}
                      </div>
                      <span className="text-xs text-primary font-medium shrink-0">View</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
