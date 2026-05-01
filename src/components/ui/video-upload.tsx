"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface VideoUploadProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  label?: string;
}

/** Direct upload to Supabase Storage - bypasses Vercel 4.5MB body limit */
export function VideoUpload({
  value,
  onChange,
  bucket = "game-assets",
  folder = "hero",
  label = "Upload video",
}: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setError(null);
    setUploading(true);

    try {
      const ext = file.name.split(".").pop() || "mp4";
      const res = await fetch("/api/admin/upload-image/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket, folder, ext }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Signed URL request failed");

      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from(json.bucket)
        .uploadToSignedUrl(json.path, json.token, file, { upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage.from(json.bucket).getPublicUrl(json.path);
      onChange(data.publicUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setError("Only video files (mp4, webm) are allowed");
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError("Maximum file size is 100MB");
      return;
    }
    handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/") || file.size > 100 * 1024 * 1024) {
      setError("Only video (mp4, webm), max 100MB");
      return;
    }
    handleUpload(file);
  };

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm"
        className="hidden"
        onChange={handleFileChange}
      />

      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-border bg-muted h-28 w-full">
          <video
            src={value}
            className="h-full w-full object-cover"
            muted
            playsInline
            loop
            aria-label="Video preview"
          >
            <track kind="captions" src="/empty-captions.vtt" srcLang="en" label="English" default />
          </video>
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Replace"
            >
              <Upload className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="p-1.5 rounded-md bg-white/10 hover:bg-destructive/80 text-white transition-colors"
              title="Remove"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/50 hover:bg-muted hover:border-muted-foreground/40 transition-colors text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed h-28 w-full"
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Video className="h-4 w-4" />
              <span className="text-xs text-center leading-tight px-1">{label}</span>
              <span className="text-[10px] text-muted-foreground/80">MP4 or WebM, max 100MB</span>
            </>
          )}
        </button>
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
