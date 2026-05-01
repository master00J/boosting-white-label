import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { z } from "zod";

const rowSchema = z.object({
  customer_email: z.string().email(),
  game: z.string().min(1),
  service: z.string().min(1),
  total: z.number().positive(),
  status: z.string().optional().default("queued"),
  notes: z.string().optional(),
});

const bodySchema = z.object({
  rows: z.array(rowSchema).min(1).max(500),
});

export async function POST(req: NextRequest) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;

  const body = await req.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let successCount = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < parsed.data.rows.length; i++) {
    const row = parsed.data.rows[i];
    try {
      // Find customer by email
      const { data: customer } = await admin.from("profiles").select("id").eq("email", row.customer_email).single() as unknown as { data: { id: string } | null };
      if (!customer) {
        errors.push({ row: i + 2, message: `Customer not found: ${row.customer_email}` });
        continue;
      }

      // Find game
      const { data: game } = await admin.from("games").select("id").ilike("name", row.game).single() as unknown as { data: { id: string } | null };
      if (!game) {
        errors.push({ row: i + 2, message: `Game not found: ${row.game}` });
        continue;
      }

      // Find service
      const { data: service } = await admin.from("services").select("id").ilike("name", row.service).eq("game_id", game.id).single() as unknown as { data: { id: string } | null };
      if (!service) {
        errors.push({ row: i + 2, message: `Service not found: ${row.service}` });
        continue;
      }

      await (admin.from("orders") as unknown as { insert: (v: unknown) => Promise<unknown> }).insert({
        customer_id: customer.id,
        game_id: game.id,
        service_id: service.id,
        total: row.total,
        status: row.status,
        notes: row.notes ?? null,
        payment_method: "import",
      });

      successCount++;
    } catch {
      errors.push({ row: i + 2, message: "Unknown error" });
    }
  }

  return NextResponse.json({ success: successCount, errors });
}
