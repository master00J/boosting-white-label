import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { creditBalance } from "@/lib/payments/balance";
import { getRateLimitIdentifier, checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

interface LootboxPrize {
  id: string;
  name: string;
  description: string | null;
  prize_type: "balance_credit" | "coupon" | "osrs_item";
  prize_value: number;
  weight: number;
  image_url: string | null;
  rarity: string;
  coupon_config: Record<string, unknown>;
  osrs_item_id: string | null;
}

function cryptoRandom(): number {
  return randomBytes(4).readUInt32BE(0) / 0x100000000;
}

function pickWeightedPrize(prizes: LootboxPrize[]): LootboxPrize {
  const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0);
  let roll = cryptoRandom() * totalWeight;
  for (const prize of prizes) {
    roll -= prize.weight;
    if (roll <= 0) return prize;
  }
  return prizes[prizes.length - 1];
}

function generateCouponCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let code = "LB-";
  for (let i = 0; i < 8; i++) code += chars[bytes[i] % chars.length];
  return code;
}

export async function POST(req: NextRequest) {
  const rl = await checkRateLimit(getRateLimitIdentifier(req), RATE_LIMITS.sensitive);
  if (rl) return rl;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;

  const { data: setting } = (await admin
    .from("site_settings")
    .select("value")
    .eq("key", "lootbox_enabled")
    .maybeSingle()) as { data: { value: string } | null };

  if (!setting || setting.value !== "true") {
    return NextResponse.json(
      { error: "Lootboxes are currently disabled" },
      { status: 403 }
    );
  }

  const body = (await req.json()) as { lootbox_id: string };
  if (!body.lootbox_id) {
    return NextResponse.json(
      { error: "lootbox_id is required" },
      { status: 400 }
    );
  }

  const { data: lootbox } = (await db
    .from("lootboxes")
    .select("*")
    .eq("id", body.lootbox_id)
    .eq("is_active", true)
    .single()) as {
    data: { id: string; name: string; cost_points: number } | null;
  };

  if (!lootbox) {
    return NextResponse.json(
      { error: "Lootbox not found or inactive" },
      { status: 404 }
    );
  }

  const { data: loyaltyRow } = (await admin
    .from("loyalty_points")
    .select("id, points")
    .eq("profile_id", user.id)
    .maybeSingle()) as { data: { id: string; points: number } | null };

  const currentPoints = loyaltyRow?.points ?? 0;

  if (currentPoints < lootbox.cost_points) {
    return NextResponse.json(
      {
        error: "Not enough loyalty points",
        required: lootbox.cost_points,
        available: currentPoints,
      },
      { status: 400 }
    );
  }

  const { data: prizes } = (await db
    .from("lootbox_prizes")
    .select("*")
    .eq("lootbox_id", lootbox.id)
    .eq("is_active", true)) as { data: LootboxPrize[] | null };

  if (!prizes || prizes.length === 0) {
    return NextResponse.json(
      { error: "This lootbox has no prizes configured" },
      { status: 400 }
    );
  }

  const wonPrize = pickWeightedPrize(prizes);

  // Deduct loyalty points atomically — only if points haven't dropped below cost since our read
  if (loyaltyRow) {
    const { data: updated } = await (admin
      .from("loyalty_points")
      .update({ points: currentPoints - lootbox.cost_points } as never)
      .eq("id", loyaltyRow.id)
      .gte("points", lootbox.cost_points)
      .select("id") as unknown as Promise<{ data: unknown[] | null }>);

    if (!updated || (Array.isArray(updated) && updated.length === 0)) {
      return NextResponse.json({ error: "Not enough loyalty points (concurrent request)" }, { status: 409 });
    }
  }

  await admin.from("loyalty_transactions").insert({
    profile_id: user.id,
    points: -lootbox.cost_points,
    reason: `Lootbox opened: ${lootbox.name}`,
  } as never);

  // Award prize — if any step fails, refund points
  let couponCode: string | null = null;

  try {
    if (wonPrize.prize_type === "balance_credit") {
      await creditBalance(
        user.id,
        Number(wonPrize.prize_value),
        `Lootbox prize: ${wonPrize.name}`
      );
    } else if (wonPrize.prize_type === "osrs_item") {
      // OSRS items require manual delivery — handled via the Item Deliveries admin page
    } else if (wonPrize.prize_type === "coupon") {
      const config = wonPrize.coupon_config || {};
      couponCode = generateCouponCode();
      const expiresAt = new Date();
      expiresAt.setDate(
        expiresAt.getDate() + (Number(config.expires_days) || 30)
      );

      await admin.from("coupons").insert({
        code: couponCode,
        description: `Lootbox prize: ${wonPrize.name}`,
        discount_type: (config.discount_type as string) || "percentage",
        discount_value: wonPrize.prize_value,
        max_uses: Number(config.max_uses) || 1,
        max_uses_per_user: 1,
        is_active: true,
        expires_at: expiresAt.toISOString(),
        profile_id: user.id,
      } as never);
    }

    // Record the open
    await db.from("lootbox_opens").insert({
      profile_id: user.id,
      lootbox_id: lootbox.id,
      prize_id: wonPrize.id,
      delivery_status: wonPrize.prize_type === "osrs_item" ? "pending" : "not_applicable",
      prize_snapshot: {
        name: wonPrize.name,
        description: wonPrize.description,
        prize_type: wonPrize.prize_type,
        prize_value: wonPrize.prize_value,
        rarity: wonPrize.rarity,
        image_url: wonPrize.image_url,
        coupon_code: couponCode,
        osrs_item_id: wonPrize.osrs_item_id,
      },
    });
  } catch (prizeError) {
    // Refund points on failure
    console.error("[lootbox] Prize award failed, refunding points:", prizeError);
    if (loyaltyRow) {
      await admin
        .from("loyalty_points")
        .update({ points: currentPoints } as never)
        .eq("id", loyaltyRow.id);
    }
    await admin.from("loyalty_transactions").insert({
      profile_id: user.id,
      points: lootbox.cost_points,
      reason: `Lootbox refund (prize delivery failed): ${lootbox.name}`,
    } as never);
    return NextResponse.json({ error: "Failed to award prize, points refunded" }, { status: 500 });
  }

  return NextResponse.json({
    prize: {
      id: wonPrize.id,
      name: wonPrize.name,
      description: wonPrize.description,
      prize_type: wonPrize.prize_type,
      prize_value: Number(wonPrize.prize_value),
      rarity: wonPrize.rarity,
      image_url: wonPrize.image_url,
      coupon_code: couponCode,
    },
    remaining_points: currentPoints - lootbox.cost_points,
    all_prizes: prizes.map((prize) => ({
      id: prize.id,
      name: prize.name,
      rarity: prize.rarity,
      image_url: prize.image_url,
    })),
  });
}
