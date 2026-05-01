import { NextRequest, NextResponse } from "next/server";
import { assertSuperAdmin } from "@/lib/auth/assert-admin";

export const dynamic = "force-dynamic";

// GET /api/admin/chat-agents — list all chat agents
export async function GET() {
  const ctx = await assertSuperAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;
  const { data: agents } = await admin
    .from("chat_agents")
    .select("id, profile_id, created_at, profile:profiles!profile_id(display_name, email, role), granted_by_profile:profiles!granted_by(display_name)")
    .order("created_at", { ascending: false }) as { data: unknown[] | null };

  return NextResponse.json({ agents: agents ?? [] });
}

// POST /api/admin/chat-agents — add a chat agent
export async function POST(req: NextRequest) {
  const ctx = await assertSuperAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin, userId: user_id } = ctx;

  const body = await req.json() as { profile_id: string };
  if (!body.profile_id) return NextResponse.json({ error: "profile_id required" }, { status: 400 });

  // Verify the target is an admin
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("role, display_name, email")
    .eq("id", body.profile_id)
    .single() as { data: { role: string; display_name: string | null; email: string } | null };

  if (!targetProfile) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!["admin", "super_admin"].includes(targetProfile.role)) {
    return NextResponse.json({ error: "Only admins can be chat agents" }, { status: 400 });
  }

  const { data: agent, error } = await admin
    .from("chat_agents")
    .insert({ profile_id: body.profile_id, granted_by: user_id })
    .select()
    .single();

  if (error?.code === "23505") {
    return NextResponse.json({ error: "Already a chat agent" }, { status: 409 });
  }
  if (error) return NextResponse.json({ error: "Failed to add agent" }, { status: 500 });

  return NextResponse.json({ agent });
}
