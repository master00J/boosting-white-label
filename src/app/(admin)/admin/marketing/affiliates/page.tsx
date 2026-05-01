import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import AffiliatesAdminClient from "./affiliates-admin-client";

export const metadata: Metadata = { title: "Affiliates" };
export const dynamic = "force-dynamic";

type Affiliate = {
  id: string;
  affiliate_code: string;
  company_name: string | null;
  website_url: string | null;
  commission_rate: number;
  cookie_days: number;
  total_clicks: number;
  total_conversions: number;
  total_earned: number;
  pending_balance: number;
  payout_minimum: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  profile: { display_name: string | null; email: string } | null;
};

export default async function AffiliatesPage() {
  const admin = createAdminClient();

  let affiliates: Affiliate[] = [];
  try {
    const { data } = await admin
      .from("affiliates")
      .select(
        "id, affiliate_code, company_name, website_url, commission_rate, cookie_days, total_clicks, total_conversions, total_earned, pending_balance, payout_minimum, is_active, notes, created_at, profile:profiles(display_name, email)"
      )
      .order("created_at", { ascending: false })
      .limit(500) as unknown as { data: Affiliate[] | null };
    affiliates = data ?? [];
  } catch (err) {
    console.error("[affiliates page] DB error:", err);
  }

  return <AffiliatesAdminClient affiliates={affiliates} />;
}
