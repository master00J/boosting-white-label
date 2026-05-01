import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import EmailSettingsClient from "./email-settings-client";

export const metadata: Metadata = { title: "Email Settings" };
export const dynamic = "force-dynamic";

const KEYS = [
  "resend_api_key",
  "email_from_address",
  "email_from_name",
  "email_order_confirmed_enabled",
  "email_order_completed_enabled",
  "email_worker_approved_enabled",
  "email_ticket_created_enabled",
  "email_ticket_response_enabled",
];

export default async function EmailSettingsPage() {
  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", KEYS) as unknown as { data: { key: string; value: string }[] | null };

  const map = Object.fromEntries((settings ?? []).map((s) => [s.key, String(s.value)]));

  return <EmailSettingsClient initialSettings={map} />;
}
