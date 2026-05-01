import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? "mailto:admin@boostplatform.io";

let vapidConfigured = false;
function ensureVapid() {
  if (!vapidConfigured && VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
    vapidConfigured = true;
  }
}

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  /** Conversation ID — used to group/replace notifications per conversation */
  conversationId?: string;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

async function sendToSubscriptions(
  subs: PushSubscriptionRow[],
  payload: PushPayload
): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  ensureVapid();

  const admin = createAdminClient();
  const expiredIds: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url,
            icon: payload.icon ?? "/icons/icon-192.png",
            conversationId: payload.conversationId,
          })
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(sub.id);
        }
      }
    })
  );

  if (expiredIds.length > 0) {
    await admin.from("push_subscriptions").delete().in("id", expiredIds);
  }
}

/**
 * Send a push notification to all subscribed chat agents (admin/super_admin).
 * Called when a customer sends a new message.
 */
export async function sendPushToAgents(payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const admin = createAdminClient();

  // Only send to users with admin or super_admin role
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, keys, profiles!inner(role)")
    .in("profiles.role", ["admin", "super_admin"]) as {
      data: (PushSubscriptionRow & { profiles: { role: string } })[] | null;
    };

  if (!subs || subs.length === 0) return;
  await sendToSubscriptions(subs, payload);
}

/**
 * Send a push notification to a specific customer.
 * Called when an agent replies to a customer message.
 */
export async function sendPushToCustomer(
  customerId: string,
  payload: PushPayload
): Promise<void> {
  await sendPushToUser(customerId, payload);
}

/**
 * Send a push notification to one specific profile.
 * Used for customer replies and staff self-tests.
 */
export async function sendPushToUser(
  profileId: string,
  payload: PushPayload
): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

  const admin = createAdminClient();

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, keys")
    .eq("profile_id", profileId) as { data: PushSubscriptionRow[] | null };

  if (!subs || subs.length === 0) return;
  await sendToSubscriptions(subs, payload);
}
