"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, UserCircle, Save, Loader2, Search, AlertCircle, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import GearSlotPicker from "@/components/storefront/GearSlotPicker";
import { OSRS_SKILLS } from "@/lib/osrs-skills";
import {
  normaliseEquipmentByStyle,
  EQUIPMENT_SLOTS,
  EQUIPMENT_LAYOUT,
  COMBAT_STYLES as OSRS_COMBAT_STYLES,
  type EquipmentByStyle,
  type CombatStyle,
} from "@/lib/osrs-equipment";
import {
  QUICK_SELECT_WEAPONS,
  ALL_SPECIAL_WEAPONS,
  getSpecialWeaponIcon,
  getSpecialWeaponLabel,
} from "@/lib/osrs-special-weapons";
import { saveLoadouts } from "@/app/(customer)/loadouts/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LoadoutSummary = {
  id: string;
  name: string;
  stats?: Record<string, number>;
  equipment?: Record<string, unknown>;
  special_weapons?: string[];
};

const DEFAULT_STATS: Record<string, number> = Object.fromEntries(
  OSRS_SKILLS.map((s) => [s.id, 1])
);

// ─── WikiImage helper (externe OSRS-wiki afbeeldingen) ────────────────────────

function WikiImg({ src, alt, size }: { src: string; alt: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) return <span className="text-[9px] text-[var(--text-muted)]">—</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- external OSRS wiki URLs, not optimizable via next/image
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="object-contain"
      onError={() => setFailed(true)}
    />
  );
}

// ─── Clearable number input ────────────────────────────────────────────────────

export function ClearableNumberInput({
  value,
  min,
  max,
  onChange,
  className,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseInt(raw);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      setRaw(String(clamped));
      onChange(clamped);
    } else {
      setRaw(String(value));
    }
  };

  return (
    <input
      type="number"
      min={min}
      max={max}
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
      className={className}
    />
  );
}

// ─── InlineLoadoutCreator ──────────────────────────────────────────────────────

