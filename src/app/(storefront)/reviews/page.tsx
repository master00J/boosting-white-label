import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Star, Quote } from "lucide-react";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://boosting-self.vercel.app";

export const metadata: Metadata = {
  title: "Customer Reviews",
  description:
    "Read verified customer reviews for BoostPlatform OSRS services. See what players say about our verified boosters.",
  openGraph: {
    title: "Customer Reviews | BoostPlatform",
    description:
      "Read verified customer reviews for BoostPlatform OSRS services. See what players say about our verified boosters.",
    url: `${appUrl}/reviews`,
    type: "website",
  },
  alternates: { canonical: `${appUrl}/reviews` },
};

type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: { display_name: string | null; avatar_url: string | null } | null;
  order: {
    game: { name: string; slug: string } | null;
    service: { name: string; slug: string; category: { slug: string } | null } | null;
  } | null;
};

export default async function ReviewsPage() {
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  const { data: reviews } = await db
    .from("order_reviews")
    .select(`
      id,
      rating,
      comment,
      created_at,
      reviewer:profiles(display_name, avatar_url),
      order:orders(
        game:games(name, slug),
        service:services(name, slug, category:service_categories(slug))
      )
    `)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(100) as { data: ReviewRow[] | null };

  const list = reviews ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">

      <div className="mb-10">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Trust</p>
        <h1 className="font-heading text-4xl font-semibold text-[var(--text-primary)]">
          Customer Reviews
        </h1>
        <p className="text-[var(--text-secondary)] mt-2">
          What our customers say about our boosters and services.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] p-12 text-center text-[var(--text-muted)]">
          <Quote className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">No public reviews yet</p>
          <p className="text-sm mt-1">Reviews will appear here after customers rate their orders.</p>
          <Link href="/games" className="inline-flex items-center gap-2 mt-4 text-primary font-medium hover:underline">
            Browse services
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {list.map((review) => {
            const displayName = (review.reviewer as { display_name: string | null } | null)?.display_name ?? "Customer";
            const game = review.order?.game as { name: string; slug: string } | null;
            const service = review.order?.service as { name: string; slug: string; category: { slug: string } | null } | null;
            const gameSlug = game?.slug;
            const categorySlug = service?.category?.slug;
            const serviceSlug = service?.slug;
            const serviceLink = gameSlug && categorySlug && serviceSlug ? `/games/${gameSlug}/${categorySlug}/${serviceSlug}` : null;
            return (
              <article
                key={review.id}
                className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] p-6"
              >
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i <= review.rating ? "text-amber-400 fill-amber-400" : "text-[var(--text-muted)]"}`}
                    />
                  ))}
                  <span className="text-sm font-medium text-[var(--text-primary)] ml-1">{review.rating}/5</span>
                  <span className="text-sm text-[var(--text-muted)]">·</span>
                  <span className="text-sm text-[var(--text-muted)]">
                    {new Date(review.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {(game || service) && (
                  <p className="text-sm text-[var(--text-muted)] mb-2">
                    {serviceLink && service && game ? (
                      <Link
                        href={serviceLink}
                        className="hover:text-primary transition-colors"
                      >
                        {service.name} · {game.name}
                      </Link>
                    ) : (
                      <span>{service?.name ?? game?.name ?? ""}</span>
                    )}
                  </p>
                )}
                <p className="text-sm font-medium text-[var(--text-primary)] mb-2">{displayName}</p>
                {review.comment && (
                  <p className="text-[var(--text-secondary)] leading-relaxed">{review.comment}</p>
                )}
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-10 text-center">
        <Link href="/games" className="inline-flex items-center gap-2 text-primary font-medium hover:underline">
          Find a service
        </Link>
      </div>
    </div>
  );
}
