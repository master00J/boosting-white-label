import { createAdminClient } from "@/lib/supabase/admin";

export type CronJobName = "payouts" | "cleanup" | "loyalty" | "worker-tiers";
export type CronStatus = "success" | "error" | "partial";

export interface CronLogEntry {
  job_name: CronJobName;
  status: CronStatus;
  processed: number;
  errors: number;
  message: string;
  details?: Record<string, unknown>;
}

export async function logCronRun(entry: CronLogEntry): Promise<void> {
  try {
    const admin = createAdminClient();
    await (admin.from("cron_logs") as unknown as {
      insert: (v: unknown) => Promise<unknown>;
    }).insert({
      job_name: entry.job_name,
      status: entry.status,
      processed: entry.processed,
      errors: entry.errors,
      message: entry.message,
      details: entry.details ?? null,
      ran_at: new Date().toISOString(),
    });
  } catch {
    // Never throw from logger — just console
    console.error("[cron-logger] Failed to write log:", entry);
  }
}
