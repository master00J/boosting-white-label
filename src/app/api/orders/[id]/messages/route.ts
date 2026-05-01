import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const bodySchema = z.object({
  content: z.string().min(1).max(2000),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const admin = createAdminClient();

  // Verify the user has access to this order (customer, assigned worker, or admin)
  const { data: order } = await admin
    .from("orders")
    .select("id, customer_id, worker_id")
    .eq("id", orderId)
    .single() as unknown as { data: { id: string; customer_id: string; worker_id: string | null } | null };

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as unknown as { data: { role: string } | null };

  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  const isCustomer = order.customer_id === user.id;

  // For workers, resolve worker.id from profile_id
  const { data: workerRow } = await admin
    .from("workers")
    .select("id")
    .eq("profile_id", user.id)
    .single() as unknown as { data: { id: string } | null };

  const isWorker = !!workerRow && order.worker_id === workerRow.id;

  if (!isAdmin && !isCustomer && !isWorker) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: message, error } = await admin
    .from("order_messages")
    .insert({
      order_id: orderId,
      sender_id: user.id,
      content: parsed.data.content,
      is_system: false,
    })
    .select("id, content, is_system, created_at, sender_id")
    .single() as unknown as { data: { id: string; content: string; is_system: boolean; created_at: string; sender_id: string } | null; error: unknown };

  if (error) {
    console.error("[messages] insert error:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }

  return NextResponse.json(message);
}
