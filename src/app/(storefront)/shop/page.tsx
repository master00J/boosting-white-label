import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { Store, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "GIM Shop" };

type ShopRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export default async function ShopListPage() {
  const admin = createAdminClient();
  const db = admin as unknown as { from: (t: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> };

  const { data: shops } = await db
    .from("gim_shops")
    .select("id, name, slug, description")
    .eq("is_active", true)
    .order("created_at", { ascending: true }) as { data: ShopRow[] | null };

  const list = shops ?? [];

  return (
    <main className="max-w-4xl mx-auto px-4 py-10 sm:py-16 space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider">Marketplace</p>
        <h1 className="font-heading text-3xl sm:text-4xl font-bold">GIM Shop</h1>
        <p className="text-muted-foreground max-w-xl">
          Browse items for sale from our group ironman team. Set prices, instant delivery via our boosters.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <Store className="h-12 w-12 text-muted-foreground/30" />
          <div>
            <p className="text-base font-medium">No shops available yet</p>
            <p className="text-sm text-muted-foreground mt-1">Check back soon!</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map((shop) => (
            <Link
              key={shop.id}
              href={`/shop/${shop.slug}`}
              className="group rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 hover:border-primary/40 hover:bg-[var(--bg-card-hover,var(--bg-card))] transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold group-hover:text-primary transition-colors">{shop.name}</p>
                    {shop.description && (
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{shop.description}</p>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
