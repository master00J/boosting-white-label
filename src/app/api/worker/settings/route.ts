import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { encryptPayoutDetails } from "@/lib/payout-encryption";
import { z } from "zod";

const profileSchema = z.object({
  type: z.literal("profile"),
  display_name: z.string().max(60).optional(),
});

const boosterProfileSchema = z.object({
  type: z.literal("booster_profile"),
  bio: z.string().max(500).optional(),
  show_on_boosters_page: z.boolean().optional(),
  profile_photo_url: z.string().url().max(2000).nullable().optional(),
});

const payoutSchema = z.object({
  type: z.literal("payout"),
  payout_method: z.enum(["paypal", "bank", "crypto"]),
  payout_details: z.string().max(200).optional(),
});

const bodySchema = z.discriminatedUnion("type", [profileSchema, boosterProfileSchema, payoutSchema]);

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const admin = createAdminClient();

  if (parsed.data.type === "profile") {
    const { error } = await admin
      .from("profiles")
      .update({ display_name: parsed.data.display_name ?? null })
      .eq("id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.type === "booster_profile") {
    const { data: worker } = await admin
      .from("workers")
      .select("id")
      .eq("profile_id", user.id)
      .single() as unknown as { data: { id: string } | null };
    if (!worker) return NextResponse.json({ error: "Worker not found" }, { status: 404 });
    const updates: { bio?: string | null; show_on_boosters_page?: boolean; profile_photo_url?: string | null } = {};
    if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio ?? null;
    if (parsed.data.show_on_boosters_page !== undefined) updates.show_on_boosters_page = parsed.data.show_on_boosters_page;
    if (parsed.data.profile_photo_url !== undefined) updates.profile_photo_url = parsed.data.profile_photo_url;
    const { error } = await admin.from("workers").update(updates).eq("id", worker.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.type === "payout") {
    const { data: worker } = await admin
      .from("workers")
      .select("id")
      .eq("profile_id", user.id)
      .single() as unknown as { data: { id: string } | null };

    if (!worker) return NextResponse.json({ error: "Worker not found" }, { status: 404 });

    const updatePayload: { payout_method: string; payout_details_encrypted?: string } = {
      payout_method: parsed.data.payout_method,
    };

    if (parsed.data.payout_details?.trim()) {
      try {
        updatePayload.payout_details_encrypted = encryptPayoutDetails(parsed.data.payout_details.trim());
      } catch {
        return NextResponse.json({ error: "Payout encryption not available — contact admin" }, { status: 503 });
      }
    }

    const { error } = await admin
      .from("workers")
      .update(updatePayload)
      .eq("id", worker.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
}
