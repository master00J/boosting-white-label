import { createAdminClient } from "@/lib/supabase/admin";

const RESEND_API_URL = "https://api.resend.com";

export type EmailPayload = {
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function isEmailEnabled(toggleKey: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", toggleKey)
      .maybeSingle() as unknown as { data: { value: string } | null };

    // Default to enabled if not explicitly set to "false"
    return data?.value !== "false";
  } catch {
    return true;
  }
}

async function getEmailConfig(): Promise<{ apiKey: string; fromAddress: string; fromName: string } | null> {
  // Env vars take priority
  const envKey = process.env.RESEND_API_KEY;
  const envFrom = process.env.EMAIL_FROM;
  const envName = process.env.NEXT_PUBLIC_APP_NAME ?? "BoostPlatform";

  if (envKey) {
    return { apiKey: envKey, fromAddress: envFrom ?? "noreply@boostplatform.io", fromName: envName };
  }

  // Fall back to DB settings
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("site_settings")
      .select("key, value")
      .in("key", ["resend_api_key", "email_from_address", "email_from_name"]) as unknown as {
        data: { key: string; value: string }[] | null;
      };

    const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));

    if (!map.resend_api_key) return null;

    return {
      apiKey: map.resend_api_key,
      fromAddress: map.email_from_address || "noreply@boostplatform.io",
      fromName: map.email_from_name || envName,
    };
  } catch {
    return null;
  }
}

export async function sendEmail(payload: EmailPayload): Promise<{ id: string } | null> {
  const config = await getEmailConfig();

  if (!config) {
    console.warn("[email] Resend API key not configured — skipping email. Set it in Admin → Settings → Email.");
    return null;
  }

  // Allow overriding the from address via payload, but fall back to config
  const resolvedPayload = {
    ...payload,
    from: payload.from.includes("@")
      ? payload.from
      : `${config.fromName} <${config.fromAddress}>`,
  };

  const response = await fetch(`${RESEND_API_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(resolvedPayload),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("[email] Send failed:", err);
    return null;
  }

  return response.json() as Promise<{ id: string }>;
}
