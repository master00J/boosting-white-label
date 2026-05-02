import { createAdminClient } from "@/lib/supabase/admin";
import { OpenAIProvider } from "./providers/openai";
import { AnthropicProvider } from "./providers/anthropic";
import type { AIProvider } from "./providers/types";

export type { AIProvider, AIMessage, AICompletionOptions, AICompletionResult } from "./providers/types";

type SettingRow = { key: string; value: string };

const AI_SETTING_KEYS = [
  "ai_provider",
  "ai_model",
  "ai_api_key",
  "openai_api_key",
  "anthropic_api_key",
] as const;

/**
 * Keys injected by CodeCraft when deploying a boosting instance (Vercel env).
 * Falls back when the shop has not configured its own keys in Admin → Settings → API Keys.
 */
function getHostedAIConfigFromEnv(): { provider: AIProvider; model?: string } | null {
  const apiKey = process.env.BOOST_PLATFORM_HOSTED_AI_API_KEY?.trim();
  if (!apiKey) return null;

  const providerName = (process.env.BOOST_PLATFORM_HOSTED_AI_PROVIDER ?? "anthropic").toLowerCase();
  const model = process.env.BOOST_PLATFORM_HOSTED_AI_MODEL?.trim() || undefined;

  if (providerName === "openai") {
    return {
      provider: new OpenAIProvider(apiKey),
      model: model ?? "gpt-4o-mini",
    };
  }

  return {
    provider: new AnthropicProvider(apiKey),
    model: model ?? "claude-sonnet-4-20250514",
  };
}

async function getAISettings(): Promise<{ provider: string; apiKey: string; model?: string }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", [...AI_SETTING_KEYS]) as unknown as { data: SettingRow[] | null };

  const map = Object.fromEntries((data ?? []).map((s) => [s.key, s.value]));

  const provider = (map["ai_provider"] ?? "openai").toLowerCase();
  const legacy = map["ai_api_key"] ?? "";
  const openaiKey = map["openai_api_key"] ?? "";
  const anthropicKey = map["anthropic_api_key"] ?? "";

  const apiKey =
    provider === "anthropic"
      ? (anthropicKey || legacy)
      : (openaiKey || legacy);

  return {
    provider,
    apiKey,
    model: map["ai_model"] || undefined,
  };
}

/** Provider + model for completions (e.g. Setup coach, helpdesk). Shop keys override hosted env. */
export async function getAIConfig(): Promise<{ provider: AIProvider; model?: string } | null> {
  const settings = await getAISettings();
  if (settings.apiKey) {
    const provider =
      settings.provider === "anthropic"
        ? new AnthropicProvider(settings.apiKey)
        : new OpenAIProvider(settings.apiKey);
    return { provider, model: settings.model };
  }

  return getHostedAIConfigFromEnv();
}

export async function getAIProvider(): Promise<AIProvider | null> {
  const cfg = await getAIConfig();
  return cfg?.provider ?? null;
}
