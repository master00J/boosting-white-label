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

/** Provider + model for completions (e.g. Setup coach, helpdesk). */
export async function getAIConfig(): Promise<{ provider: AIProvider; model?: string } | null> {
  const settings = await getAISettings();
  if (!settings.apiKey) return null;

  const provider =
    settings.provider === "anthropic"
      ? new AnthropicProvider(settings.apiKey)
      : new OpenAIProvider(settings.apiKey);

  return { provider, model: settings.model };
}

export async function getAIProvider(): Promise<AIProvider | null> {
  const cfg = await getAIConfig();
  return cfg?.provider ?? null;
}
