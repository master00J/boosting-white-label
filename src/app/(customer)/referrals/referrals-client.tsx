"use client";

import { useState } from "react";
import { Users, Copy, Check, Gift, TrendingUp } from "lucide-react";

type ReferredUser = {
  id: string;
  display_name: string | null;
  created_at: string;
  total_spent: number;
};

export default function ReferralsClient({
  referralCode,
  referrals,
  rewardType = "percentage",
  rewardAmount = 5,
}: {
  referralCode: string | null;
  referrals: ReferredUser[];
  rewardType?: "percentage" | "fixed";
  rewardAmount?: number;
}) {
  const [copied, setCopied] = useState(false);

  const referralLink = referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : "https://boostplatform.gg"}/ref/${referralCode}`
    : null;

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const calcEarning = (spent: number) =>
    rewardType === "percentage" ? spent * (rewardAmount / 100) : rewardAmount;

  const totalEarnings = referrals.reduce((sum, r) => sum + calcEarning(r.total_spent), 0);
  const commissionLabel = rewardType === "percentage" ? `${rewardAmount}%` : `$${rewardAmount.toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">My account</p>
        <h1 className="font-heading text-2xl font-semibold">Referrals</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Invited friends", value: referrals.length, icon: Users, color: "text-primary" },
          { label: "Total earned", value: `$${totalEarnings.toFixed(2)}`, icon: TrendingUp, color: "text-green-400" },
          { label: "Commission per purchase", value: commissionLabel, icon: Gift, color: "text-orange-400" },
        ].map((stat) => (
          <div key={stat.label} className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-[var(--text-muted)]">{stat.label}</p>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className={`font-heading text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <div>
          <h2 className="font-heading font-semibold mb-1">Your referral link</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Share this link with friends. When they place an order, you receive 5% of their purchase as balance.
          </p>
        </div>
        {referralLink ? (
          <div className="flex gap-2">
            <div className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-sm text-[var(--text-muted)] truncate">
              {referralLink}
            </div>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors flex-shrink-0"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)] bg-[var(--bg-elevated)] rounded-lg px-4 py-3">
            Your referral code will be automatically created with your first order.
          </p>
        )}
        {referralCode && (
          <p className="text-xs text-[var(--text-muted)]">
            Your code: <span className="font-mono font-bold text-primary">{referralCode}</span>
          </p>
        )}
      </div>

      {/* How it works */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
        <h2 className="font-heading font-semibold text-sm mb-4">How does it work?</h2>
        <div className="space-y-3">
          {[
            { step: "1", text: "Share your unique referral link with friends." },
            { step: "2", text: "They register via your link and place an order." },
            { step: "3", text: `You automatically receive ${commissionLabel}${rewardType === "percentage" ? " of their order amount" : ""} as balance.` },
            { step: "4", text: "Use your balance on your next order!" },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {item.step}
              </div>
              <p className="text-sm text-[var(--text-secondary)]">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referred users */}
      <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-default)]">
          <h2 className="font-heading font-semibold text-sm">Invited users ({referrals.length})</h2>
        </div>
        {referrals.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-10 w-10 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">No one invited yet</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Share your link and earn balance!</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-default)]">
            {referrals.map((ref) => (
              <div key={ref.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center flex-shrink-0">
                  {(ref.display_name ?? "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{ref.display_name ?? "User"}</p>
                  <p className="text-xs text-[var(--text-muted)]">Member since {new Date(ref.created_at).toLocaleDateString("en-GB")}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold">${ref.total_spent.toFixed(2)}</p>
                  <p className="text-xs text-green-400">+${calcEarning(ref.total_spent).toFixed(2)} earned</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
