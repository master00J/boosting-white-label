import { NextResponse } from "next/server";
import { assertSuperAdmin } from "@/lib/auth/assert-admin";
import { sendWorkerApproved } from "@/lib/email/send";
import { insertNotification } from "@/lib/notify";
import { z } from "zod";

const BodySchema = z.object({
  userId: z.string().uuid(),
});

export const dynamic = "force-dynamic";

/** POST: Promote a customer to worker (without application). super_admin only. */
export async function POST(req: Request) {
  const ctx = await assertSuperAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { userId } = parsed.data;

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role")
    .eq("id", userId)
    .single();

  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (profile.role !== "customer") {
    return NextResponse.json({ error: "Only customers can be promoted. This user already has a different role." }, { status: 400 });
  }

  const { data: existingWorker } = await admin
    .from("workers")
    .select("id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (existingWorker) {
    return NextResponse.json({ error: "This user is already a worker or has a pending application." }, { status: 400 });
  }

  const { data: defaultTier } = await admin
    .from("worker_tiers")
    .select("id")
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();

  const { data: worker, error: insertError } = await admin
    .from("workers")
    .insert({
      profile_id: userId,
      tier_id: defaultTier?.id ?? null,
      is_active: true,
      is_verified: true,
      verified_at: new Date().toISOString(),
      application_text: "Directly added by admin",
    })
    .select()
    .single();

  if (insertError) {
    console.error("[promote-worker] insert error:", insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { error: roleError } = await admin
    .from("profiles")
    .update({ role: "worker" })
    .eq("id", userId);

  if (roleError) {
    console.error("[promote-worker] role update error:", roleError);
    return NextResponse.json({ error: "Worker created but role update failed" }, { status: 500 });
  }

  // Fetch email for notification
  const { data: userProfile } = await admin
    .from("profiles")
    .select("email, display_name")
    .eq("id", userId)
    .single() as unknown as { data: { email: string; display_name: string | null } | null };

  if (userProfile?.email) {
    sendWorkerApproved(userProfile.email, {
      displayName: userProfile.display_name ?? "Booster",
    }).catch(console.error);
  }

  insertNotification(
    userId,
    "worker_approved",
    "Application approved!",
    "Congratulations! Your booster application has been approved. Welcome to the team!",
    "/booster/dashboard"
  ).catch(console.error);

  return NextResponse.json({ success: true, worker }, { status: 201 });
}
