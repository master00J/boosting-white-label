import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import ApplyForm from "./apply-form";

export const metadata: Metadata = {
  title: "Become a Booster",
  description: "Apply to join our team of verified boosters and earn money playing games.",
  openGraph: {
    title: "Become a Booster | BoostPlatform",
    description: "Apply to join our team of verified boosters and earn money playing games.",
    url: "/apply",
    type: "website",
  },
  alternates: { canonical: "/apply" },
};

export default async function ApplyPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  let discordUsername: string | null = null;

  if (user) {
    const [{ data: workerRaw }, { data: profile }] = await Promise.all([
      supabase
        .from("workers")
        .select("id, is_verified")
        .eq("profile_id", user.id)
        .single(),
      supabase
        .from("profiles")
        .select("discord_username")
        .eq("id", user.id)
        .single(),
    ]);

    discordUsername = (profile as { discord_username: string | null } | null)?.discord_username ?? null;
    const worker = workerRaw as { id: string; is_verified: boolean } | null;

    if (worker && !worker.is_verified) {
      return (
        <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center px-4">
          <div className="max-w-md w-full text-center space-y-4 p-8 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
            <div className="w-14 h-14 rounded-full bg-orange-400/10 border border-orange-400/20 flex items-center justify-center mx-auto">
              <span className="text-2xl">⏳</span>
            </div>
            <h1 className="font-heading text-xl font-semibold">Application pending</h1>
            <p className="text-sm text-[var(--text-muted)]">
              Your application has been submitted and is under review. We will contact you via Discord within 1–3 business days.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      );
    }
  }

  const { data: games } = await supabase
    .from("games")
    .select("id, name, slug, logo_url")
    .eq("is_active", true)
    .order("name");

  return <ApplyForm games={games ?? []} defaultDiscordUsername={discordUsername} />;
}
