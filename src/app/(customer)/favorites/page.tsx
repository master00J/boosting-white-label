import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Heart, ArrowRight, Gamepad2 } from "lucide-react";

export const metadata: Metadata = { title: "My Favorites" };

type GameRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  short_description: string | null;
};

export default async function FavoritesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/favorites");

  const { data: rows } = await supabase
    .from("user_favorites")
    .select("game_id")
    .eq("profile_id", user.id) as { data: { game_id: string }[] | null };

  const gameIds = (rows ?? []).map((r) => r.game_id);
  let games: GameRow[] = [];

  if (gameIds.length > 0) {
    const { data } = await supabase
      .from("games")
      .select("id, name, slug, logo_url, short_description")
      .in("id", gameIds)
      .eq("is_active", true);
    games = (data as GameRow[]) ?? [];
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Saved</p>
        <h1 className="font-heading text-2xl font-semibold">My Favorites</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Games you saved for later. Click through to view services and order.
        </p>
      </div>

      {games.length === 0 ? (
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] p-12 text-center">
          <Heart className="h-12 w-12 text-[var(--text-muted)] mx-auto mb-4 opacity-60" />
          <p className="font-medium text-[var(--text-secondary)]">No favorites yet</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Save games from the storefront by clicking the heart on a game card.
          </p>
          <Link
            href="/games"
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Gamepad2 className="h-4 w-4" />
            Browse games
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map((game) => (
            <Link
              key={game.id}
              href={`/games/${game.slug}`}
              className="group flex items-center gap-4 p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-primary/30 transition-all"
            >
              <div className="w-14 h-14 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center overflow-hidden shrink-0">
                {game.logo_url ? (
                  <Image src={game.logo_url} alt={game.name} width={56} height={56} className="object-cover w-full h-full" />
                ) : (
                  <Gamepad2 className="h-7 w-7 text-[var(--text-muted)]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-[var(--text-primary)] group-hover:text-primary truncate transition-colors">
                  {game.name}
                </p>
                {game.short_description && (
                  <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-0.5">{game.short_description}</p>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-primary flex-shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      )}

      {games.length > 0 && (
        <div className="pt-2">
          <Link href="/games" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
            View all games <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
