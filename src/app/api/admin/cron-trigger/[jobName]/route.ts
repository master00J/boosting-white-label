import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";

const ALLOWED_JOBS = ["payouts", "cleanup", "loyalty", "worker-tiers"] as const;

/** POST: Admin manually triggers a cron job. Verifies admin session, then calls cron with server-side secret. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ jobName: string }> }
) {
  const { jobName } = await params;
  if (!ALLOWED_JOBS.includes(jobName as (typeof ALLOWED_JOBS)[number])) {
    return NextResponse.json({ error: "Unknown job" }, { status: 404 });
  }

  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured. Manual trigger unavailable." },
      { status: 503 }
    );
  }

  const base = req.nextUrl.origin;
  const res = await fetch(`${base}/api/cron/${jobName}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${cronSecret}` },
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(data, { status: res.status });
  }
  return NextResponse.json(data);
}
