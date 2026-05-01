export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "queued",
  "claimed",
  "in_progress",
  "paused",
  "completed",
  "cancelled",
  "refunded",
  "disputed",
] as const;

export const PAYMENT_STATUSES = ["pending", "completed", "failed", "refunded"] as const;

export const PAYOUT_STATUSES = ["pending", "processing", "completed", "failed"] as const;

export const TICKET_STATUSES = [
  "open",
  "awaiting_reply",
  "in_progress",
  "resolved",
  "closed",
] as const;

export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export const USER_ROLES = ["customer", "worker", "admin", "super_admin"] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const ACCEPTED_FILE_TYPES = [...ACCEPTED_IMAGE_TYPES, "application/pdf"];

export const STALE_TIME = 30 * 1000; // 30 seconds
export const LONG_STALE_TIME = 5 * 60 * 1000; // 5 minutes

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const ORDER_NUMBER_PREFIX = "BST";
export const TICKET_NUMBER_PREFIX = "TKT";

export const PAYOUT_REVIEW_WINDOW_HOURS = 48;
export const ORDER_EXPIRY_HOURS = 24;
