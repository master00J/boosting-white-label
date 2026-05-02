import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { runAdminSetupAssistant } from "@/lib/ai/admin-setup-agent";
import type { AIMessage } from "@/lib/ai/providers/types";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  message: z.string().min(1).max(12_000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(24_000),
      }),
    )
    .max(28)
    .optional(),
});

export async function POST(req: Request) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { message, history } = parsed.data;

  try {
    const result = await runAdminSetupAssistant(message, (history ?? []) as AIMessage[]);
    if (!result) {
      return NextResponse.json(
        {
          error:
            "AI niet geconfigureerd. Ga naar Admin → Settings → API Keys en vul OpenAI- of Anthropic-key in, kies provider en model.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ reply: result.content });
  } catch (e) {
    console.error("[setup-assistant]", e);
    return NextResponse.json({ error: "AI-verzoek mislukt. Probeer later opnieuw." }, { status: 500 });
  }
}
