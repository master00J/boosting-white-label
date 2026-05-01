import type { createAdminClient } from "@/lib/supabase/admin";

/**
 * Generates the next order number in format [BRAND]-[GAME]-[SERVICE]-[ORDERNUMBER]
 * using configurable codes from site_settings (order_id.brand), games.order_code, services.order_code.
 */
export async function getNextOrderNumber(
  admin: ReturnType<typeof createAdminClient>,
  gameId: string,
  serviceId: string
): Promise<string> {
  const [
    { data: orderIdSetting },
    { data: game },
    { data: service },
  ] = await Promise.all([
    admin.from("site_settings").select("value").eq("key", "order_id").single() as unknown as Promise<{
      data: { value?: { brand?: string } } | null;
    }>,
    admin.from("games").select("order_code").eq("id", gameId).single() as unknown as Promise<{
      data: { order_code: string | null } | null;
    }>,
    admin.from("services").select("order_code").eq("id", serviceId).single() as unknown as Promise<{
      data: { order_code: string | null } | null;
    }>,
  ]);

  const brand =
    orderIdSetting?.value &&
    typeof orderIdSetting.value === "object" &&
    "brand" in orderIdSetting.value &&
    orderIdSetting.value.brand
      ? String(orderIdSetting.value.brand).trim() || "BST"
      : "BST";
  const gameCode = game?.order_code?.trim() ?? "GME";
  const serviceCode = service?.order_code?.trim() ?? "SVC";

  const { data: orderNumber, error } = (await admin.rpc("get_next_order_number", {
    p_brand: brand,
    p_game_code: gameCode,
    p_service_code: serviceCode,
  })) as { data: string | null; error: unknown };

  if (error || orderNumber == null) {
    console.warn("[order-number] get_next_order_number failed, using fallback", error);
    return `BST-GME-SVC-${Date.now().toString(36).toUpperCase()}`;
  }
  return orderNumber;
}
