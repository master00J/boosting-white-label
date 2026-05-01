import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { Star, ArrowRight } from "lucide-react";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://boosting-self.vercel.app";

export const metadata: Metadata = {
  title: "Meet our boosters",
  description:
    "Browse our verified OSRS boosters. See profiles, completed orders, and customer reviews. Every booster is hand-picked and verified.",
  openGraph: {
    title: "Meet our Boosters | BoostPlatform",
    description:
      "Browse our verified OSRS boosters. See profiles, completed orders, and customer reviews. Every booster is hand-picked and verified.",
    url: `${appUrl}/boosters`,
    type: "website",
  },
  alternates: { canonical: `${appUrl}/boosters` },
};

type WorkerRow = {
  id: string;
  slug: string | null;
  bio: string | null;
  profile_photo_url: string | null;
  show_on_boosters_page: boolean | null;
  average_rating: number | null;
  total_orders_completed: number | null;
  total_ratings: number | null;
  profile: { display_name: string | null; avatar_url: string | null } | null;
  tier: { name: string | null; color: string | null } | null;
};

function StarRating({ rating }: { rating: number }) {
  const r = Math.round(rating);
  return (
    <div className="flex items-center gap-1">
      <Star className="h-4 w-4 text-orange-400 fill-orange-400" />
      <span className="text-sm font-medium text-[var(--text-primary)]">{rating.toFixed(1)}</span>
      {r > 0 && r <= 5 && (
        <span className="text-xs text-[var(--text-muted)]">({r}/5)</span>
      )}
    </div>
  );
}

export default async function BoostersPage() {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: workers } = await db
    .from("workers")
    .select("id, slug, bio, profile_photo_url, show_on_boosters_page, average_rating, total_orders_completed, total_ratings, profile:profiles(display_name, avatar_url), tier:worker_tiers(name, color)")
    .eq("is_verified", true)
    .eq("is_active", true)
    .order("total_orders_completed", { ascending: false }) as { data: WorkerRow[] | null };

  const list = ((workers as WorkerRow[] | null) ?? []).filter(
    (w) => w.show_on_boosters_page !== false
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="font-heading text-3xl font-semibold text-[var(--text-primary)]">
          Meet our boosters
        </h1>
        <p className="text-[var(--text-secondary)] mt-1">
          Hand-picked, verified boosters. View profiles and customer reviews.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] p-12 text-center text-[var(--text-muted)]">
          <p className="font-medium">No boosters listed yet</p>
          <p className="text-sm mt-1">Check back later or browse our services.</p>
          <Link href="/games" className="inline-flex items-center gap-2 mt-4 text-[var(--color-primary)] font-medium hover:underline">
            Browse services <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map((w) => {
            const name = w.profile?.display_name ?? "Booster";
            const avatar = w.profile_photo_url ?? w.profile?.avatar_url;
            const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
            const tierColor = (w.tier?.color as string) || "var(--color-primary)";
            return (
              <Link
                key={w.id}
                href={`/boosters/${w.slug ?? w.id}`}
                className="group flex flex-col p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[var(--color-primary)]/30 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-16 h-16 rounded-full bg-[var(--bg-elevated)] border-2 overflow-hidden flex items-center justify-center text-lg font-semibold text-[var(--text-secondary)] flex-shrink-0"
                    style={{ borderColor: tierColor }}
                  >
                    {avatar ? (
                      <Image src={avatar} alt={name} width={64} height={64} className="object-cover w-full h-full" />
                    ) : (
                      initials
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-heading font-semibold text-[var(--text-primary)] group-hover:text-[var(--color-primary)] truncate">
                      {name}
                    </h2>
                    {w.tier?.name && (
                      <span
                        className="inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: `${tierColor}20`, color: tierColor }}
                      >
                        {w.tier.name}
                      </span>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {w.average_rating != null && w.average_rating > 0 && (
                        <StarRating rating={w.average_rating} />
                      )}
                      {w.total_orders_completed != null && w.total_orders_completed > 0 && (
                        <span className="text-xs text-[var(--text-muted)]">
                          {w.total_orders_completed} orders
                        </span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--color-primary)] flex-shrink-0 mt-2" />
                </div>
                {w.bio && (
                  <p className="text-sm text-[var(--text-secondary)] mt-4 line-clamp-2 leading-relaxed">
                    {w.bio}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
