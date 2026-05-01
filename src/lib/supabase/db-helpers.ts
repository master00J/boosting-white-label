/**
 * Typed database helper wrappers.
 *
 * Supabase's generated TypeScript types use strict Insert/Update types that
 * don't always align with partial or flexible payloads. Rather than scattering
 * `as never` throughout the codebase, these helpers centralise the cast.
 *
 * Usage:
 *   import { dbInsert, dbUpdate, dbUpsert } from "@/lib/supabase/db-helpers";
 *
 *   await admin.from("activity_log").insert(dbInsert({ ... }));
 *   await admin.from("orders").update(dbUpdate({ status: "completed" })).eq("id", id);
 */

import type { createAdminClient } from "@/lib/supabase/admin";

export type AdminClient = ReturnType<typeof createAdminClient>;

/**
 * Casts an insert payload to the type expected by Supabase's `.insert()`.
 * Use when partial or flexible objects don't satisfy the strict generated Insert type.
 */
export function dbInsert<T extends Record<string, unknown>>(row: T): never {
  return row as never;
}

/**
 * Casts an update payload to the type expected by Supabase's `.update()`.
 */
export function dbUpdate<T extends Record<string, unknown>>(row: T): never {
  return row as never;
}

/**
 * Casts an upsert payload to the type expected by Supabase's `.upsert()`.
 */
export function dbUpsert<T extends Record<string, unknown>>(row: T): never {
  return row as never;
}

/**
 * Casts an array of insert rows.
 */
export function dbInsertMany<T extends Record<string, unknown>>(rows: T[]): never {
  return rows as never;
}

// ─── Typed helpers for common tables ─────────────────────────────────────────

type ActivityLogEntry = {
  actor_id?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Insert a row into the activity_log table.
 * Centralises the common pattern used throughout admin routes.
 */
export async function insertActivityLog(
  admin: AdminClient,
  entry: ActivityLogEntry,
): Promise<void> {
  await admin.from("activity_log").insert(dbInsert(entry));
}

type NotificationInsert = {
  profile_id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
};

/**
 * Insert an in-app notification without throwing.
 * Use insertNotification from @/lib/notify for the fire-and-forget version.
 */
export async function insertNotificationRow(
  admin: AdminClient,
  data: NotificationInsert,
): Promise<void> {
  await admin.from("notifications").insert(dbInsert(data));
}
