import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/auth/assert-admin";
import { runAdminSetupAssistant } from "@/lib/ai/admin-setup-agent";
import { resolveEffectiveShopOrigin } from "@/lib/ai/resolve-shop-origin";
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
    const shopOrigin = await resolveEffectiveShopOrigin(req);
    const result = await runAdminSetupAssistant(message, (history ?? []) as AIMessage[], shopOrigin);
    if (!result) {
      return NextResponse.json(
        {
          error:
            "AI is not configured. Boosting sites deployed via CodeCraft should receive a hosted key automatically; otherwise set BOOST_PLATFORM_HOSTED_AI_* on the server or add keys under Admin → Settings → API Keys.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ reply: result.content });
  } catch (e) {
    console.error("[setup-assistant]", e);
    return NextResponse.json({ error: "AI request failed. Try again later." }, { status: 500 });
  }
}
