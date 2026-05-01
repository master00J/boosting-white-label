import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import LootboxesClient from "./lootboxes-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lootboxes" };

export default async function LootboxesPage() {
  const admin = createAdminClient();

  const { data: setting } = (await admin
    .from("site_settings")
    .select("value")
    .eq("key", "lootbox_enabled")
    .maybeSingle()) as { data: { value: string } | null };

  if (!setting || setting.value !== "true") {
    redirect("/");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const { data: lootboxes } = await db
    .from("lootboxes")
    .select("*, lootbox_prizes(*)")
    .eq("is_active", true)
    .order("sort_order");

  return <LootboxesClient lootboxes={lootboxes ?? []} />;
}
