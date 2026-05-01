import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";

export async function POST(req: NextRequest) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;

  const body = await req.json() as {
    hero_slides?: string[];
    hero_video_slides?: string[];
    hero_video_url?: string;
    hero_bg_overlay?: number;
    hero_height?: number;
    hero_mobile_logo?: string;
    hero_mobile_logo_only?: boolean;
  };

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { data: existing } = await admin
    .from("site_settings")
    .select("value")
    .eq("key", "homepage_config")
    .maybeSingle();

  const current = (existing as { value?: Record<string, unknown> } | null)?.value ?? {};
  const videoSlides = Array.isArray(body.hero_video_slides)
    ? body.hero_video_slides.filter((u) => typeof u === "string" && u.trim())
    : undefined;
  const merged = {
    ...current,
    hero_slides: Array.isArray(body.hero_slides)
      ? body.hero_slides.filter((u) => typeof u === "string" && u.trim())
      : current.hero_slides ?? [],
    hero_video_slides: videoSlides ?? current.hero_video_slides ?? [],
    hero_video_url:
      typeof body.hero_video_url === "string"
        ? body.hero_video_url.trim()
        : body.hero_video_url === null
          ? ""
          : current.hero_video_url ?? "",
    hero_bg_overlay:
      typeof body.hero_bg_overlay === "number"
        ? Math.min(1, Math.max(0, body.hero_bg_overlay))
        : current.hero_bg_overlay ?? 0.75,
    hero_height:
      typeof body.hero_height === "number" && body.hero_height >= 30 && body.hero_height <= 100
        ? Math.round(body.hero_height)
        : (typeof (current.hero_height as number) === "number" ? (current.hero_height as number) : 65),
    hero_mobile_logo:
      typeof body.hero_mobile_logo === "string"
        ? body.hero_mobile_logo.trim()
        : body.hero_mobile_logo === null
          ? ""
          : current.hero_mobile_logo ?? "",
    hero_mobile_logo_only:
      typeof body.hero_mobile_logo_only === "boolean"
        ? body.hero_mobile_logo_only
        : current.hero_mobile_logo_only ?? false,
  };

  const { error } = await admin
    .from("site_settings")
    .upsert({ key: "homepage_config", value: merged } as never, {
      onConflict: "key",
    });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
