import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const schema = z.object({
  vpn_country_code: z.string().length(2).toUpperCase().nullable(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const admin = createAdminClient();

  const { data: workerRow } = await admin
    .from("workers")
    .select("id")
    .eq("profile_id", user.id)
    .single() as { data: { id: string } | null };

  if (!workerRow) return NextResponse.json({ error: "Not a worker" }, { status: 403 });

  const { data: order } = await admin
    .from("orders")
    .select("id, worker_id, status")
    .eq("id", id)
    .single() as { data: { id: string; worker_id: string | null; status: string } | null };

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.worker_id !== workerRow.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  await (admin as unknown as { from: (t: string) => ReturnType<ReturnType<typeof createAdminClient>["from"]> })
    .from("orders")
    .update({ vpn_country_code: parsed.data.vpn_country_code })
    .eq("id", id);

  return NextResponse.json({ success: true });
}
