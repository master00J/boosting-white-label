import { createAdminClient } from "@/lib/supabase/admin";
import { dbInsert } from "@/lib/supabase/db-helpers";
import { sendOrderConfirmed, sendOrderCompleted } from "@/lib/email/send";

type OrderItemLabel = {
  serviceName?: string | null;
  gameName?: string | null;
};

function getOrderLabels(order: {
  items?: unknown;
  service?: { name: string | null } | null;
  game?: { name: string | null } | null;
}) {
  const items = Array.isArray(order.items) ? order.items as OrderItemLabel[] : [];
  const firstItem = items[0];

  return {
    game: firstItem?.gameName ?? order.game?.name ?? "Boosting",
    service: items.length > 1
      ? `${items.length} services`
      : firstItem?.serviceName ?? order.service?.name ?? "Service",
  };
}

/** Insert an in-app notification for a user */
export async function insertNotification(
  profileId: string,
  type: string,
  title: string,
  message: string,
  link?: string
) {
  try {
    const admin = createAdminClient();
    await admin.from("notifications").insert(dbInsert({
      profile_id: profileId,
      type,
      title,
      message,
      link: link ?? null,
    }));
  } catch (err) {
    console.error("[notify] Failed to insert notification:", err);
  }
}

/** Fetch order details + customer profile, then send order confirmed email + in-app notification */
export async function notifyOrderConfirmed(orderId: string) {
  try {
    const admin = createAdminClient();

    const { data: order } = await admin
      .from("orders")
      .select("id, order_number, total, customer_id, items, track_token, service:services(name), game:games(name)")
      .eq("id", orderId)
      .single() as unknown as {
        data: {
          id: string;
          order_number: string;
          total: number;
          customer_id: string | null;
          items: unknown;
          track_token: string | null;
          service: { name: string | null } | null;
          game: { name: string | null } | null;
        } | null;
      };

    if (!order?.customer_id) return;

    const { data: profile } = await admin
      .from("profiles")
      .select("email, display_name")
      .eq("id", order.customer_id)
      .single() as unknown as { data: { email: string; display_name: string | null } | null };

    if (!profile?.email) return;

    const customerName = profile.display_name ?? "Customer";
    const { game, service } = getOrderLabels(order);

    // Email
    await sendOrderConfirmed(profile.email, {
      customerName,
      orderNumber: order.order_number,
      game,
      service,
      total: order.total,
    });

    // In-app notification
    await insertNotification(
      order.customer_id,
      "order_confirmed",
      "Order confirmed!",
      `Your order #${order.order_number} (${game} — ${service}) has been confirmed.`,
      order.track_token ? `/track?token=${order.track_token}` : `/orders/${order.id}`
    );
  } catch (err) {
    console.error("[notify] notifyOrderConfirmed failed:", err);
  }
}

/** Fetch order details + customer profile, then send order completed email + in-app notification */
export async function notifyOrderCompleted(orderId: string, boosterName?: string) {
  try {
    const admin = createAdminClient();

    const { data: order } = await admin
      .from("orders")
      .select("id, order_number, customer_id, worker_id, items, track_token, service:services(name), game:games(name)")
      .eq("id", orderId)
      .single() as unknown as {
        data: {
          id: string;
          order_number: string;
          customer_id: string | null;
          worker_id: string | null;
          items: unknown;
          track_token: string | null;
          service: { name: string | null } | null;
          game: { name: string | null } | null;
        } | null;
      };

    if (!order?.customer_id) return;

    const { data: profile } = await admin
      .from("profiles")
      .select("email, display_name")
      .eq("id", order.customer_id)
      .single() as unknown as { data: { email: string; display_name: string | null } | null };

    if (!profile?.email) return;

    // Get booster name if not provided
    let resolvedBoosterName = boosterName ?? "Your booster";
    if (!boosterName && order.worker_id) {
      const { data: worker } = await admin
        .from("workers")
        .select("display_name, profiles(display_name)")
        .eq("id", order.worker_id)
        .single() as unknown as { data: { display_name: string | null; profiles: { display_name: string | null } | null } | null };

      resolvedBoosterName = worker?.display_name ?? worker?.profiles?.display_name ?? "Your booster";
    }

    const { game, service } = getOrderLabels(order);

    // Email
    await sendOrderCompleted(profile.email, {
      customerName: profile.display_name ?? "Customer",
      orderNumber: order.order_number,
      game,
      service,
      boosterName: resolvedBoosterName,
    });

    // In-app notification
    await insertNotification(
      order.customer_id,
      "order_completed",
      "Order completed!",
      `Your order #${order.order_number} (${game} — ${service}) has been completed. Leave a review!`,
      order.track_token ? `/track?token=${order.track_token}` : `/orders/${order.id}`
    );
  } catch (err) {
    console.error("[notify] notifyOrderCompleted failed:", err);
  }
}
