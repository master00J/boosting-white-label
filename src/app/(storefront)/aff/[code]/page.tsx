import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AffiliateLandingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const admin = createAdminClient();
  const { data: affiliate } = await admin
    .from("affiliates")
    .select("id, is_active, cookie_days")
    .eq("affiliate_code", code)
    .single() as unknown as { data: { id: string; is_active: boolean; cookie_days: number } | null };

  if (affiliate?.is_active) {
    // Set affiliate cookie
    const cookieStore = await cookies();
    const maxAge = (affiliate.cookie_days ?? 30) * 24 * 60 * 60;
    cookieStore.set("aff", code, {
      maxAge,
      path: "/",
      sameSite: "lax",
      httpOnly: false, // readable by client for tracking
    });

    // Fire click tracking (fire-and-forget via admin client)
    await admin.from("affiliate_clicks").insert({
      affiliate_id: affiliate.id,
      referrer: null,
    });

    // Increment clicks
    const { data: current } = await admin
      .from("affiliates")
      .select("total_clicks")
      .eq("id", affiliate.id)
      .single() as unknown as { data: { total_clicks: number } | null };

    await admin
      .from("affiliates")
      .update({ total_clicks: (current?.total_clicks ?? 0) + 1 })
      .eq("id", affiliate.id);
  }

  redirect("/");
}
