import { NextRequest, NextResponse } from "next/server";
import { assertAdmin } from "@/lib/auth/assert-admin";

export async function POST(req: NextRequest) {
  const ctx = await assertAdmin();
  if (!ctx.ok) return ctx.response;
  const { admin } = ctx;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const bucket = (formData.get("bucket") as string) || "game-assets";
  const folder = (formData.get("folder") as string) || "hero";

  const ALLOWED_BUCKETS = new Set(["game-assets", "screenshots", "avatars", "uploads"]);
  if (!ALLOWED_BUCKETS.has(bucket)) {
    return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
  }
  if (!/^[a-z0-9][a-z0-9-]{0,39}(\/[a-z0-9][a-z0-9-]{0,39}){0,4}$/.test(folder)) {
    return NextResponse.json({ error: "Invalid folder name" }, { status: 400 });
  }

  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP images and videos allowed (no SVG)" }, { status: 400 });
  }
  const maxSize = isVideo ? 100 * 1024 * 1024 : 50 * 1024 * 1024; // 100MB for video, 50MB for images
  if (file.size > maxSize) {
    return NextResponse.json({ error: isVideo ? "Max 100MB for video" : "Max 50MB for images" }, { status: 400 });
  }

  const extRaw = file.name.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "jpg");
  const ext = extRaw === "jpeg" ? "jpg" : ["jpg", "png", "webp", "mp4", "webm"].includes(extRaw) ? extRaw : isVideo ? "mp4" : "jpg";
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await admin.storage
    .from(bucket)
    .upload(filename, file, { upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = admin.storage.from(bucket).getPublicUrl(filename);
  return NextResponse.json({ url: data.publicUrl });
}
