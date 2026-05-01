import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import { ArrowLeft } from "lucide-react";
import AccountBuilderClient from "./account-builder-client";

export const dynamic = "force-dynamic";

type GameRow = Database["public"]["Tables"]["games"]["Row"];
type ServiceRow = Database["public"]["Tables"]["services"]["Row"];
type CategoryRow = Database["public"]["Tables"]["service_categories"]["Row"];

type ServicePartial = Pick<ServiceRow, "id" | "name" | "slug" | "base_price" | "price_per_unit" | "min_quantity" | "max_quantity" | "form_config" | "price_matrix"> & { category_id: string };
type CategoryPartial = Pick<CategoryRow, "id" | "name" | "slug" | "icon"> & { sort_order?: number };

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: game } = await supabase
    .from("games")
    .select("name")
    .eq("slug", slug)
    .single() as unknown as { data: Pick<GameRow, "name"> | null };
  return { title: game ? `Account Builder — ${game.name}` : "Account Builder" };
}

export default async function AccountBuilderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const db = supabase as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: unknown) => {
          eq: (c: string, v: unknown) => { order: (c: string, o?: { ascending: boolean }) => Promise<{ data: CategoryPartial[] | ServicePartial[] | null }> };
        };
      };
    };
  };

  const { data: game } = await supabase
    .from("games")
    .select("id, name, slug, logo_url")
    .eq("slug", slug)
    .eq("is_active", true)
    .single() as unknown as { data: Pick<GameRow, "id" | "name" | "slug" | "logo_url"> | null };

  if (!game) notFound();

  const [
    { data: categories },
    { data: services },
  ] = await Promise.all([
    db.from("service_categories").select("id, name, slug, icon, sort_order").eq("game_id", game.id).eq("is_active", true).order("sort_order"),
    db.from("services").select("id, name, slug, base_price, price_per_unit, min_quantity, max_quantity, form_config, price_matrix, category_id").eq("game_id", game.id).eq("is_active", true).order("sort_order"),
  ]);

  const catList = (categories ?? []) as CategoryPartial[];
  const catMap = new Map(catList.map((c) => [c.id, c]));
  const servicesByCategory: Record<string, ServicePartial[]> = {};
  for (const s of (services ?? []) as ServicePartial[]) {
    const catSlug = catMap.get(s.category_id)?.slug ?? "other";
    if (!servicesByCategory[catSlug]) servicesByCategory[catSlug] = [];
    servicesByCategory[catSlug].push(s);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href={`/games/${slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {game.name}
      </Link>

      <AccountBuilderClient
        game={game}
        categories={catList}
        servicesByCategory={servicesByCategory}
      />
    </div>
  );
}
