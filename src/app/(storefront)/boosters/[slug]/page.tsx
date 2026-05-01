import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { Star, ArrowLeft } from "lucide-react";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://boosting-self.vercel.app";

type WorkerRow = {
  id: string;
  slug: string | null;
  bio: string | null;
  deposit_paid: number | null;
  profile_photo_url: string | null;
  average_rating: number | null;
  total_orders_completed: number | null;
  total_ratings: number | null;
  profile: { display_name: string | null; avatar_url: string | null } | null;
  tier: { name: string | null; color: string | null } | null;
};

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: { display_name: string | null; avatar_url: string | null } | null;
};

const WORKER_SELECT =
  "id, slug, bio, deposit_paid, profile_photo_url, average_rating, total_orders_completed, total_ratings, profile:profiles(display_name, avatar_url), tier:worker_tiers(name, color)";

async function findWorker(supabase: ReturnType<typeof createAdminClient>, slugOrId: string): Promise<WorkerRow | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  // Try by slug first
  const { data: bySlug } = await db
    .from("workers")
    .select(WORKER_SELECT)
    .eq("slug", slugOrId)
    .eq("is_verified", true)
    .eq("is_active", true)
    .maybeSingle() as { data: WorkerRow | null };

  if (bySlug) return bySlug;

  // Fallback: try by UUID for backward compatibility with old links
  const { data: byId } = await db
    .from("workers")
    .select(WORKER_SELECT)
    .eq("id", slugOrId)
    .eq("is_verified", true)
    .eq("is_active", true)
    .maybeSingle() as { data: WorkerRow | null };

  return byId ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data } = await db
    .from("workers")
    .select("slug, profile:profiles(display_name)")
    .eq("slug", slug)
    .eq("is_verified", true)
    .eq("is_active", true)
    .maybeSingle() as { data: { slug: string | null; profile: { display_name: string | null } | null } | null };

  const worker = data;
  const name = worker?.profile?.display_name ?? "Booster";
  const canonicalSlug = worker?.slug ?? slug;
  const description = `View ${name}'s booster profile, completed orders, and customer reviews on BoostPlatform.`;

  return {
    title: `${name} | Boosters`,
    description,
    openGraph: {
      title: `${name} | BoostPlatform`,
      description,
      type: "profile",
      url: `${appUrl}/boosters/${canonicalSlug}`,
    },
    alternates: { canonical: `${appUrl}/boosters/${canonicalSlug}` },
  };
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i <= rating ? "text-orange-400 fill-orange-400" : "text-[var(--text-muted)]"}`}
        />
      ))}
    </div>
  );
}

export default async function BoosterDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createAdminClient();

  const worker = await findWorker(supabase, slug);
  if (!worker) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reviewsData } = await (supabase as any)
    .from("order_reviews")
    .select("id, rating, comment, created_at, reviewer:profiles(display_name, avatar_url)")
    .eq("worker_id", worker.id)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(20);

  const reviews = (reviewsData as ReviewRow[] | null) ?? [];
  const name = worker.profile?.display_name ?? "Booster";
  const avatar = worker.profile_photo_url ?? worker.profile?.avatar_url;
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const tierColor = (worker.tier?.color as string) || "var(--color-primary)";

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Link
        href="/boosters"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        All boosters
      </Link>

      <div className="flex flex-col sm:flex-row gap-6 mb-10">
        <div
          className="w-24 h-24 rounded-full bg-[var(--bg-elevated)] border-2 overflow-hidden flex items-center justify-center text-2xl font-semibold text-[var(--text-secondary)] flex-shrink-0"
          style={{ borderColor: tierColor }}
        >
          {avatar ? (
            <Image src={avatar} alt={name} width={96} height={96} className="object-cover w-full h-full" />
          ) : (
            initials
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-2xl font-semibold text-[var(--text-primary)]">{name}</h1>
          {worker.tier?.name && (
            <span
              className="inline-block mt-1 px-2.5 py-0.5 rounded text-sm font-medium"
              style={{ backgroundColor: `${tierColor}20`, color: tierColor }}
            >
              {worker.tier.name}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-4 mt-3">
            {worker.average_rating != null && worker.average_rating > 0 && (
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-orange-400 fill-orange-400" />
                <span className="font-medium">{worker.average_rating.toFixed(1)}</span>
                {worker.total_ratings != null && worker.total_ratings > 0 && (
                  <span className="text-sm text-[var(--text-muted)]">({worker.total_ratings} reviews)</span>
                )}
              </div>
            )}
            {worker.total_orders_completed != null && worker.total_orders_completed > 0 && (
              <span className="text-sm text-[var(--text-muted)]">{worker.total_orders_completed} orders completed</span>
            )}
            {(worker.deposit_paid ?? 0) > 0 && (
              <span className="text-sm text-[var(--text-muted)]">Deposit: \${worker.deposit_paid!.toFixed(2)}</span>
            )}
          </div>
          {worker.bio && (
            <p className="text-[var(--text-secondary)] mt-4 leading-relaxed whitespace-pre-wrap">{worker.bio}</p>
          )}
        </div>
      </div>

      <section>
        <h2 className="font-heading text-lg font-semibold text-[var(--text-primary)] mb-4">
          Customer reviews
        </h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-6">No public reviews yet.</p>
        ) : (
          <ul className="space-y-4">
            {reviews.map((r) => {
              const reviewerName = r.reviewer?.display_name ?? "Anonymous";
              const reviewerInitials = reviewerName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
              return (
                <li
                  key={r.id}
                  className="p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]"
                >
                  <StarRating rating={r.rating} />
                  {r.comment && (
                    <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                      &ldquo;{r.comment}&rdquo;
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-4">
                    <div className="w-8 h-8 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-xs font-semibold text-[var(--text-secondary)]">
                      {reviewerInitials}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[var(--text-primary)]">{reviewerName}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {new Date(r.created_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
