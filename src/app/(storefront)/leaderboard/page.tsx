import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { Trophy, Star, Medal, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "Top boosters ranked by completed orders and customer ratings on BoostPlatform.",
  openGraph: {
    title: "Booster Leaderboard | BoostPlatform",
    description: "Top boosters ranked by completed orders and customer ratings on BoostPlatform.",
    url: "/leaderboard",
    type: "website",
  },
  alternates: { canonical: "/leaderboard" },
};

type WorkerRow = {
  id: string;
  slug: string | null;
  total_orders_completed: number | null;
  average_rating: number | null;
  total_ratings: number | null;
  profile_photo_url: string | null;
  profile: { display_name: string | null; avatar_url: string | null } | null;
  tier: { name: string | null; color: string | null } | null;
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
      <span className="text-sm font-medium text-[var(--text-primary)]">{rating.toFixed(1)}</span>
    </div>
  );
}

export default async function LeaderboardPage() {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: workers } = await db
    .from("workers")
    .select("id, slug, total_orders_completed, average_rating, total_ratings, profile_photo_url, profile:profiles(display_name, avatar_url), tier:worker_tiers(name, color)")
    .eq("is_verified", true)
    .eq("is_active", true)
    .order("total_orders_completed", { ascending: false })
    .limit(50) as { data: WorkerRow[] | null };

  const list = (workers ?? []).filter((w) => (w.total_orders_completed ?? 0) > 0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Community</p>
        <h1 className="font-heading text-4xl font-semibold text-[var(--text-primary)]">
          Booster Leaderboard
        </h1>
        <p className="text-[var(--text-secondary)] mt-2">
          Our top boosters ranked by completed orders and customer ratings.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] p-12 text-center text-[var(--text-muted)]">
          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">No rankings yet</p>
          <p className="text-sm mt-1">Complete orders to appear on the leaderboard.</p>
          <Link href="/boosters" className="inline-flex items-center gap-2 mt-4 text-primary font-medium hover:underline">
            Meet our boosters <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
          <ul className="divide-y divide-[var(--border-subtle)]">
            {list.map((w, index) => {
              const rank = index + 1;
              const name = w.profile?.display_name ?? "Booster";
              const avatar = w.profile_photo_url ?? w.profile?.avatar_url;
              const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
              const tierColor = (w.tier?.color as string) ?? "var(--color-primary)";
              const orders = w.total_orders_completed ?? 0;
              return (
                <li key={w.id}>
                  <Link
                    href={`/boosters/${w.slug ?? w.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--bg-elevated)] transition-colors"
                  >
                    <div className="w-10 flex justify-center flex-shrink-0">
                      {rank === 1 && <Medal className="h-8 w-8 text-amber-400" />}
                      {rank === 2 && <Medal className="h-8 w-8 text-zinc-300" />}
                      {rank === 3 && <Medal className="h-8 w-8 text-amber-600" />}
                      {rank > 3 && (
                        <span className="text-sm font-bold text-[var(--text-muted)]">#{rank}</span>
                      )}
                    </div>
                    <div
                      className="w-12 h-12 rounded-full border-2 overflow-hidden flex items-center justify-center text-sm font-semibold flex-shrink-0"
                      style={{ borderColor: tierColor }}
                    >
                      {avatar ? (
                        <Image src={avatar} alt={name} width={48} height={48} className="object-cover w-full h-full" />
                      ) : (
                        initials
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-heading font-semibold text-[var(--text-primary)] truncate">{name}</p>
                      {w.tier?.name && (
                        <span
                          className="inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: `${tierColor}20`, color: tierColor }}
                        >
                          {w.tier.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 flex-shrink-0">
                      {w.average_rating != null && w.average_rating > 0 && (
                        <StarRating rating={w.average_rating} />
                      )}
                      <span className="text-sm text-[var(--text-muted)]">
                        <span className="font-medium text-[var(--text-primary)]">{orders.toLocaleString()}</span> orders
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[var(--text-muted)] flex-shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/boosters" className="inline-flex items-center gap-2 text-primary font-medium hover:underline">
          View all boosters <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
