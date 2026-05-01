import type { Database } from "@/types/database";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bgColor: string; description: string }
> = {
  pending_payment: {
    label: "Awaiting Payment",
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
    description: "Order created, waiting for payment",
  },
  paid: {
    label: "Paid",
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    description: "Payment received; admin must release to queue before boosters can claim",
  },
  queued: {
    label: "Queued",
    color: "text-indigo-400",
    bgColor: "bg-indigo-400/10",
    description: "Released by admin; waiting to be claimed by a booster",
  },
  claimed: {
    label: "Claimed",
    color: "text-violet-400",
    bgColor: "bg-violet-400/10",
    description: "Assigned to a booster",
  },
  in_progress: {
    label: "In Progress",
    color: "text-cyan-400",
    bgColor: "bg-cyan-400/10",
    description: "Booster is actively working",
  },
  paused: {
    label: "Paused",
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    description: "Temporarily paused",
  },
  completed: {
    label: "Completed",
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    description: "Order successfully completed",
  },
  cancelled: {
    label: "Cancelled",
    color: "text-zinc-400",
    bgColor: "bg-zinc-400/10",
    description: "Order was cancelled",
  },
  refunded: {
    label: "Refunded",
    color: "text-pink-400",
    bgColor: "bg-pink-400/10",
    description: "Payment was refunded",
  },
  disputed: {
    label: "Disputed",
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    description: "Order is under dispute",
  },
};

export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["queued", "cancelled", "refunded"],
  queued: ["claimed", "cancelled"],
  claimed: ["in_progress", "queued", "cancelled"],
  in_progress: ["paused", "completed", "cancelled"],
  paused: ["in_progress", "cancelled"],
  completed: ["disputed", "refunded"],
  cancelled: ["refunded"],
  refunded: [],
  disputed: ["refunded", "completed"],
};
