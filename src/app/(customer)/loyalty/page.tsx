import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Star, TrendingUp, Gift, Zap } from "lucide-react";

export const metadata: Metadata = { title: "Loyalty Program" };
export const dynamic = "force-dynamic";

type LoyaltyTier = {
  id: string;
  name: string;
  color: string;
  icon: string;
  min_lifetime_points: number;
  bonus_multiplier: number;
  perks: string | null;
};

type LoyaltyPoints = {
  points: number;
  lifetime_points: number;
  tier_id: string | null;
};

type LoyaltyTransaction = {
  id: string;
  points: number;
  reason: string;
  created_at: string;
};

export default async function LoyaltyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  const [{ data: pointsRow }, { data: tiers }, { data: transactions }] = await Promise.all([
    admin
      .from("loyalty_points")
      .select("points, lifetime_points, tier_id")
      .eq("profile_id", user.id)
      .maybeSingle() as unknown as Promise<{ data: LoyaltyPoints | null }>,
    admin
      .from("loyalty_tiers")
      .select("id, name, color, icon, min_lifetime_points, bonus_multiplier, perks")
      .order("min_lifetime_points", { ascending: true }) as unknown as Promise<{ data: LoyaltyTier[] | null }>,
    admin
      .from("loyalty_transactions")
      .select("id, points, reason, created_at")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10) as unknown as Promise<{ data: LoyaltyTransaction[] | null }>,
  ]);

  const points = pointsRow?.points ?? 0;
  const lifetimePoints = pointsRow?.lifetime_points ?? 0;
  const allTiers = tiers ?? [];

  const currentTier = allTiers.findLast((t) => lifetimePoints >= t.min_lifetime_points) ?? null;
  const nextTier = allTiers.find((t) => t.min_lifetime_points > lifetimePoints) ?? null;
  const progressToNext = nextTier
    ? Math.min(100, Math.round(((lifetimePoints - (currentTier?.min_lifetime_points ?? 0)) /
        (nextTier.min_lifetime_points - (currentTier?.min_lifetime_points ?? 0))) * 100))
    : 100;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Rewards</p>
        <h1 className="font-heading text-3xl font-bold text-white">Loyalty Program</h1>
        <p className="text-[var(--text-muted)] mt-1">Earn points with every order and unlock exclusive perks.</p>
      </div>

      {/* Points summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] text-center">
          <p className="text-3xl font-bold text-primary">{points.toLocaleString()}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Available points</p>
        </div>
        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] text-center">
          <p className="text-3xl font-bold text-white">{lifetimePoints.toLocaleString()}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Lifetime points</p>
        </div>
        <div className="col-span-2 sm:col-span-1 p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] text-center">
          <p className="text-3xl" style={{ color: currentTier?.color ?? "var(--text-primary)" }}>
            {currentTier?.icon ?? "🎮"} {currentTier?.name ?? "No tier yet"}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Current tier</p>
        </div>
      </div>

      {/* Progress to next tier */}
      {nextTier && (
        <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--text-muted)]">Progress to <span style={{ color: nextTier.color }}>{nextTier.icon} {nextTier.name}</span></span>
            <span className="text-[var(--text-muted)]">{lifetimePoints.toLocaleString()} / {nextTier.min_lifetime_points.toLocaleString()} pts</span>
          </div>
          <div className="h-2.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressToNext}%`, background: nextTier.color }}
            />
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {(nextTier.min_lifetime_points - lifetimePoints).toLocaleString()} points until {nextTier.name}
          </p>
        </div>
      )}

      {/* Tiers */}
      {allTiers.length > 0 && (
        <div>
          <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" /> Tiers
          </h2>
          <div className="space-y-3">
            {allTiers.map((tier) => {
              const isCurrentTier = tier.id === currentTier?.id;
              const isUnlocked = lifetimePoints >= tier.min_lifetime_points;
              return (
                <div
                  key={tier.id}
                  className={`p-4 rounded-xl border transition-all ${isCurrentTier ? "border-primary/40 bg-primary/5" : "border-[var(--border-default)] bg-[var(--bg-card)]"} ${!isUnlocked ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{tier.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold" style={{ color: isUnlocked ? tier.color : undefined }}>{tier.name}</p>
                        {isCurrentTier && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary font-semibold">CURRENT</span>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-muted)]">{tier.min_lifetime_points.toLocaleString()} lifetime points required</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{tier.bonus_multiplier}×</p>
                      <p className="text-xs text-[var(--text-muted)]">multiplier</p>
                    </div>
                  </div>
                  {tier.perks && (
                    <p className="text-xs text-[var(--text-muted)] mt-2 pl-9">{tier.perks}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* How to earn */}
      <div>
        <h2 className="font-heading font-semibold text-lg mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> How to earn points
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: <TrendingUp className="h-5 w-5" />, title: "Place orders", desc: "Earn points for every dollar spent" },
            { icon: <Star className="h-5 w-5" />, title: "Leave reviews", desc: "Bonus points for reviewing completed orders" },
            { icon: <Gift className="h-5 w-5" />, title: "Refer friends", desc: "Earn points when referred friends order" },
          ].map((item) => (
            <div key={item.title} className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] flex items-start gap-3">
              <div className="text-primary mt-0.5">{item.icon}</div>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      {(transactions ?? []).length > 0 && (
        <div>
          <h2 className="font-heading font-semibold text-lg mb-4">Recent activity</h2>
          <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] divide-y divide-[var(--border-subtle)]">
            {(transactions ?? []).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm text-[var(--text-secondary)]">{tx.reason}</p>
                <span className={`text-sm font-semibold ${tx.points >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {tx.points >= 0 ? "+" : ""}{tx.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {allTiers.length === 0 && (transactions ?? []).length === 0 && (
        <div className="text-center py-16 text-[var(--text-muted)]">
          <Star className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p className="font-medium">Loyalty program coming soon</p>
          <p className="text-sm mt-1">Place orders to start earning points.</p>
        </div>
      )}
    </div>
  );
}
