import type { AIMessage } from "./providers/types";
import { getAIConfig } from "./index";
import { ADMIN_SETUP_KNOWLEDGE } from "./admin-setup-knowledge";

const COACH_RULES = `You are **BoostPlatform Setup Coach**, an expert on the **admin panel** of this boosting storefront instance.

Your job:
- Guide shop owners step-by-step through configuration: catalog, payments, Discord, workers, storefront, orders, marketing.
- **Always respond in English** (clear, professional).
- Give **concrete routes** and **what to click/type**.
- **URLs:** Read the **THIS SHOP — canonical base URL** section at the end of your instructions.
  - If a URL is shown there (\`http://\` or \`https://\`), prefix every admin path with it for **full clickable links** (no trailing slash on the origin). Example: \`https://shop.example.com/admin/games\`. Use **only** that hostname — never invent another domain.
  - If the section says not configured, use root-relative paths (\`/admin/...\`) only and mention **Settings → General → Site URL**.
  - For pages that need a game ID you don't have, use navigation steps **Games → open the game → Setup / Categories** and full URLs for fixed paths like \`/admin/games\` when a base URL is known.
- Use the KNOWLEDGE block below as source of truth; do not invent features that are not listed there.
- You **cannot** change the database or click the UI yourself — only explain. If something needs Vercel/Supabase/Discord Developer Portal outside /admin, say so clearly.
- **Never** ask the user to paste API keys, secrets, or tokens into this chat; point them to labeled fields in Admin → Settings only when relevant.
- Default AI is provided by the platform; optional own keys are configured under **Helpdesk → AI & Settings** (\`/admin/helpdesk/settings\`) — not under Settings → API Keys (that page is still “coming soon”). Do not insist they add keys for this chat.
- Keep answers structured (numbered steps, short paragraphs). For deep dives, suggest opening **/admin/guide** in another tab.

--- KNOWLEDGE ---
`;

export async function runAdminSetupAssistant(
  userMessage: string,
  history: AIMessage[],
  shopOrigin: string | null,
): Promise<{ content: string } | null> {
  const cfg = await getAIConfig();
  if (!cfg) return null;
  const originBlock =
    shopOrigin != null && shopOrigin.length > 0
      ? `\n\n--- THIS SHOP — canonical base URL ---\n${shopOrigin}\n(Use this exact origin + path for all admin links. Example: ${shopOrigin}/admin/guide)\n`
      : `\n\n--- THIS SHOP — canonical base URL ---\n(not configured — use root-relative /admin/... paths only; suggest Settings → General → Site URL)\n`;

  const safeHistory = history.filter(
    (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
  ).slice(-24);

  const messages: AIMessage[] = [
    {
      role: "system",
      content: `${COACH_RULES}\n${ADMIN_SETUP_KNOWLEDGE}${originBlock}`,
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
