import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock, Gift, PackageCheck, Ticket, Wallet, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import ClaimRewardChatButton from "./claim-reward-chat-button";

export const metadata: Metadata = { title: "Lootbox Rewards" };

type DeliveryStatus = "pending" | "in_progress" | "delivered" | "cancelled" | "not_applicable";

type LootboxReward = {
  id: string;
  created_at: string;
  delivery_status: DeliveryStatus;
  delivery_notes: string | null;
  delivered_at: string | null;
  prize_snapshot: Record<string, unknown> | null;
  lootboxes: { name: string } | null;
};

const STATUS_CONFIG: Record<
  DeliveryStatus,
  { label: string; helper: string; classes: string; icon: typeof Clock }
> = {
  pending: {
    label: "Pending delivery",
    helper: "Our team still needs to deliver this item in-game.",
    classes: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    icon: Clock,
  },
  in_progress: {
    label: "Delivery in progress",
    helper: "A staff member is handling this reward.",
    classes: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    icon: PackageCheck,
  },
  delivered: {
    label: "Delivered",
    helper: "This reward has been marked as delivered.",
    classes: "border-green-500/30 bg-green-500/10 text-green-300",
    icon: CheckCircle2,
  },
  cancelled: {
    label: "Cancelled",
    helper: "This delivery was cancelled. Contact support if this looks wrong.",
    classes: "border-red-500/30 bg-red-500/10 text-red-300",
    icon: XCircle,
  },
  not_applicable: {
    label: "Instant reward",
    helper: "Balance and coupon rewards are applied automatically.",
    classes: "border-white/10 bg-white/5 text-white/70",
    icon: Gift,
  },
};

function getPrizeTypeLabel(type: string) {
  if (type === "balance_credit") return "Balance credit";
  if (type === "coupon") return "Coupon";
  if (type === "osrs_item") return "OSRS item";
  return "Reward";
}

function getPrizeIcon(type: string) {
  if (type === "balance_credit") return Wallet;
  if (type === "coupon") return Ticket;
  return Gift;
}

export default async function LootboxRewardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/lootbox-rewards");

  const admin = createAdminClient();
  // Use the admin client server-side because some production databases may not have
  // the customer SELECT policy for lootbox_opens applied yet. The user filter below
  // keeps this scoped to the authenticated customer's own rewards.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any;
  const { data, error } = (await db
    .from("lootbox_opens")
    .select("id, created_at, delivery_status, delivery_notes, delivered_at, prize_snapshot, lootboxes:lootbox_id(name)")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100)) as { data: LootboxReward[] | null; error: { message: string } | null };

  if (error) throw new Error(error.message);
  const rewards = data ?? [];
  const claimableCount = rewards.filter((reward) =>
    ["pending", "in_progress"].includes(reward.delivery_status)
  ).length;

  return (
    <div className="min-h-screen pt-8 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="rounded-3xl border border-[#E8720C]/20 bg-gradient-to-br from-[#E8720C]/15 via-[var(--bg-card)] to-[var(--bg-elevated)] p-6 overflow-hidden relative">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#E8720C]/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#E8720C] mb-1">
                Lootboxes
              </p>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold">My Lootbox Rewards</h1>
              <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-xl">
                Track your won items, coupons and balance credits. OSRS item rewards are delivered manually by staff.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
              <p className="text-[var(--text-muted)]">Needs attention</p>
              <p className="font-heading text-2xl font-bold text-[#E8720C]">{claimableCount}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            Won a coupon or balance credit? Those are applied automatically. Item prizes appear here with delivery status.
          </p>
          <Link
            href="/lootboxes"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border-default)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:border-[#E8720C]/40 hover:text-[#E8720C] transition-colors"
          >
            Open more lootboxes
          </Link>
        </div>

        {rewards.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-10 text-center">
            <Gift className="mx-auto mb-3 h-10 w-10 text-[var(--text-muted)] opacity-50" />
            <h2 className="font-heading text-lg font-semibold">No rewards yet</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">Open your first lootbox to see rewards here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rewards.map((reward) => {
              const snap = reward.prize_snapshot ?? {};
              const name = String(snap.name ?? "Unknown reward");
              const type = String(snap.prize_type ?? "reward");
              const imageUrl = typeof snap.image_url === "string" ? snap.image_url : null;
              const rarity = String(snap.rarity ?? "common");
              const value = Number(snap.prize_value ?? 0);
              const couponCode = typeof snap.coupon_code === "string" ? snap.coupon_code : null;
              const osrsItemId = typeof snap.osrs_item_id === "string" ? snap.osrs_item_id : null;
              const status = STATUS_CONFIG[reward.delivery_status] ?? STATUS_CONFIG.not_applicable;
              const StatusIcon = status.icon;
              const TypeIcon = getPrizeIcon(type);
              const canClaimViaChat = type === "osrs_item" && ["pending", "in_progress"].includes(reward.delivery_status);
              const claimMessage = [
                "Hi, I want to claim my lootbox reward.",
                "",
                `Reward: ${name}`,
                `Lootbox: ${reward.lootboxes?.name ?? "Lootbox"}`,
                `Status: ${status.label}`,
                `Rarity: ${rarity}`,
                value > 0 ? `Estimated value: $${value.toFixed(2)}` : null,
                osrsItemId ? `OSRS item ID: ${osrsItemId}` : null,
                `Reward ID: ${reward.id}`,
              ].filter(Boolean).join("\n");

              return (
                <div
                  key={reward.id}
                  className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4"
                >
                  <div className="flex gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--bg-elevated)] overflow-hidden">
                      {imageUrl ? (
                        <Image src={imageUrl} alt={name} width={48} height={48} className="object-contain" />
                      ) : (
                        <TypeIcon className="h-6 w-6 text-[#E8720C]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold truncate">{name}</h2>
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] uppercase text-[var(--text-muted)]">
                          {rarity}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {reward.lootboxes?.name ?? "Lootbox"} · {getPrizeTypeLabel(type)} ·{" "}
                        {new Date(reward.created_at).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${status.classes}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {status.label}
                        </span>
                        {value > 0 && (
                          <span className="rounded-full bg-[#E8720C]/10 px-2.5 py-1 text-xs font-semibold text-[#E8720C]">
                            ${value.toFixed(2)} value
                          </span>
                        )}
                        {couponCode && (
                          <code className="rounded-lg border border-[#E8720C]/20 bg-[#E8720C]/10 px-2.5 py-1 text-xs font-bold text-[#E8720C]">
                            {couponCode}
                          </code>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-[var(--text-muted)]">{status.helper}</p>
                      {canClaimViaChat && (
                        <div className="mt-3">
                          <ClaimRewardChatButton message={claimMessage} />
                        </div>
                      )}
                      {reward.delivery_notes && (
                        <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-[var(--text-secondary)]">
                          {reward.delivery_notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
