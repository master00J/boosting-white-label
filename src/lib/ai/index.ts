import { createAdminClient } from "@/lib/supabase/admin";
import { OpenAIProvider } from "./providers/openai";
import { AnthropicProvider } from "./providers/anthropic";
import type { AIProvider } from "./providers/types";

export type { AIProvider, AIMessage, AICompletionOptions, AICompletionResult } from "./providers/types";

type SettingRow = { key: string; value: string };

async function getAISettings(): Promise<{ provider: string; apiKey: string; model?: string }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", ["ai_provider", "ai_api_key", "ai_model"]) as unknown as { data: SettingRow[] | null };

  const map = Object.fromEntries((data ?? []).map((s) => [s.key, s.value]));

  return {
    provider: map["ai_provider"] ?? "openai",
    apiKey: map["ai_api_key"] ?? "",
    model: map["ai_model"],
  };
}

export async function getAIProvider(): Promise<AIProvider | null> {
  const settings = await getAISettings();
  if (!settings.apiKey) return null;

  if (settings.provider === "anthropic") {
    return new AnthropicProvider(settings.apiKey);
  }
  return new OpenAIProvider(settings.apiKey);
}
