"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  ArrowLeft,
  GripVertical,
  Settings2,
  X,
  Zap,
  Package,
  BarChart2,
  Layers,
  Hash,
  Trophy,
  ScrollText,
  AlertCircle,
  CheckCircle2,
  EyeOff,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/image-upload";
import { cn } from "@/lib/utils/cn";
import ServiceFormBuilder from "@/components/admin/service-form-builder";
import { slugify } from "@/lib/utils/slugify";
import type { Database } from "@/types/database";
import type { FormConfig, PriceMatrix } from "@/types/service-config";
import type { GameSkill, GameMethod } from "../../../setup/setup-client";

type Game = Database["public"]["Tables"]["games"]["Row"];
type Service = Database["public"]["Tables"]["services"]["Row"];

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  game_id: string | null;
}

// ─── Pricing type config ───────────────────────────────────────────────────────

const PRICING_CONFIG: Record<
  string,
  { label: string; Icon: React.ElementType; accent: string; badge: string }
> = {
  xp_based: {
    label: "XP Based",
    Icon: Zap,
    accent: "border-l-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  boss_tiered: {
    label: "Boss Tiered",
    Icon: Trophy,
    accent: "border-l-cyan-500",
    badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  },
  stat_based: {
    label: "Stat Based",
    Icon: BarChart2,
    accent: "border-l-blue-500",
    badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  per_item: {
    label: "Per Item",
    Icon: Package,
    accent: "border-l-violet-500",
    badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  },
  per_unit: {
    label: "Per Unit",
    Icon: Hash,
    accent: "border-l-amber-500",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  per_item_stat_based: {
    label: "Quests",
    Icon: ScrollText,
    accent: "border-l-pink-500",
    badge: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  },
};

const DEFAULT_PRICING = {
  label: "No pricing",
  Icon: Layers,
  accent: "border-l-white/10",
  badge: "bg-white/5 text-white/40 border-white/10",
};

function getPricingConfig(service: Service) {
  const pm = service.price_matrix as { type?: string } | null;
  if (!pm?.type) return DEFAULT_PRICING;
  return PRICING_CONFIG[pm.type] ?? { ...DEFAULT_PRICING, label: pm.type };
}

// ─── ServiceForm ──────────────────────────────────────────────────────────────

function ServiceForm({
  gameId,
  categoryId,
  gameSkills,
  gameMethods,
  initial,
  onSave,
  onCancel,
  onDirtyChange,
}: {
  gameId: string;
  categoryId: string;
  gameSkills: GameSkill[];
  gameMethods: GameMethod[];
  initial?: Partial<Service>;
  onSave: (data: Partial<Service>) => Promise<void>;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [orderCode, setOrderCode] = useState(initial?.order_code ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formConfig, setFormConfig] = useState<FormConfig | null>(
    initial?.form_config ? (initial.form_config as unknown as FormConfig) : null
  );
  const [priceMatrix, setPriceMatrix] = useState<PriceMatrix | null>(
    initial?.price_matrix ? (initial.price_matrix as unknown as PriceMatrix) : null
  );

  const initialSnapshot = useMemo(
    () =>
      JSON.stringify({
        name: initial?.name ?? "",
        slug: initial?.slug ?? "",
        orderCode: initial?.order_code ?? "",
        description: initial?.description ?? "",
        imageUrl: initial?.image_url ?? "",
        formConfig: initial?.form_config ?? null,
        priceMatrix: initial?.price_matrix ?? null,
      }),
    [initial]
  );

  const currentSnapshot = JSON.stringify({
    name,
    slug,
    orderCode,
    description,
    imageUrl,
    formConfig,
    priceMatrix,
  });

  const isDirty = currentSnapshot !== initialSnapshot;
  const validationMessage =
    !name.trim()
      ? "Service name is required."
      : !slug.trim()
        ? "URL slug is required."
        : !formConfig || !priceMatrix
          ? "Choose a pricing model and configure pricing before saving."
          : null;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!initial?.slug) setSlug(slugify(v));
    if (formError) setFormError(null);
  };

  const handlePricingChange = (fc: FormConfig, pm: PriceMatrix) => {
    setFormConfig(fc);
    setPriceMatrix(pm);
    if (formError) setFormError(null);
  };

  const handleCancel = () => {
    if (isDirty && !confirm("You have unsaved changes. Close without saving?")) {
      return;
    }
    onCancel();
  };

  const handleSubmit = async () => {
    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    setSaving(true);
    setFormError(null);
    await onSave({
      game_id: gameId,
      category_id: categoryId,
      name: name.trim(),
      slug: slug.trim(),
      order_code: orderCode.trim() || null,
      description: description || null,
      image_url: imageUrl || null,
      base_price: 0,
      form_config: formConfig as unknown as Database["public"]["Tables"]["services"]["Row"]["form_config"],
      price_matrix: priceMatrix as unknown as Database["public"]["Tables"]["services"]["Row"]["price_matrix"],
    });
    setSaving(false);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto w-full max-w-6xl space-y-8">

        {/* Basic info */}
        <section className="rounded-2xl border border-white/12 bg-[#111827] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.28)] space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-white">Basics</p>
              <p className="text-sm text-white/65 mt-1">
                Configure the public-facing service details for this category.
              </p>
            </div>
            {isDirty && (
              <span className="inline-flex items-center rounded-full border border-amber-400/30 bg-amber-400/15 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
                Unsaved changes
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-white/85">Service name <span className="text-red-400">*</span></Label>
              <Input
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. 99 Fishing"
                className="bg-white/[0.08] border-white/[0.16] text-white placeholder:text-white/35 focus:border-primary/60"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-white/85">URL slug <span className="text-red-400">*</span></Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="99-fishing"
                className="bg-white/[0.08] border-white/[0.16] text-white placeholder:text-white/35 focus:border-primary/60 font-mono text-sm"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-medium text-white/85">Order code <span className="text-white/25 font-normal">(for order IDs, e.g. INF, FCP, TOA)</span></Label>
              <Input
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                placeholder="e.g. INF, FCP, SKL"
                className="bg-white/[0.08] border-white/[0.16] text-white placeholder:text-white/35 focus:border-primary/60 font-mono text-sm max-w-[8rem]"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-white/85">Description <span className="text-white/25 font-normal">(optional)</span></Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Short description shown to customers..."
              className="bg-white/[0.08] border-white/[0.16] text-white placeholder:text-white/35 focus:border-primary/60 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-white/85">Service image <span className="text-white/25 font-normal">(optional)</span></Label>
            <ImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              bucket="game-assets"
              folder="services"
              label="Upload image"
              aspectRatio="banner"
            />
          </div>
        </section>

        {/* Pricing builder */}
        <section className="rounded-2xl border border-white/12 bg-[#111827] p-6 shadow-[0_16px_40px_rgba(0,0,0,0.28)] space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-white">Pricing setup</p>
              <p className="text-sm text-white/65 mt-1">
                Pick the pricing model and configure the storefront form for this service.
              </p>
            </div>
            {priceMatrix && (() => {
              const cfg = PRICING_CONFIG[(priceMatrix as { type?: string }).type ?? ""] ?? DEFAULT_PRICING;
              return (
                <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full border", cfg.badge)}>
                  {cfg.label}
                </span>
              );
            })()}
          </div>
          <ServiceFormBuilder
            formConfig={formConfig}
            priceMatrix={priceMatrix}
            onChange={handlePricingChange}
            gameSkills={gameSkills}
            gameMethods={gameMethods}
            gameId={gameId}
          />
        </section>
        </div>
      </div>

      {/* Sticky footer */}
      <div className="shrink-0 border-t border-white/[0.08] bg-[#0b1220]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1.5">
          <p className="text-sm text-white/75">
            {initial ? "Review the pricing summary and click Save changes when you're ready." : "The service will be inactive until you activate it."}
          </p>
          {(formError || validationMessage) && (
            <p className="text-sm text-amber-200">{formError ?? validationMessage}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={saving} className="border-white/[0.16] bg-white/[0.05] text-white/80 hover:text-white hover:border-white/30 hover:bg-white/[0.08]">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || Boolean(validationMessage)}
            className="min-w-[140px] shadow-lg shadow-primary/20"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving…
              </span>
            ) : initial ? "Save changes" : "Create service"}
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}

// ─── Slide-over panel ─────────────────────────────────────────────────────────

function SlideOver({
  open,
  title,
  subtitle,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "fixed inset-0 z-50 flex h-screen w-screen flex-col",
          "bg-[#07111f] shadow-2xl shadow-black/40",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="shrink-0 flex items-center justify-between px-6 py-5 border-b border-white/[0.08] bg-[#0b1220]/95 backdrop-blur">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
              Service editor
            </p>
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            {subtitle && <p className="text-sm text-white/70">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

// ─── ServiceRow ────────────────────────────────────────────────────────────────

function ServiceRow({
  service,
  onEdit,
  onDelete,
  onToggleActive,
  onToggleFeatured,
  dragHandleProps,
  isDragging,
}: {
  service: Service;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onToggleFeatured: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
}) {
  const pc = getPricingConfig(service);
  const PricingIcon = pc.Icon;

  return (
    <div
      className={cn(
        "group relative flex items-center gap-4 px-4 py-3.5 rounded-xl border border-l-2 transition-all duration-200",
        "bg-white/[0.02] hover:bg-white/[0.04]",
        isDragging ? "shadow-2xl shadow-black/40 scale-[1.01] z-50 bg-white/[0.06]" : "",
        service.is_active
          ? cn("border-white/[0.08]", pc.accent)
          : "border-white/[0.05] border-l-white/[0.08] opacity-55"
      )}
    >
      {/* Drag handle */}
      <button
        type="button"
        {...dragHandleProps}
        className="h-4 w-4 text-white/15 shrink-0 cursor-grab active:cursor-grabbing group-hover:text-white/40 transition-colors touch-none p-0 bg-transparent border-0 flex items-center justify-center"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Thumbnail */}
      <div className="w-11 h-11 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06] shrink-0 flex items-center justify-center">
        {service.image_url ? (
          <Image
            src={service.image_url}
            alt={service.name}
            width={44}
            height={44}
            className="object-cover w-full h-full"
          />
        ) : (
          <PricingIcon className={cn("h-4.5 w-4.5", pc.badge.split(" ").find(c => c.startsWith("text-")))} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-[var(--text-primary)] truncate">
            {service.name}
          </span>
          {service.is_featured && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Star className="h-2.5 w-2.5" />
              Featured
            </span>
          )}
          <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border", pc.badge)}>
            <PricingIcon className="h-2.5 w-2.5" />
            {pc.label}
          </span>
          {!service.is_active && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/[0.04] text-white/30 border border-white/[0.08]">
              <EyeOff className="h-2.5 w-2.5" />
              Inactive
            </span>
          )}
        </div>
        {service.description && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{service.description}</p>
        )}
        <p className="text-[10px] text-white/20 font-mono mt-0.5">/{service.slug}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {/* Featured toggle */}
        <button
          onClick={onToggleFeatured}
          title={service.is_featured ? "Remove featured" : "Mark as featured"}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs transition-all duration-200",
            service.is_featured
              ? "border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
              : "border-white/[0.08] text-white/50 hover:text-amber-400 hover:bg-amber-500/10"
          )}
        >
          <Star className="h-3.5 w-3.5" />
          Featured
        </button>

        {/* Active toggle */}
        <button
          onClick={onToggleActive}
          title={service.is_active ? "Deactivate" : "Activate"}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs transition-all duration-200",
            service.is_active
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400"
              : "border-white/[0.08] text-white/50 hover:text-emerald-400 hover:bg-emerald-500/10"
          )}
        >
          {service.is_active ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <EyeOff className="h-3.5 w-3.5" />
          )}
          {service.is_active ? "Active" : "Inactive"}
        </button>

        {/* Edit */}
        <button
          onClick={onEdit}
          title="Edit service"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-2 text-xs text-white/60 hover:text-white hover:bg-white/[0.07] transition-all duration-200"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>

        {/* Delete */}
        <button
          onClick={onDelete}
          title="Delete service"
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 py-2 text-xs text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── SortableServiceRow ───────────────────────────────────────────────────────

function SortableServiceRow(props: {
  service: Service;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onToggleFeatured: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.service.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ServiceRow
        {...props}
        isDragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>}
      />
    </div>
  );
}

