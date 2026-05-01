import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// PATCH /api/chat/conversations/[id] — customer can close their own conversation
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as { status: string };
  if (body.status !== "closed") {
    return NextResponse.json({ error: "Customers can only close conversations" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify ownership
  const { data: conv } = await admin
    .from("chat_conversations")
    .select("id, customer_id")
    .eq("id", conversationId)
    .eq("customer_id", user.id)
    .single();

  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await admin
    .from("chat_conversations")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("id", conversationId);

  return NextResponse.json({ success: true });
}
