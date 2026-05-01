import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .select(`
      id,
      order_number,
      status,
      total,
      track_token,
      customer_id,
      service:services(name),
      game:games(name)
    `)
    .eq("id", id)
    .single() as unknown as {
      data: {
        id: string;
        order_number: string;
        status: string;
        total: number;
        track_token: string | null;
        customer_id: string | null;
        service: { name: string } | null;
        game: { name: string } | null;
      } | null;
      error: unknown;
    };

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Only allow the customer or admin to view
  if (order.customer_id !== user.id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single() as unknown as { data: { role: string } | null };

    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json({
    order: {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      total: order.total,
      track_token: order.track_token,
      service_name: order.service?.name ?? null,
      game_name: order.game?.name ?? null,
    },
  });
}