// ─── ServicesClient (main) ────────────────────────────────────────────────────

export default function ServicesClient({
  game,
  category,
  initialServices,
  gameSkills,
  gameMethods,
}: {
  game: Game;
  category: Category;
  initialServices: Service[];
  gameSkills: GameSkill[];
  gameMethods: GameMethod[];
}) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [panelMode, setPanelMode] = useState<"create" | "edit" | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [panelDirty, setPanelDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = services.findIndex((s) => s.id === active.id);
    const newIndex = services.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(services, oldIndex, newIndex);
    setServices(reordered);
    // Persist new sort_order for all services
    await Promise.all(
      reordered.map((svc, idx) =>
        fetch("/api/admin/table/services", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: svc.id, sort_order: idx }),
        })
      )
    );
  };

  const openCreate = () => {
    setEditingService(null);
    setPanelDirty(false);
    setPanelMode("create");
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    setPanelDirty(false);
    setPanelMode("edit");
  };

  const closePanel = (force = false) => {
    if (!force && panelDirty && !confirm("You have unsaved changes. Close without saving?")) {
      return;
    }
    setPanelMode(null);
    setEditingService(null);
    setPanelDirty(false);
  };

  const handleCreate = async (data: Partial<Service>) => {
    setError(null);
    const res = await fetch("/api/admin/table/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...(data as Service), sort_order: services.length }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    setServices((prev) => [...prev, json as Service]);
    closePanel(true);
  };

  const handleUpdate = async (id: string, data: Partial<Service>) => {
    setError(null);
    const res = await fetch("/api/admin/table/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    setServices((prev) => prev.map((s) => (s.id === id ? json as Service : s)));
    closePanel(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this service? This cannot be undone.")) return;
    const res = await fetch("/api/admin/table/services", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) { const json = await res.json(); setError(json.error); return; }
    setServices((prev) => prev.filter((s) => s.id !== id));
  };

  const handleToggleActive = async (service: Service) => {
    const res = await fetch("/api/admin/table/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: service.id, is_active: !service.is_active }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    setServices((prev) => prev.map((s) => (s.id === service.id ? json as Service : s)));
  };

  const handleToggleFeatured = async (service: Service) => {
    const res = await fetch("/api/admin/table/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: service.id, is_featured: !service.is_featured }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error); return; }
    setServices((prev) => prev.map((s) => (s.id === service.id ? json as Service : s)));
  };

  const activeCount = services.filter((s) => s.is_active).length;

  return (
    <>
      <div className="space-y-6 max-w-4xl">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
          <Link
            href="/admin/games"
            className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Games
          </Link>
          <span className="text-white/20">/</span>
          <Link
            href={`/admin/games/${game.id}/categories`}
            className="hover:text-[var(--text-primary)] transition-colors"
          >
            {game.name}
          </Link>
          <span className="text-white/20">/</span>
          <span className="text-[var(--text-secondary)]">
            {category.icon} {category.name}
          </span>
        </nav>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
              {category.icon && <span>{category.icon}</span>}
              {category.name}
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {game.name} · Manage services and their pricing configuration
            </p>
            {/* Stats row */}
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Layers className="h-3 w-3" />
                <span>{services.length} {services.length === 1 ? "service" : "services"}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-400/70">
                <CheckCircle2 className="h-3 w-3" />
                <span>{activeCount} active</span>
              </div>
              {services.length - activeCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-white/25">
                  <EyeOff className="h-3 w-3" />
                  <span>{services.length - activeCount} inactive</span>
                </div>
              )}
            </div>
          </div>
          <Button
            onClick={openCreate}
            className="shrink-0 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add service
          </Button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto shrink-0 text-red-400/60 hover:text-red-400">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Pricing type legend */}
        {services.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/20 mr-1">Pricing types:</span>
            {Object.entries(PRICING_CONFIG).map(([key, cfg]) => {
              const hasType = services.some(
                (s) => (s.price_matrix as { type?: string } | null)?.type === key
              );
              if (!hasType) return null;
              const Icon = cfg.Icon;
              return (
                <span
                  key={key}
                  className={cn("inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border", cfg.badge)}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {cfg.label}
                </span>
              );
            })}
          </div>
        )}

        {/* Service list */}
        {services.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] border-dashed bg-white/[0.01] py-16 flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
              <Settings2 className="h-5 w-5 text-white/20" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/40">No services yet</p>
              <p className="text-xs text-white/20 mt-1">Add your first service to start configuring pricing.</p>
            </div>
            <Button onClick={openCreate} variant="outline" className="border-white/[0.1] text-white/50 hover:text-white hover:border-white/20">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add first service
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={services.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {services.map((service) => (
                  <SortableServiceRow
                    key={service.id}
                    service={service}
                    onEdit={() => openEdit(service)}
                    onDelete={() => handleDelete(service.id)}
                    onToggleActive={() => handleToggleActive(service)}
                    onToggleFeatured={() => handleToggleFeatured(service)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

      </div>

      {/* Slide-over panel */}
      <SlideOver
        open={panelMode !== null}
        title={panelMode === "create" ? "Create service" : `Edit service: ${editingService?.name ?? ""}`}
        subtitle={
          panelMode === "create"
            ? `Creating a new service in ${category.icon ?? ""} ${category.name} for ${game.name}`
            : `Editing ${category.icon ?? ""} ${category.name} in ${game.name}`
        }
        onClose={() => closePanel()}
      >
        <ServiceForm
          key={panelMode === "edit" ? (editingService?.id ?? "edit") : "create"}
          gameId={game.id}
          categoryId={category.id}
          gameSkills={gameSkills}
          gameMethods={gameMethods}
          initial={panelMode === "edit" ? editingService ?? undefined : undefined}
          onSave={
            panelMode === "create"
              ? handleCreate
              : (data) => handleUpdate(editingService!.id, data)
          }
          onCancel={() => closePanel()}
          onDirtyChange={setPanelDirty}
        />
      </SlideOver>
    </>
  );
}
