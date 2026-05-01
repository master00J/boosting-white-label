import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import ActivityClient from "./activity-client";

export const metadata: Metadata = { title: "Activity log" };
export const dynamic = "force-dynamic";

type CronLogRow = {
  id: string;
  job_name: string;
  status: string;
  processed: number;
  errors: number;
  message: string;
  details: Record<string, unknown> | null;
  ran_at: string;
};

export default async function ActivityPage() {
  const admin = createAdminClient();

  const { data: cronLogs } = await admin
    .from("cron_logs")
    .select("id, job_name, status, processed, errors, message, details, ran_at")
    .order("ran_at", { ascending: false })
    .limit(100) as unknown as { data: CronLogRow[] | null };

  return <ActivityClient cronLogs={cronLogs ?? []} />;
}
