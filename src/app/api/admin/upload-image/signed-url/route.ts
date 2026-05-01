import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";

/** Genereert een signed upload URL. Geen file in de request = geen 413 van Vercel. */
export async function POST(req: NextRequest) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;

  const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "mp4", "webm"];
  const ALLOWED_BUCKETS = new Set(["game-assets", "screenshots", "avatars", "uploads"]);
  const body = await req.json().catch(() => ({})) as {
    bucket?: string;
    folder?: string;
    ext?: string;
  };
  const bucket = body.bucket || "game-assets";
  const folder = body.folder || "hero";

  if (!ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
  }
  if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(folder)) {
    return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });
  }
  const rawExt = (body.ext || "mp4").replace(/[^a-z0-9]/gi, "").toLowerCase();
  const ext = ALLOWED_EXT.includes(rawExt) ? (rawExt === "jpeg" ? "jpg" : rawExt) : "mp4";

  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUploadUrl(path, { upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "No signed URL" }, { status: 500 });

  return NextResponse.json({
    path: data.path,
    token: data.token,
    bucket,
  });
}
