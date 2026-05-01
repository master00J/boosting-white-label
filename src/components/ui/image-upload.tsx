"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Upload, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
  label?: string;
  aspectRatio?: "square" | "banner";
  /** Use admin API for upload (bypasses storage RLS) - use for game-assets in admin */
  useAdminUpload?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  bucket = "game-assets",
  folder = "logos",
  label = "Upload image",
  aspectRatio = "square",
  useAdminUpload = false,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setError(null);
    setUploading(true);

    try {
      if (useAdminUpload || bucket === "game-assets") {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("bucket", bucket);
        formData.append("folder", folder);
        const res = await fetch("/api/admin/upload-image", {
          method: "POST",
          body: formData,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed");
        onChange(json.url);
      } else {
        const supabase = createClient();
        const ext = file.name.split(".").pop();
        const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filename, file, { upsert: true });
        if (uploadError) throw new Error(uploadError.message);
        const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
        onChange(data.publicUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Only JPEG, PNG or WebP allowed (no SVG)");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("Maximum file size is 50MB");
      return;
    }
    handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Only JPEG, PNG or WebP allowed (no SVG)");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("Maximum file size is 50MB");
      return;
    }
    handleUpload(file);
  };

  const isBanner = aspectRatio === "banner";

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {value ? (
        <div className={`relative group rounded-lg overflow-hidden border border-border bg-muted ${isBanner ? "h-28 w-full" : "h-20 w-20"}`}>
          <Image
            src={value}
            alt="Uploaded"
            fill
            className="object-cover"
          />
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
          className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-muted/50 hover:bg-muted hover:border-muted-foreground/40 transition-colors text-muted-foreground disabled:opacity-50 disabled:cursor-not-allowed ${isBanner ? "h-28 w-full" : "h-20 w-20"}`}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span className="text-xs text-center leading-tight px-1">{label}</span>
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
