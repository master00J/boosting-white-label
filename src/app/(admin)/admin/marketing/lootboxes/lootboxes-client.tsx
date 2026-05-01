"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  Plus,
  Save,
  Loader2,
  Trash2,
  AlertCircle,
  Package,
  Gift,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Pencil,
  X,
  Search,
  Sword,
} from "lucide-react";
import { ImageUpload } from "@/components/ui/image-upload";

/* ─── Types ─── */
type PrizeType = "balance_credit" | "coupon" | "osrs_item";

interface OsrsItem {
  id: number;
  name: string;
  icon_url: string;
}

interface Prize {
  id: string;
  lootbox_id: string;
  name: string;
  description: string | null;
  prize_type: PrizeType;
  prize_value: number;
  weight: number;
  image_url: string | null;
  rarity: "common" | "uncommon" | "rare" | "legendary";
  coupon_config: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
  osrs_item_id: string | null;
}

interface Lootbox {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cost_points: number;
  is_active: boolean;
  sort_order: number;
  lootbox_prizes: Prize[];
  layer_closed:    string | null;
  layer_base:      string | null;
  layer_lid:       string | null;
  layer_open:      string | null;
  layer_glow:      string | null;
  layer_particles: string | null;
  layer_beam:      string | null;
}

const LAYER_FIELDS: { key: keyof Lootbox; label: string; hint: string }[] = [
  { key: "layer_closed",    label: "Closed box",    hint: "Box before opening" },
  { key: "layer_base",      label: "Base",          hint: "Bottom of the box (lid removed)" },
  { key: "layer_lid",       label: "Lid",           hint: "Lid that flies up" },
  { key: "layer_open",      label: "Open box",      hint: "Box fully open" },
  { key: "layer_glow",      label: "Glow",          hint: "Glow effect behind box" },
  { key: "layer_particles", label: "Particles",     hint: "Burst particle effect" },
  { key: "layer_beam",      label: "Reward beam",   hint: "Light beam rising from box" },
];

const SPRITE_FRAMES_PREFIX = "sprite_frames:v1:";

function createSpriteFramesValue(urls: string[]) {
  return `${SPRITE_FRAMES_PREFIX}${JSON.stringify(urls)}`;
}

function parseSpriteFrames(value?: string | null): string[] {
  if (!value?.startsWith(SPRITE_FRAMES_PREFIX)) return [];
  try {
    const frames = JSON.parse(value.slice(SPRITE_FRAMES_PREFIX.length));
    return Array.isArray(frames) && frames.every((frame) => typeof frame === "string") ? frames : [];
  } catch {
    return [];
  }
}

type LootboxImageForm = {
  image_url: string;
  layer_closed: string;
  layer_base: string;
  layer_lid: string;
  layer_open: string;
  layer_glow: string;
  layer_particles: string;
  layer_beam: string;
};

interface Props {
  initialLootboxes: Lootbox[];
  initialSettings: Record<string, string>;
  stats: { totalOpens: number; totalPaidOut: number };
}

const RARITY_COLORS: Record<string, string> = {
  common: "#9ca3af",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  legendary: "#E8720C",
};

const INPUT_CLS =
  "w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-sm focus:outline-none focus:border-primary/50 transition-colors";

function calculateRTP(prizes: Prize[], costPoints: number): number {
  if (!prizes.length || !costPoints) return 0;
  const totalWeight = prizes.reduce((s, p) => s + p.weight, 0);
  if (!totalWeight) return 0;
  const ev = prizes.reduce(
    (s, p) => s + (p.weight / totalWeight) * Number(p.prize_value),
    0
  );
  return (ev / costPoints) * 100;
}

async function uploadLootboxFrame(blob: Blob, index: number) {
  const formData = new FormData();
  formData.append("file", new File([blob], `frame-${index + 1}.png`, { type: "image/png" }));
  formData.append("bucket", "game-assets");
  formData.append("folder", "lootboxes/sprite-frames");

  const res = await fetch("/api/admin/upload-image", {
    method: "POST",
    body: formData,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Frame upload failed");
  return json.url as string;
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Could not render sprite frame"));
      else resolve(blob);
    }, "image/png");
  });
}

