import { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://boosting-self.vercel.app";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/games`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/boosters`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/reviews`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/leaderboard`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/how-it-works`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/faq`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/apply`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/tos`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const supabase = await createClient();

    const { data: games } = await supabase
      .from("games")
      .select("id, slug, updated_at")
      .eq("is_active", true);

    const gameRoutes: MetadataRoute.Sitemap = (games ?? []).map((g) => ({
      url: `${baseUrl}/games/${(g as { slug: string; updated_at: string | null }).slug}`,
      lastModified: (g as { updated_at: string | null }).updated_at
        ? new Date((g as { updated_at: string }).updated_at)
        : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    const categoryRoutes: MetadataRoute.Sitemap = [];
    const serviceRoutes: MetadataRoute.Sitemap = [];
    for (const game of games ?? []) {
      const gameSlug = (game as { slug: string }).slug;
      const { data: categories } = await supabase
        .from("service_categories")
        .select("id, slug, updated_at")
        .eq("game_id", (game as { id: string }).id)
        .eq("is_active", true);
      for (const cat of categories ?? []) {
        categoryRoutes.push({
          url: `${baseUrl}/games/${gameSlug}/${(cat as { slug: string }).slug}`,
          lastModified: (cat as { updated_at: string | null }).updated_at
            ? new Date((cat as { updated_at: string }).updated_at)
            : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.8,
        });
        const { data: services } = await supabase
          .from("services")
          .select("slug, updated_at")
          .eq("game_id", (game as { id: string }).id)
          .eq("category_id", (cat as { id: string }).id)
          .eq("is_active", true);
        for (const s of services ?? []) {
          serviceRoutes.push({
            url: `${baseUrl}/games/${gameSlug}/${(cat as { slug: string }).slug}/${(s as { slug: string }).slug}`,
            lastModified: (s as { updated_at: string | null }).updated_at
              ? new Date((s as { updated_at: string }).updated_at)
              : new Date(),
            changeFrequency: "weekly" as const,
            priority: 0.7,
          });
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: workers } = await (supabase as any)
      .from("workers")
      .select("id, slug, updated_at")
      .eq("is_verified", true)
      .eq("is_active", true) as { data: { id: string; slug: string | null; updated_at: string | null }[] | null };
    const boosterRoutes: MetadataRoute.Sitemap = (workers ?? []).map((w) => ({
      url: `${baseUrl}/boosters/${w.slug ?? w.id}`,
      lastModified: w.updated_at ? new Date(w.updated_at) : new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }));

    return [...staticRoutes, ...gameRoutes, ...categoryRoutes, ...serviceRoutes, ...boosterRoutes];
  } catch {
    return staticRoutes;
  }
}
