import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type GameRow = Pick<
  Database["public"]["Tables"]["games"]["Row"],
  "id" | "name" | "slug" | "logo_url" | "banner_url" | "short_description" | "is_featured"
>;

type ReviewResult = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer: { display_name: string | null; avatar_url: string | null } | null;
};

export async function GET() {
  try {
    const supabase = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    const [gamesResult, reviewsResult] = await Promise.all([
      supabase
        .from("games")
        .select("id, name, slug, logo_url, banner_url, short_description, is_featured")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(8) as unknown as Promise<{ data: GameRow[] | null }>,
      db
        .from("order_reviews")
        .select("id, rating, comment, created_at, reviewer:profiles(display_name, avatar_url)")
        .eq("is_public", true)
        .gte("rating", 4)
        .order("created_at", { ascending: false })
        .limit(6) as Promise<{ data: ReviewResult[] | null }>,
    ]);

    return NextResponse.json({
      games: gamesResult.data ?? [],
      reviews: reviewsResult.data ?? [],
    });
  } catch {
    return NextResponse.json({ games: [], reviews: [] });
  }
}
