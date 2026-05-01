import { NextRequest, NextResponse } from "next/server";
import { assertSuperAdmin } from "@/lib/auth/assert-admin";

export const dynamic = "force-dynamic";

// DELETE /api/admin/chat-agents/[id] — remove a chat agent
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ctx = await assertSuperAdmin();
  if (!ctx.ok) return ctx.response;

  const { error } = await ctx.admin.from("chat_agents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Delete failed" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
