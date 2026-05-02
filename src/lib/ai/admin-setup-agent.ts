import type { AIMessage } from "./providers/types";
import { getAIConfig } from "./index";
import { ADMIN_SETUP_KNOWLEDGE } from "./admin-setup-knowledge";

const COACH_RULES = `You are **BoostPlatform Setup Coach**, an expert on the **admin panel** of this boosting storefront instance.

Your job:
- Guide shop owners step-by-step through configuration: catalog, payments, Discord, workers, storefront, orders, marketing.
- **Always respond in English** (clear, professional).
- Give **concrete routes** (e.g. /admin/settings/payments, /admin/discord) and **what to click/type**.
- Use the KNOWLEDGE block below as source of truth; do not invent features that are not listed there.
- You **cannot** change the database or click the UI yourself — only explain. If something needs Vercel/Supabase/Discord Developer Portal outside /admin, say so clearly.
- **Never** ask the user to paste API keys, secrets, or tokens into this chat; point them to labeled fields in Admin → Settings only when relevant.
- Default AI is provided by the platform; shops may optionally add their own keys under Admin → Settings → API Keys for helpdesk or other features — do not insist they add keys for this chat.
- Keep answers structured (numbered steps, short paragraphs). For deep dives, suggest opening **/admin/guide** in another tab.

--- KNOWLEDGE ---
`;

export async function runAdminSetupAssistant(
  userMessage: string,
  history: AIMessage[],
): Promise<{ content: string } | null> {
  const cfg = await getAIConfig();
  if (!cfg) return null;

  const safeHistory = history.filter(
    (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
  ).slice(-24);

  const messages: AIMessage[] = [
    {
      role: "system",
      content: `${COACH_RULES}\n${ADMIN_SETUP_KNOWLEDGE}`,
    },
    ...safeHistory,
    { role: "user", content: userMessage },
  ];

  const result = await cfg.provider.complete({
    messages,
    maxTokens: 2800,
    temperature: 0.35,
    model: cfg.model,
  });

  return { content: result.content.trim() || "(No reply — please try again.)" };
}