export default function InlineLoadoutCreator({
  onCreated,
  onCancel,
  existingCount,
  editingLoadout,
}: {
  onCreated: (loadout: LoadoutSummary) => void;
  onCancel?: () => void;
  existingCount: number;
  /** Pre-fill with an existing loadout to edit it */
  editingLoadout?: LoadoutSummary | null;
}) {
  const isEditing = !!editingLoadout;
  const [name, setName] = useState(editingLoadout?.name ?? `Account ${existingCount + 1}`);
  const [stats, setStats] = useState<Record<string, number>>(
    editingLoadout?.stats ?? { ...DEFAULT_STATS }
  );
  const [equipment, setEquipment] = useState<EquipmentByStyle>(
    normaliseEquipmentByStyle((editingLoadout?.equipment ?? null) as Record<string, unknown> | null)
  );
  const [specialWeapons, setSpecialWeapons] = useState<string[]>(
    editingLoadout?.special_weapons ?? []
  );
  const [combatStyle, setCombatStyle] = useState<CombatStyle>("melee");
  const [activeSection, setActiveSection] = useState<"stats" | "gear" | "weapons">("gear");

  const [username, setUsername] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const importStats = async () => {
    const uname = username.trim();
    if (!uname) return;
    setImportLoading(true);
    setImportError(null);
    try {
      const res = await fetch(`/api/osrs-stats?player=${encodeURIComponent(uname)}`);
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? "Failed to fetch stats");
        return;
      }
      setStats((prev) => ({ ...prev, ...DEFAULT_STATS, ...data.stats }));
    } catch {
      setImportError("Network error");
    } finally {
      setImportLoading(false);
    }
  };

  const setEquipmentSlot = (slotId: string, itemId: string) => {
    setEquipment((prev) => ({
      ...prev,
      [combatStyle]: { ...prev[combatStyle], [slotId]: itemId },
    }));
  };

  const quickSelectWeapon = (itemId: string) => {
    setSpecialWeapons((prev) => {
      const idx = prev.findIndex((id) => !id);
      const arr = [...prev];
      if (idx >= 0) {
        arr[idx] = itemId;
        return arr;
      }
      return [...arr, itemId];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const id = isEditing ? editingLoadout!.id : `new-${Date.now()}`;
      const result = await saveLoadouts(
        [
          {
            id,
            name,
            stats,
            equipment,
            special_weapons: specialWeapons.filter(Boolean),
            sort_order: existingCount,
          },
        ],
        null
      );
      if (!result.success) {
        setSaveError(result.error);
        return;
      }
      const saved = isEditing
        ? result.loadouts.find((l) => l.id === editingLoadout!.id)
        : result.loadouts[result.loadouts.length - 1];
      if (saved)
        onCreated({
          id: saved.id,
          name: saved.name,
          stats: saved.stats,
          equipment: saved.equipment,
          special_weapons: saved.special_weapons,
        });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const selectedEquipment = equipment[combatStyle];

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border-default)] bg-[var(--bg-card)]">
        <UserCircle className="h-4 w-4 text-primary shrink-0" />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Account name"
          maxLength={30}
          className="flex-1 bg-transparent text-sm font-semibold text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)]"
        />
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Section tabs */}
      <div className="flex border-b border-[var(--border-default)]">
        {(["stats", "gear", "weapons"] as const).map((sec) => (
          <button
            key={sec}
            type="button"
            onClick={() => setActiveSection(sec)}
            className={cn(
              "flex-1 py-2 text-xs font-semibold transition-colors capitalize",
              activeSection === sec
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
            )}
          >
            {sec === "stats" ? "Stats" : sec === "gear" ? "Equipment" : "Spec Weapons"}
          </button>
        ))}
      </div>

      <div className="p-3 space-y-3">
        {/* ── Stats sectie ── */}
        {activeSection === "stats" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && importStats()}
                placeholder="OSRS username"
                className="flex-1 h-9 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-[var(--text-muted)]"
              />
              <button
                type="button"
                onClick={importStats}
                disabled={importLoading || !username.trim()}
                className="flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors shrink-0"
              >
                {importLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="h-3.5 w-3.5" />
                )}
                Import
              </button>
            </div>
            {importError && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {importError}
              </p>
            )}

            <div className="grid grid-cols-4 gap-1.5">
              {OSRS_SKILLS.map((skill) => (
                <div
                  key={skill.id}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)]"
                >
                  <Image
                    src={skill.icon}
                    alt={skill.label}
                    width={20}
                    height={20}
                    className="object-contain"
                    unoptimized
                  />
                  <span className="text-[9px] text-[var(--text-muted)] uppercase text-center leading-tight">
                    {skill.label}
                  </span>
                  <ClearableNumberInput
                    value={stats[skill.id] ?? 1}
                    min={1}
                    max={99}
                    onChange={(v) => setStats((prev) => ({ ...prev, [skill.id]: v }))}
                    className="w-10 h-7 rounded-md border border-[var(--border-default)] bg-[var(--bg-elevated)] text-center text-xs font-bold focus:outline-none focus:border-primary"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Equipment section ── */}
        {activeSection === "gear" && (
          <div className="space-y-3">
            <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] w-fit">
              {OSRS_COMBAT_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCombatStyle(s.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                    combatStyle === s.id ? "bg-primary text-white" : "text-[var(--text-muted)] hover:bg-white/5"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div
              className="inline-grid grid-cols-3 grid-rows-5 gap-1.5 w-[270px] p-3 rounded-xl bg-[#1a1520] border-2 border-[#2d2436]"
              style={{ boxShadow: "inset 0 0 15px rgba(0,0,0,0.3)" }}
            >
              {EQUIPMENT_LAYOUT.map(({ id, gridArea }) => {
                const slot = EQUIPMENT_SLOTS.find((s) => s.id === id)!;
                // itemName is stored as the actual item name (e.g. "Torva full helm")
                // or legacy slug (e.g. "torva_full_helm") for backward compat
                const itemName = selectedEquipment[id] ?? "";
                const iconUrl = itemName
                  ? `https://oldschool.runescape.wiki/images/${itemName.replace(/ /g, "_").replace(/'/g, "%27")}.png`
                  : "";
                return (
                  <div
                    key={id}
                    style={{ gridArea }}
                    className="group flex flex-col items-center justify-center gap-1 rounded-lg bg-[#161018] border border-[#3d3248] p-1.5 min-w-0 overflow-hidden"
                  >
                    <div className="w-10 h-10 flex-shrink-0 rounded border border-[#2d2436] overflow-hidden flex items-center justify-center bg-[#0d0a10]">
                      {iconUrl ? (
                        <WikiImg src={iconUrl} alt={itemName} size={36} />
                      ) : (
                        <span className="text-[9px] text-[#6b5b7a]">{slot.label[0]}</span>
                      )}
                    </div>
                    <GearSlotPicker
                      slotLabel={slot.label}
                      value={itemName}
                      onChange={(name) => setEquipmentSlot(id, name)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Special Weapons sectie ── */}
        {activeSection === "weapons" && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-muted)]">
              Quick select popular spec / switch weapons:
            </p>
            <div className="grid grid-cols-5 gap-2">
              {QUICK_SELECT_WEAPONS.filter((w) => w.id).map((w) => {
                const isSelected = specialWeapons.includes(w.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSpecialWeapons((prev) => prev.filter((id) => id !== w.id));
                      } else {
                        quickSelectWeapon(w.id);
                      }
                    }}
                    title={w.label}
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg border transition-colors overflow-hidden",
                      isSelected
                        ? "border-primary ring-2 ring-primary/50 bg-primary/20"
                        : "border-[var(--border-default)] bg-[var(--bg-card)] hover:border-primary/50"
                    )}
                  >
                    {w.icon ? (
                      <WikiImg src={w.icon} alt={w.label} size={30} />
                    ) : (
                      <span className="text-[8px] text-[var(--text-muted)]">—</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              {specialWeapons.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] italic">
                  Click a weapon above to add it.
                </p>
              ) : (
                specialWeapons.map((weaponId, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)]"
                  >
                    <div className="w-8 h-8 flex-shrink-0 rounded border overflow-hidden flex items-center justify-center bg-[var(--bg-elevated)]">
                      {getSpecialWeaponIcon(weaponId) ? (
                        <WikiImg
                          src={getSpecialWeaponIcon(weaponId)}
                          alt={getSpecialWeaponLabel(weaponId)}
                          size={24}
                        />
                      ) : (
                        <span className="text-[8px] text-[var(--text-muted)]">—</span>
                      )}
                    </div>
                    <select
                      value={weaponId}
                      onChange={(e) =>
                        setSpecialWeapons((prev) =>
                          prev.map((v, i) => (i === idx ? e.target.value : v))
                        )
                      }
                      className="flex-1 h-8 rounded border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 text-xs focus:outline-none focus:border-primary [color-scheme:dark]"
                    >
                      {ALL_SPECIAL_WEAPONS.map((weapon) => (
                        <option key={weapon.id || "empty"} value={weapon.id}>
                          {weapon.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setSpecialWeapons((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="p-1 rounded text-[var(--text-muted)] hover:bg-red-500/20 hover:text-red-400 transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
              <button
                type="button"
                onClick={() => setSpecialWeapons((prev) => [...prev, ""])}
                className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-primary transition-colors"
              >
                <Plus className="h-3 w-3" /> Add slot
              </button>
            </div>
          </div>
        )}

        {/* Save */}
        {saveError && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle className="h-3 w-3 shrink-0" />
            {saveError}
          </p>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : isEditing ? "Save changes" : "Save account & use"}
        </button>
      </div>
    </div>
  );
}
