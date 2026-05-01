import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import StaticPagesClient from "./static-pages-client";

export const metadata: Metadata = { title: "Static pages" };
export const dynamic = "force-dynamic";

type PageRow = { id: string; slug: string; title: string; content: string; is_published: boolean; updated_at: string };

export default async function StaticPagesPage() {
  const admin = createAdminClient();
  const { data: pages } = await admin
    .from("static_pages")
    .select("id, slug, title, content, is_published, updated_at")
    .order("slug") as unknown as { data: PageRow[] | null };

  // Seed defaults if empty
  const defaults = [
    { slug: "faq", title: "FAQ", content: "# Frequently asked questions\n\nContent coming soon...", is_published: true },
    { slug: "tos", title: "Terms of service", content: "# Terms of service\n\nContent coming soon...", is_published: true },
    { slug: "privacy", title: "Privacy policy", content: "# Privacy policy\n\nContent coming soon...", is_published: true },
  ];

  return <StaticPagesClient pages={pages ?? []} defaults={defaults} />;
}
