import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { dbUpdate, dbInsert, insertActivityLog } from "@/lib/supabase/db-helpers";

export async function POST(req: NextRequest) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  const { admin, userId: actorId } = ctx;
  const body = await req.json() as { profile_id: string; points: number; reason?: string };

  if (!body.profile_id || typeof body.points !== "number" || body.points === 0) {
    return NextResponse.json({ error: "profile_id and non-zero points are required" }, { status: 400 });
  }

  // Find or create loyalty_points row
  const { data: existing } = await admin
    .from("loyalty_points")
    .select("id, points, lifetime_points")
    .eq("profile_id", body.profile_id)
    .maybeSingle() as { data: { id: string; points: number; lifetime_points: number } | null };

  if (existing) {
    const newPoints = Math.max(0, existing.points + body.points);
    const newLifetime = body.points > 0
      ? existing.lifetime_points + body.points
      : existing.lifetime_points;

    await admin
      .from("loyalty_points")
      .update(dbUpdate({ points: newPoints, lifetime_points: newLifetime }))
      .eq("id", existing.id);
  } else {
    if (body.points < 0) {
      return NextResponse.json({ error: "User has no loyalty points" }, { status: 400 });
    }
    await admin
      .from("loyalty_points")
      .insert(dbInsert({
        profile_id: body.profile_id,
        points: body.points,
        lifetime_points: body.points,
      }));
  }

  await admin.from("loyalty_transactions").insert(dbInsert({
    profile_id: body.profile_id,
    points: body.points,
    reason: body.reason || (body.points > 0 ? "Admin grant" : "Admin deduction"),
  }));

  await insertActivityLog(admin, {
    actor_id: actorId,
    action: body.points > 0 ? "loyalty_points_granted" : "loyalty_points_deducted",
    target_type: "profile",
    target_id: body.profile_id,
    metadata: { points: body.points, reason: body.reason },
  });

  const newTotal = existing
    ? Math.max(0, existing.points + body.points)
    : body.points;

  return NextResponse.json({ success: true, new_total: newTotal });
}
