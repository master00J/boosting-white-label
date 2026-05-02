import { supabase } from "../services/supabase.js";
import { logger } from "./logger.js";

/** Discord custom_id uses underscores; order_number values like BST-GME-SVC-MON40JD2 must not be split on "_". */
export const ORDER_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sanitizeOrderKey(key: string): string {
  return key.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
}

export function normalizeOrderNumberKey(key: string): string {
  return sanitizeOrderKey(key).toUpperCase().replace(/\s+/g, "");
}

/** Button payload is either orders.id (UUID) or orders.order_number. */
export async function resolveOrderUuidFromButtonKey(orderKey: string): Promise<string | null> {
  const raw = sanitizeOrderKey(orderKey);
  if (!raw) return null;

  if (ORDER_UUID_RE.test(raw)) {
    const { data, error } = await supabase.from("orders").select("id").eq("id", raw).maybeSingle();
    if (error) logger.warn(`resolveOrderUuidFromButtonKey id=${raw}: ${error.message}`);
    if (data?.id) return data.id;
  }

  const norm = normalizeOrderNumberKey(raw);
  const { data, error } = await supabase.from("orders").select("id").eq("order_number", norm).maybeSingle();
  if (error) logger.warn(`resolveOrderUuidFromButtonKey order_number=${norm}: ${error.message}`);
  return data?.id ?? null;
}