function removeBorderCheckerBackground(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  const seen = new Uint8Array(width * height);
  const queue: number[] = [];

  const isBackground = (index: number) => {
    const offset = index * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const a = data[offset + 3];
    return a === 0 || (Math.min(r, g, b) >= 218 && Math.max(r, g, b) - Math.min(r, g, b) <= 18);
  };

  for (let x = 0; x < width; x += 1) {
    queue.push(x, (height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    queue.push(y * width, y * width + width - 1);
  }

  while (queue.length) {
    const index = queue.pop();
    if (index === undefined || seen[index] || !isBackground(index)) continue;
    seen[index] = 1;
    data[index * 4 + 3] = 0;
    const x = index % width;
    const y = Math.floor(index / width);
    if (x > 0) queue.push(index - 1);
    if (x < width - 1) queue.push(index + 1);
    if (y > 0) queue.push(index - width);
    if (y < height - 1) queue.push(index + width);
  }

  ctx.putImageData(image, 0, 0);
}

async function splitAndUploadSpriteSheet(file: File, frameCount: number) {
  const bitmap = await createImageBitmap(file);
  const frameWidth = bitmap.width / frameCount;
  const frameHeight = bitmap.height;
  const urls: string[] = [];

  for (let index = 0; index < frameCount; index += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(frameWidth);
    canvas.height = frameHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not supported in this browser");
    ctx.drawImage(
      bitmap,
      Math.round(index * frameWidth),
      0,
      Math.round(frameWidth),
      frameHeight,
      0,
      0,
      Math.round(frameWidth),
      frameHeight
    );
    removeBorderCheckerBackground(canvas);
    const blob = await canvasToBlob(canvas);
    urls.push(await uploadLootboxFrame(blob, index));
  }

  bitmap.close();
  return urls;
}

function SpriteSheetUpload({
  value,
  onApply,
}: {
  value: string;
  onApply: (updates: Partial<LootboxImageForm>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [frameCount, setFrameCount] = useState(8);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const frames = parseSpriteFrames(value);

  const handleFile = async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const urls = await splitAndUploadSpriteSheet(file, frameCount);
      onApply({
        image_url: urls[0] ?? "",
        layer_closed: createSpriteFramesValue(urls),
        layer_base: "",
        layer_lid: "",
        layer_open: urls[urls.length - 1] ?? "",
        layer_glow: "",
        layer_particles: "",
        layer_beam: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sprite upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-primary">Sprite-sheet animation</p>
          <p className="text-[11px] text-[var(--text-muted)]">
            Upload one horizontal sprite-sheet. We split it into frames automatically and use it for card hover + opening reveal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-[var(--text-muted)]">
            Frames
            <input
              type="number"
              min="2"
              max="12"
              value={frameCount}
              onChange={(e) => setFrameCount(Math.max(2, Math.min(12, Number(e.target.value) || 8)))}
              className="ml-1 w-14 rounded-md border border-[var(--border-default)] bg-[var(--bg-card)] px-2 py-1 text-xs text-white"
            />
          </label>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
            {uploading ? "Uploading..." : "Upload sheet"}
          </button>
        </div>
      </div>
      {frames.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto rounded-lg bg-black/20 p-2">
          {frames.map((frame, index) => (
            <Image key={frame} src={frame} alt={`Frame ${index + 1}`} width={44} height={44} className="h-11 w-11 rounded-md object-contain bg-black/20" />
          ))}
          <span className="text-[10px] text-green-400">{frames.length} frames active</span>
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════ */
export default function LootboxesClient({
  initialLootboxes,
  initialSettings,
  stats,
}: Props) {
  const [lootboxes, setLootboxes] = useState<Lootbox[]>(initialLootboxes);
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [expandedBox, setExpandedBox] = useState<string | null>(null);

  const toggleEnabled = async () => {
    const next = settings.lootbox_enabled === "true" ? "false" : "true";
    setSettings((p) => ({ ...p, lootbox_enabled: next }));
    await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: { lootbox_enabled: next } }),
    });
  };

  /* ─── Create ─── */
  const [showCreate, setShowCreate] = useState(false);
  const emptyBoxForm = {
    name: "", description: "", cost_points: "100", image_url: "",
    layer_closed: "", layer_base: "", layer_lid: "", layer_open: "",
    layer_glow: "", layer_particles: "", layer_beam: "",
  };
  const [boxForm, setBoxForm] = useState(emptyBoxForm);
  const [boxError, setBoxError] = useState("");

  const createLootbox = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setBoxError("");
    try {
      const res = await fetch("/api/admin/lootboxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: boxForm.name,
          description: boxForm.description || null,
          cost_points: parseInt(boxForm.cost_points) || 100,
          image_url: boxForm.image_url || null,
          layer_closed:    boxForm.layer_closed    || null,
          layer_base:      boxForm.layer_base      || null,
          layer_lid:       boxForm.layer_lid       || null,
          layer_open:      boxForm.layer_open       || null,
          layer_glow:      boxForm.layer_glow      || null,
          layer_particles: boxForm.layer_particles || null,
          layer_beam:      boxForm.layer_beam      || null,
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      const data = await res.json();
      setLootboxes((p) => [...p, { ...data, lootbox_prizes: [] }]);
      setShowCreate(false);
      setBoxForm(emptyBoxForm);
    } catch (err) {
      setBoxError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const deleteLootbox = async (id: string) => {
    if (!confirm("Delete this lootbox and all its prizes?")) return;
    await fetch(`/api/admin/lootboxes/${id}`, { method: "DELETE" });
    setLootboxes((p) => p.filter((b) => b.id !== id));
  };

  const updateLootbox = (id: string, updates: Partial<Lootbox>) => {
    setLootboxes((p) => p.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Marketing</p>
        <h1 className="font-heading text-2xl font-semibold">Lootboxes</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-[var(--text-muted)]">Total opens</span>
          </div>
          <p className="text-2xl font-bold">{stats.totalOpens.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
          <div className="flex items-center gap-2 mb-1">
            <Gift className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-[var(--text-muted)]">Balance paid out</span>
          </div>
          <p className="text-2xl font-bold">${stats.totalPaidOut.toFixed(2)}</p>
        </div>
      </div>

      {/* Toggle */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={toggleEnabled}
            className={`relative w-10 h-6 rounded-full transition-colors ${settings.lootbox_enabled === "true" ? "bg-primary" : "bg-[var(--bg-elevated)]"}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.lootbox_enabled === "true" ? "translate-x-5" : "translate-x-1"}`} />
          </div>
          <div>
            <span className="text-sm font-medium">Lootbox system enabled</span>
            <p className="text-xs text-[var(--text-muted)]">When disabled, lootboxes are hidden from the storefront</p>
          </div>
        </label>
      </div>

      {/* Create */}
      <div className="flex justify-end">
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> New lootbox
        </button>
      </div>

      {showCreate && (
        <form onSubmit={createLootbox} className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
          <h2 className="font-heading font-semibold text-sm">Create lootbox</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Name</label>
              <input required value={boxForm.name} onChange={(e) => setBoxForm((p) => ({ ...p, name: e.target.value }))} placeholder="Bronze Chest" className={INPUT_CLS.replace("bg-[var(--bg-card)]", "bg-[var(--bg-elevated)]")} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Cost (loyalty points)</label>
              <input required type="number" min="1" value={boxForm.cost_points} onChange={(e) => setBoxForm((p) => ({ ...p, cost_points: e.target.value }))} className={INPUT_CLS.replace("bg-[var(--bg-card)]", "bg-[var(--bg-elevated)]")} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Description</label>
              <input value={boxForm.description} onChange={(e) => setBoxForm((p) => ({ ...p, description: e.target.value }))} placeholder="A basic lootbox with common rewards" className={INPUT_CLS.replace("bg-[var(--bg-card)]", "bg-[var(--bg-elevated)]")} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Preview image <span className="text-[var(--text-muted)] font-normal">(shown on lootbox card, optional)</span></label>
              <ImageUpload
                value={boxForm.image_url}
                onChange={(url) => setBoxForm((p) => ({ ...p, image_url: url }))}
                bucket="game-assets"
                folder="lootboxes"
                label="Upload preview image"
                aspectRatio="square"
              />
            </div>
            <div className="col-span-2">
              <SpriteSheetUpload
                value={boxForm.layer_closed}
                onApply={(updates) => setBoxForm((p) => ({ ...p, ...updates }))}
              />
            </div>
          </div>

          {/* Animation layers */}
          <details className="rounded-xl border border-[var(--border-default)] overflow-hidden">
            <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer text-xs font-semibold select-none hover:bg-white/[0.02]">
              <Package className="h-3.5 w-3.5 text-primary" />
              Legacy animation layers
              <span className="ml-1 text-[var(--text-muted)] font-normal">(optional: upload separate PNG layers instead of a sprite-sheet)</span>
            </summary>
            <div className="grid grid-cols-2 gap-4 px-4 pb-4 pt-2 border-t border-[var(--border-default)] bg-[var(--bg-elevated)]/30">
              {LAYER_FIELDS.map(({ key, label, hint }) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-0.5">{label}</label>
                  <p className="text-[10px] text-[var(--text-muted)] mb-1.5">{hint}</p>
                  <ImageUpload
                    value={key === "layer_closed" && parseSpriteFrames(boxForm.layer_closed).length ? "" : ((boxForm as Record<string, string>)[key] ?? "")}
                    onChange={(url) => setBoxForm((p) => ({ ...p, [key]: url }))}
                    bucket="game-assets"
                    folder="lootboxes/layers"
                    label={`Upload ${label}`}
                    aspectRatio="square"
                  />
                </div>
              ))}
            </div>
          </details>

          {boxError && <div className="flex items-center gap-2 text-xs text-red-400"><AlertCircle className="h-3.5 w-3.5" />{boxError}</div>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-xs">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-40">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Create
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-4">
        {lootboxes.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No lootboxes yet</p>
          </div>
        ) : (
          lootboxes.map((box) => (
            <LootboxCard
              key={box.id}
              box={box}
              expanded={expandedBox === box.id}
              onToggleExpand={() => setExpandedBox((p) => (p === box.id ? null : box.id))}
              onDelete={() => deleteLootbox(box.id)}
              onUpdate={(updates) => updateLootbox(box.id, updates)}
              onPrizesChange={(prizes) =>
                setLootboxes((p) => p.map((b) => (b.id === box.id ? { ...b, lootbox_prizes: prizes } : b)))
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Lootbox Card (with inline editing)
   ═══════════════════════════════════════════════ */
function LootboxCard({
  box,
  expanded,
  onToggleExpand,
  onDelete,
  onUpdate,
  onPrizesChange,
}: {
  box: Lootbox;
  expanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<Lootbox>) => void;
  onPrizesChange: (prizes: Prize[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: box.name,
    description: box.description || "",
    cost_points: String(box.cost_points),
    image_url: box.image_url || "",
    layer_closed:    box.layer_closed    || "",
    layer_base:      box.layer_base      || "",
    layer_lid:       box.layer_lid       || "",
    layer_open:      box.layer_open      || "",
    layer_glow:      box.layer_glow      || "",
    layer_particles: box.layer_particles || "",
    layer_beam:      box.layer_beam      || "",
  });

  const rtp = calculateRTP(box.lootbox_prizes, box.cost_points);
  const rtpColor = rtp >= 92 && rtp <= 96 ? "text-green-400" : rtp > 0 ? "text-red-400" : "text-[var(--text-muted)]";

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditForm({
      name: box.name,
      description: box.description || "",
      cost_points: String(box.cost_points),
      image_url: box.image_url || "",
      layer_closed:    box.layer_closed    || "",
      layer_base:      box.layer_base      || "",
      layer_lid:       box.layer_lid       || "",
      layer_open:      box.layer_open      || "",
      layer_glow:      box.layer_glow      || "",
      layer_particles: box.layer_particles || "",
      layer_beam:      box.layer_beam      || "",
    });
    setEditing(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: editForm.name,
        description: editForm.description || null,
        cost_points: parseInt(editForm.cost_points) || 100,
        image_url: editForm.image_url || null,
        layer_closed:    editForm.layer_closed    || null,
        layer_base:      editForm.layer_base      || null,
        layer_lid:       editForm.layer_lid       || null,
        layer_open:      editForm.layer_open      || null,
        layer_glow:      editForm.layer_glow      || null,
        layer_particles: editForm.layer_particles || null,
        layer_beam:      editForm.layer_beam      || null,
      };
      const res = await fetch(`/api/admin/lootboxes/${box.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Update failed");
      onUpdate(payload);
      setEditing(false);
    } catch {
      // keep form open on error
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const res = await fetch(`/api/admin/lootboxes/${box.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !box.is_active }),
    });
    if (res.ok) onUpdate({ is_active: !box.is_active });
  };

  return (
    <div className="rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-white/[0.02] transition-colors" onClick={onToggleExpand}>
        <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center flex-shrink-0">
          {box.image_url ? (
            <Image src={box.image_url} alt={box.name} width={32} height={32} className="object-contain" />
          ) : (
            <Package className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">{box.name}</h3>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${box.is_active ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
              {box.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {box.cost_points} points &middot; {box.lootbox_prizes.length} prizes &middot; <span className={rtpColor}>RTP {rtp.toFixed(1)}%</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={startEdit} className="text-[var(--text-muted)] hover:text-primary transition-colors" title="Edit">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={toggleActive} className="text-xs px-2 py-1 rounded-lg border border-[var(--border-default)] hover:bg-white/5 transition-colors">
            {box.is_active ? "Deactivate" : "Activate"}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-[var(--text-muted)] hover:text-red-400 transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
          {expanded ? <ChevronDown className="h-4 w-4 text-[var(--text-muted)]" /> : <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <form onSubmit={saveEdit} className="border-t border-[var(--border-default)] p-4 bg-[var(--bg-elevated)]/50 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Edit lootbox</h4>
            <button type="button" onClick={() => setEditing(false)} className="text-[var(--text-muted)] hover:text-white"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Name</label>
              <input required value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} className={INPUT_CLS} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Cost (loyalty points)</label>
              <input required type="number" min="1" value={editForm.cost_points} onChange={(e) => setEditForm((p) => ({ ...p, cost_points: e.target.value }))} className={INPUT_CLS} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Description</label>
              <input value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} className={INPUT_CLS} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1">Preview image <span className="text-[var(--text-muted)] font-normal">(optional)</span></label>
              <ImageUpload
                value={editForm.image_url}
                onChange={(url) => setEditForm((p) => ({ ...p, image_url: url }))}
                bucket="game-assets"
                folder="lootboxes"
                label="Upload preview image"
                aspectRatio="square"
              />
            </div>
            <div className="col-span-2">
              <SpriteSheetUpload
                value={editForm.layer_closed}
                onApply={(updates) => setEditForm((p) => ({ ...p, ...updates }))}
              />
            </div>
          </div>

          {/* Animation layers */}
          <details className="rounded-xl border border-[var(--border-default)] overflow-hidden">
            <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer text-xs font-semibold select-none hover:bg-white/[0.02]">
              <Package className="h-3.5 w-3.5 text-primary" />
              Legacy animation layers
              <span className="ml-1 text-[var(--text-muted)] font-normal">(optional separate PNG layers)</span>
              {LAYER_FIELDS.some(({ key }) => (editForm as Record<string, string>)[key]) && (
                <span className="ml-auto text-[10px] text-green-400">
                  {LAYER_FIELDS.filter(({ key }) => {
                    if (key === "layer_closed" && parseSpriteFrames(editForm.layer_closed).length) return false;
                    return (editForm as Record<string, string>)[key];
                  }).length}/7 uploaded
                </span>
              )}
            </summary>
            <div className="grid grid-cols-2 gap-4 px-3 pb-3 pt-2 border-t border-[var(--border-default)] bg-[var(--bg-elevated)]/30">
              {LAYER_FIELDS.map(({ key, label, hint }) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-0.5">{label}</label>
                  <p className="text-[10px] text-[var(--text-muted)] mb-1.5">{hint}</p>
                  <ImageUpload
                    value={key === "layer_closed" && parseSpriteFrames(editForm.layer_closed).length ? "" : ((editForm as Record<string, string>)[key] ?? "")}
                    onChange={(url) => setEditForm((p) => ({ ...p, [key]: url }))}
                    bucket="game-assets"
                    folder="lootboxes/layers"
                    label={`Upload ${label}`}
                    aspectRatio="square"
                  />
                </div>
              ))}
            </div>
          </details>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-xs">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-40">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </button>
          </div>
        </form>
      )}

      {/* Expanded: prizes */}
      {expanded && (
        <div className="border-t border-[var(--border-default)] p-4">
          <div className="mb-4 p-3 rounded-xl bg-[var(--bg-elevated)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium">Return to Player (RTP)</span>
              <span className={`text-sm font-bold ${rtpColor}`}>{rtp.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--bg-card)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(rtp, 100)}%`,
                  background: rtp >= 92 && rtp <= 96 ? "linear-gradient(90deg, #22c55e, #16a34a)" : "linear-gradient(90deg, #ef4444, #dc2626)",
                }}
              />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Target: 94%. Green zone: 92-96%.</p>
          </div>
          <PrizeManager lootboxId={box.id} prizes={box.lootbox_prizes} onChange={onPrizesChange} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   Prize Manager (with inline editing)
   ═══════════════════════════════════════════════ */
function PrizeManager({
  lootboxId,
  prizes,
  onChange,
}: {
  lootboxId: string;
  prizes: Prize[];
  onChange: (prizes: Prize[]) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingPrize, setEditingPrize] = useState<string | null>(null);

  const emptyForm = {
    name: "",
    prize_type: "balance_credit" as PrizeType,
    prize_value: "",
    weight: "10",
    rarity: "common",
    coupon_discount_type: "percentage",
    coupon_max_uses: "1",
    coupon_expires_days: "30",
    image_url: "",
    osrs_item_id: "",
  };
  const [form, setForm] = useState(emptyForm);

  // OSRS item search state
  const [itemQuery, setItemQuery] = useState("");
  const [itemResults, setItemResults] = useState<OsrsItem[]>([]);
  const [itemSearching, setItemSearching] = useState(false);
  const itemDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (form.prize_type !== "osrs_item" || itemQuery.length < 2) {
      setItemResults([]);
      return;
    }
    if (itemDebounceRef.current) clearTimeout(itemDebounceRef.current);
    itemDebounceRef.current = setTimeout(async () => {
      setItemSearching(true);
      try {
        const res = await fetch(`/api/osrs/items/search?q=${encodeURIComponent(itemQuery)}`);
        const data = await res.json();
        setItemResults(Array.isArray(data) ? data : []);
      } catch {
        setItemResults([]);
      } finally {
        setItemSearching(false);
      }
    }, 300);
    return () => { if (itemDebounceRef.current) clearTimeout(itemDebounceRef.current); };
  }, [itemQuery, form.prize_type]);

  const selectOsrsItem = (item: OsrsItem) => {
    setForm((p) => ({
      ...p,
      name: item.name,
      image_url: item.icon_url,
      osrs_item_id: String(item.id),
    }));
    setItemQuery(item.name);
    setItemResults([]);
  };

  const submitPrize = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const payload: Record<string, unknown> = {
      name: form.name,
      prize_type: form.prize_type,
      prize_value: parseFloat(form.prize_value) || 0,
      weight: parseInt(form.weight) || 1,
      rarity: form.rarity,
      image_url: form.image_url || null,
      osrs_item_id: form.prize_type === "osrs_item" ? (form.osrs_item_id || null) : null,
      coupon_config:
        form.prize_type === "coupon"
          ? { discount_type: form.coupon_discount_type, max_uses: parseInt(form.coupon_max_uses) || 1, expires_days: parseInt(form.coupon_expires_days) || 30 }
          : {},
    };

    try {
      if (editingPrize) {
        const res = await fetch(`/api/admin/lootboxes/${lootboxId}/prizes/${editingPrize}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Update failed");
        }
        const data = await res.json();
        onChange(prizes.map((p) => (p.id === editingPrize ? data : p)));
      } else {
        const res = await fetch(`/api/admin/lootboxes/${lootboxId}/prizes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? "Create failed");
        }
        const data = await res.json();
        onChange([...prizes, data]);
      }
      setShowForm(false);
      setEditingPrize(null);
      setForm(emptyForm);
      setItemQuery("");
      setItemResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const startEditPrize = (prize: Prize) => {
    const cfg = prize.coupon_config || {};
    setForm({
      name: prize.name,
      prize_type: prize.prize_type,
      prize_value: String(prize.prize_value),
      weight: String(prize.weight),
      rarity: prize.rarity,
      coupon_discount_type: (cfg.discount_type as string) || "percentage",
      coupon_max_uses: String(cfg.max_uses || 1),
      coupon_expires_days: String(cfg.expires_days || 30),
      image_url: prize.image_url || "",
      osrs_item_id: prize.osrs_item_id || "",
    });
    if (prize.prize_type === "osrs_item") setItemQuery(prize.name);
    setEditingPrize(prize.id);
    setShowForm(true);
  };

  const deletePrize = async (prizeId: string) => {
    await fetch(`/api/admin/lootboxes/${lootboxId}/prizes/${prizeId}`, { method: "DELETE" });
    onChange(prizes.filter((p) => p.id !== prizeId));
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingPrize(null);
    setForm(emptyForm);
    setError("");
    setItemQuery("");
    setItemResults([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Prizes</h4>
        <button onClick={() => { cancelForm(); setShowForm(true); }} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg-elevated)] text-xs font-medium hover:bg-white/10 transition-colors">
          <Plus className="h-3 w-3" /> Add prize
        </button>
      </div>

      {showForm && (
        <form onSubmit={submitPrize} className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
          <div className="col-span-2 flex items-center justify-between">
            <span className="text-xs font-semibold">{editingPrize ? "Edit prize" : "New prize"}</span>
            <button type="button" onClick={cancelForm} className="text-[var(--text-muted)] hover:text-white"><X className="h-3.5 w-3.5" /></button>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Name</label>
            <input required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="$5 Balance" className={INPUT_CLS} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Type</label>
            <select
              value={form.prize_type}
              onChange={(e) => {
                setForm((p) => ({ ...p, prize_type: e.target.value as PrizeType, name: "", image_url: "", osrs_item_id: "" }));
                setItemQuery("");
                setItemResults([]);
              }}
              className={INPUT_CLS}
            >
              <option value="balance_credit">Balance credit ($)</option>
              <option value="coupon">Discount coupon</option>
              <option value="osrs_item">OSRS Item (delivery)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">
              {form.prize_type === "balance_credit" ? "Value ($)" : form.prize_type === "osrs_item" ? "Est. value ($)" : "Discount value"}
            </label>
            <input required type="number" min="0" step="0.01" value={form.prize_value} onChange={(e) => setForm((p) => ({ ...p, prize_value: e.target.value }))} className={INPUT_CLS} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Weight (higher = more common)</label>
            <input required type="number" min="1" value={form.weight} onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))} className={INPUT_CLS} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Rarity</label>
            <select value={form.rarity} onChange={(e) => setForm((p) => ({ ...p, rarity: e.target.value }))} className={INPUT_CLS}>
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="legendary">Legendary</option>
            </select>
          </div>

          {/* OSRS Item picker */}
          {form.prize_type === "osrs_item" && (
            <div className="col-span-2 space-y-2">
              <label className="block text-xs font-medium">Search OSRS item</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={itemQuery}
                  onChange={(e) => setItemQuery(e.target.value)}
                  placeholder="Abyssal whip, Bandos chestplate…"
                  className={`${INPUT_CLS} pl-8`}
                />
                {itemSearching && (
                  <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-[var(--text-muted)]" />
                )}
              </div>
              {itemResults.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] divide-y divide-[var(--border-default)]">
                  {itemResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectOsrsItem(item)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.icon_url} alt={item.name} width={24} height={24} className="object-contain flex-shrink-0" />
                      <span className="text-xs">{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {form.osrs_item_id && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.image_url} alt={form.name} width={32} height={32} className="object-contain" />
                  <div>
                    <p className="text-xs font-semibold">{form.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Item ID: {form.osrs_item_id} · Delivered by booster</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {form.prize_type === "coupon" && (
            <>
              <div>
                <label className="block text-xs font-medium mb-1">Discount type</label>
                <select value={form.coupon_discount_type} onChange={(e) => setForm((p) => ({ ...p, coupon_discount_type: e.target.value }))} className={INPUT_CLS}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed ($)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Max uses</label>
                <input type="number" min="1" value={form.coupon_max_uses} onChange={(e) => setForm((p) => ({ ...p, coupon_max_uses: e.target.value }))} className={INPUT_CLS} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Expires (days)</label>
                <input type="number" min="1" value={form.coupon_expires_days} onChange={(e) => setForm((p) => ({ ...p, coupon_expires_days: e.target.value }))} className={INPUT_CLS} />
              </div>
            </>
          )}

          {error && <div className="col-span-2 flex items-center gap-2 text-xs text-red-400"><AlertCircle className="h-3.5 w-3.5" />{error}</div>}
          <div className="col-span-2 flex justify-end gap-2">
            <button type="button" onClick={cancelForm} className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-xs">Cancel</button>
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-40">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {editingPrize ? "Save" : "Add prize"}
            </button>
          </div>
        </form>
      )}

      {/* Prize list */}
      <div className="space-y-2">
        {prizes.length === 0 ? (
          <p className="text-center text-xs text-[var(--text-muted)] py-4">No prizes configured</p>
        ) : (
          prizes.map((prize) => (
            <div key={prize.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-elevated)]">
              {prize.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={prize.image_url} alt={prize.name} width={28} height={28} className="object-contain flex-shrink-0" />
              ) : prize.prize_type === "osrs_item" ? (
                <Sword className="h-4 w-4 text-primary flex-shrink-0" />
              ) : (
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: RARITY_COLORS[prize.rarity] }} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{prize.name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {prize.prize_type === "balance_credit"
                    ? `$${Number(prize.prize_value).toFixed(2)}`
                    : prize.prize_type === "osrs_item"
                    ? `~$${Number(prize.prize_value).toFixed(2)} (OSRS item delivery)`
                    : `${Number(prize.prize_value)}% discount`}
                  {" "}&middot; weight: {prize.weight} &middot;{" "}
                  <span style={{ color: RARITY_COLORS[prize.rarity] }}>{prize.rarity}</span>
                </p>
              </div>
              <button onClick={() => startEditPrize(prize)} className="text-[var(--text-muted)] hover:text-primary transition-colors" title="Edit prize">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => deletePrize(prize.id)} className="text-[var(--text-muted)] hover:text-red-400 transition-colors" title="Delete prize">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
