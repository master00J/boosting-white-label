import { getAIProvider } from "./index";
import type { AIMessage } from "./providers/types";
import { HELPDESK_KNOWLEDGE_BASE } from "./knowledge-base";
import { getOsrsWikiContextForPrompt } from "./fetch-osrs-wiki";

const SYSTEM_PROMPT_BASE = `You are a friendly and professional customer service agent for BoostPlatform, a boosting service for online games.

CRITICAL — You MUST follow these rules:
1. LANGUAGE: Write your entire response in English only. Never reply in Dutch or any other language, even if the customer writes in another language.
2. PRICES: Never give prices, cost estimates, or amounts (no €, $, or numbers for money). There are no prices available in your context. Always direct the customer to the website to browse services and see current prices, or to place an order. Say e.g. "You can see the exact price on our website when you configure your order" or "Please check the service page for current pricing."
3. COMPLETION TIME: Never give specific completion times or ETAs (e.g. do not say "4–6 hours", "2 days"). You do not have access to duration estimates. Say only that they can track progress in their dashboard, or that a booster typically claims within about 1 hour (for when the order starts).

You help customers with questions about:
- Orders and progress
- Payments and refunds
- Boosters and the boosting process
- Account and settings
- Technical issues

Guidelines:
- Be concise but thorough
- Use the knowledge base below to give accurate, targeted answers. Base your answers on it; do not invent policies, features, prices, or time estimates.
- If you are unsure of the answer, say so honestly and escalate to a human agent
- Never refer to internal systems or database names
- Never share personal information of other users
- For payment or order-specific issues: always ask for the order number (format: e.g. BST-OSRS-INF-000042)

If you cannot answer a question or the situation is complex, end with:
"[ESCALATE]" — this indicates that a human agent should take over.

--- KNOWLEDGE BASE (use this to answer accurately) ---
${HELPDESK_KNOWLEDGE_BASE}
--- END KNOWLEDGE BASE ---`;

export type HelpdeskContext = {
  ticketSubject: string;
  previousMessages: Array<{ role: "user" | "assistant"; content: string }>;
  orderNumber?: string;
  customerName?: string;
};

export type HelpdeskResponse = {
  content: string;
  shouldEscalate: boolean;
  confidence: number;
};

/** Simple detection: does the message mention an OSRS quest we can look up? */
const QUEST_MENTIONS = [
  "dragon slayer 2", "ds2", "dragon slayer ii",
  "song of the elves", "sote",
  "recipe for disaster", "rfd",
  "monkey madness 2", "mm2",
  "desert treasure", "dt2", "dt ",
  "legends quest", "legend's quest",
  "inferno", "fight caves", "fire cape",
  "quest requirements", "quest vereisten", "wat heb ik nodig voor",
];

function detectQuestMention(text: string): string | null {
  const lower = text.toLowerCase();
  for (const term of QUEST_MENTIONS) {
    if (lower.includes(term)) {
      if (term === "quest requirements" || term === "quest vereisten" || term === "wat heb ik nodig voor") {
        const match = text.match(/(?:voor|for)\s+([^.?!]+)/i) ?? text.match(/(?:quest)\s+([a-z0-9\s]+)/i);
        if (match) return match[1].trim() || "Dragon Slayer II";
      }
      return term;
    }
  }
  return null;
}

export async function generateHelpdeskResponse(
  userMessage: string,
  context: HelpdeskContext,
): Promise<HelpdeskResponse | null> {
  const provider = await getAIProvider();
  if (!provider) return null;

  const messages: AIMessage[] = [
    { role: "system", content: SYSTEM_PROMPT_BASE },
  ];

  const questMention = detectQuestMention(userMessage);
  if (questMention) {
    const wikiContext = await getOsrsWikiContextForPrompt(questMention);
    if (wikiContext) {
      messages.push({
        role: "system",
        content: `Additional real-time context from the OSRS Wiki (use this to give accurate, up-to-date info):${wikiContext}`,
      });
    }
  }

  if (context.customerName) {
    messages.push({
      role: "system",
      content: `The customer's name is: ${context.customerName}${context.orderNumber ? `. Order number: ${context.orderNumber}` : ""}.`,
    });
  }

  messages.push({
    role: "system",
    content: `Ticket subject: "${context.ticketSubject}"`,
  });

  for (const msg of context.previousMessages) {
    messages.push({ role: msg.role, content: msg.content });
  }

  messages.push({ role: "user", content: userMessage });

  const result = await provider.complete({
    messages,
    maxTokens: 800,
    temperature: 0.5,
  });

  const shouldEscalate = result.content.includes("[ESCALATE]");
  const content = result.content.replace("[ESCALATE]", "").trim();

  // Simple confidence heuristic: escalate = low confidence
  const confidence = shouldEscalate ? 0.3 : 0.85;

  return { content, shouldEscalate, confidence };
}
