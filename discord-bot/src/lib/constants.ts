export const STATUS_LABELS: Record<string, string> = {
  pending_payment: "⏳ Awaiting payment",
  paid: "💳 Paid",
  queued: "📋 Queued",
  claimed: "🤝 Claimed",
  in_progress: "⚡ In progress",
  paused: "⏸️ Paused",
  completed: "✅ Completed",
  cancelled: "❌ Cancelled",
  refunded: "💸 Refunded",
  disputed: "⚠️ Disputed",
};

export const STATUS_COLORS: Record<string, number> = {
  pending_payment: 0xf59e0b,
  paid: 0x3b82f6,
  queued: 0xf59e0b,
  claimed: 0x3b82f6,
  in_progress: 0x6366f1,
  paused: 0xf97316,
  completed: 0x22c55e,
  cancelled: 0xef4444,
  refunded: 0x71717a,
  disputed: 0xef4444,
};

export const COLORS = {
  primary: 0x6366f1,
  success: 0x22c55e,
  warning: 0xf59e0b,
  error: 0xef4444,
  info: 0x3b82f6,
  muted: 0x71717a,
};
