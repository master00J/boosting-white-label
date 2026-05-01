import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import AnnouncementsClient from "./announcements-client";

export const metadata: Metadata = { title: "Announcements" };
export const dynamic = "force-dynamic";

type AnnouncementRow = { id: string; title: string; content: string; type: string; is_active: boolean; created_at: string };

export default async function AnnouncementsPage() {
  const admin = createAdminClient();
  const { data: announcements } = await admin
    .from("announcements")
    .select("id, title, content, type, is_active, created_at")
    .order("created_at", { ascending: false }) as unknown as { data: AnnouncementRow[] | null };

  return <AnnouncementsClient announcements={announcements ?? []} />;
}
