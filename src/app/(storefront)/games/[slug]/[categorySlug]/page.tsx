import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import CategoryClient from "./category-client";
import { JsonLdBreadcrumb } from "@/components/seo/json-ld";

export const dynamic = "force-dynamic";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://boosting-self.vercel.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; categorySlug: string }>;
}): Promise<Metadata> {
  const { slug, categorySlug } = await params;
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data: game } = await supabase.from("games").select("id, name").eq("slug", slug).single() as unknown as { data: Pick<GameRow, "id" | "name"> | null };
  if (!game) return { title: "Services" };
  const { data: cat } = await db.from("service_categories").select("name, image_url").eq("slug", categorySlug).eq("game_id", game.id).single() as { data: { name: string; image_url: string | null } | null };
  if (!cat) return { title: "Services" };

  const title = `${cat.name} — ${game.name} Boosting`;
  const description = `Professional ${game.name} ${cat.name} boosting services. Fast, safe, and 100% manual by verified players. Order now and get started within the hour.`;
  const canonicalUrl = `${appUrl}/games/${slug}/${categorySlug}`;
  const ogImage = cat.image_url ?? "/og-image.png";

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
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

export default async function CategoryServicesPage({
  params,
}: {
  params: Promise<{ slug: string; categorySlug: string }>;
}) {
  const { slug, categorySlug } = await params;
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;

  type ServicePartial = Pick<ServiceRow,
    "id" | "name" | "slug" | "description" | "base_price" | "price_per_unit" |
    "min_quantity" | "max_quantity" | "form_config" | "price_matrix" |
    "is_featured" | "image_url"
  >;

  const { data: game } = await supabase
    .from("games")
    .select("id, name, slug, logo_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .single() as unknown as { data: Pick<GameRow, "id" | "name" | "slug" | "logo_url"> | null };

  if (!game) notFound();

  const { data: cat } = await db
    .from("service_categories")
    .select("id, name, slug, icon, image_url")
    .eq("slug", categorySlug)
    .eq("game_id", game.id)
    .eq("is_active", true)
    .single() as { data: { id: string; name: string; slug: string; icon: string | null; image_url: string | null } | null };

  if (!cat) notFound();

  const { data: services } = await supabase
    .from("services")
    .select("id, name, slug, description, base_price, price_per_unit, min_quantity, max_quantity, form_config, price_matrix, is_featured, image_url")
    .eq("game_id", game.id)
    .eq("category_id", cat.id)
    .eq("is_active", true)
    .order("sort_order") as unknown as { data: ServicePartial[] | null };

  return (
    <>
      <JsonLdBreadcrumb items={[
        { name: "Games", url: `${appUrl}/games` },
        { name: game.name, url: `${appUrl}/games/${slug}` },
        { name: cat.name, url: `${appUrl}/games/${slug}/${categorySlug}` },
      ]} />
      <CategoryClient
        game={game}
        category={cat}
        services={services ?? []}
      />
    </>
  );
}
