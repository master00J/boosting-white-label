"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import GearOptimizer from "@/components/storefront/GearOptimizer";

/** Clearable skill level input â€” allows fully deleting the value before retyping */
function SkillLevelInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [raw, setRaw] = useState(String(value));

  useEffect(() => {
    setRaw(String(value));
  }, [value]);

  const commit = () => {
    const parsed = parseInt(raw);
    if (!isNaN(parsed)) {
      const clamped = Math.min(99, Math.max(1, parsed));
      setRaw(String(clamped));
      onChange(clamped);
    } else {
      setRaw(String(value));
    }
  };

  return (
    <input
      type="number"
      min={1}
      max={99}
      value={raw}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
      className="w-12 h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] text-center text-sm font-bold focus:outline-none focus:border-primary"
    />
  );
}

/** Wiki image with fallback on load error â€“ native img for external URLs */
function WikiImage({
  src,
  alt,
  size,
  className = "",
}: {
  src: string;
  alt: string;
  size: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed || !src)
    return <span className="text-[9px] text-[#6b5b7a]">â€”</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ maxWidth: size, maxHeight: size }}
      onError={() => setFailed(true)}
    />
  );
}
import {
  UserCircle,
  Shield,
  Save,
  Loader2,
  Check,
  Plus,
  Minus,
  Search,
  AlertCircle,
  Landmark,
  Upload,
  Pencil,
} from "lucide-react";
import { saveLoadouts } from "./actions";
import { OSRS_SKILLS } from "@/lib/osrs-skills";
import {
  EQUIPMENT_SLOTS,
  EQUIPMENT_LAYOUT,
  DEFAULT_EQUIPMENT_BY_STYLE,
  COMBAT_STYLES,
  getBankItemIcon,
  getItemIcon,
  normaliseEquipmentByStyle,
  type EquipmentSlot,
  type EquipmentByStyle,
  type CombatStyle,
} from "@/lib/osrs-equipment";

/** Resolve a stored slot value (old slug or new item name) to displayName + iconUrl */
function resolveSlotItem(slot: EquipmentSlot, value: string): { displayName: string; iconUrl: string } {
  if (!value) return { displayName: "", iconUrl: "" };
  // Try to find in the hardcoded list first (old slug format, e.g. "volkhars_helm")
  const hardcoded = slot.items.find((i) => i.id === value);
  if (hardcoded && hardcoded.label !== "— None —") {
    return { displayName: hardcoded.label, iconUrl: getItemIcon(slot, value) };
  }
  // Assume it's already an item name (new GearSlotPicker format, e.g. "Bandos chestplate")
  return {
    displayName: value,
    iconUrl: `https://oldschool.runescape.wiki/images/${value.replace(/ /g, "_").replace(/'/g, "%27")}.png`,
  };
}
import GearSlotPicker from "@/components/storefront/GearSlotPicker";
import {
  PRAYERS_BY_STYLE,
  DEFAULT_PRAYERS_BY_STYLE,
  normalisePrayers,
  type PrayersByStyle,
} from "@/lib/osrs-prayers";
import {
  QUICK_SELECT_WEAPONS,
  ALL_SPECIAL_WEAPONS,
  getSpecialWeaponIcon,
  getSpecialWeaponLabel,
} from "@/lib/osrs-special-weapons";
import { ACCOUNT_TYPES, type AccountType } from "@/lib/osrs-account-types";

type Loadout = {
  id: string;
  name: string;
  stats: Record<string, number>;
  equipment?: Record<string, unknown>;
  prayers?: PrayersByStyle | Record<string, unknown>;
  special_weapons?: string[];
  account_type?: string;
  sort_order: number;
};

type BankItem = { itemId: string; name: string; qty: number };

/** Normalise item names for matching (case-insensitive, handle plurals) */
function itemNameMatches(bankName: string, questName: string): boolean {
  const b = bankName.toLowerCase().trim();
  const q = questName.toLowerCase().trim();
  if (b === q) return true;
  const bBase = b.replace(/s$/, "");
  const qBase = q.replace(/s$/, "");
  if (bBase === qBase) return true;
  if (b.includes(q) || q.includes(b)) return true;
  return false;
}

/** Check how many of a quest's required items the bank has (with quantity check) */
function countQuestItemsInBank(
  required: { itemName: string; quantity: number }[],
  bank: BankItem[]
): { has: number; total: number; missing: { itemName: string; quantity: number }[] } {
  let has = 0;
  const missing: { itemName: string; quantity: number }[] = [];
  for (const req of required) {
    const found = bank.find((b) => itemNameMatches(b.name, req.itemName));
    if (found && found.qty >= req.quantity) has++;
    else missing.push(req);
  }
  return { has, total: required.length, missing };
}

/** Parse RuneLite Bank Memory export (tab-separated: Item id, Item name, Item quantity) */
function parseRuneLiteBankExport(text: string): BankItem[] {
  const lines = text.trim().split(/\r?\n/);
  const items: BankItem[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split("\t");
    if (cols.length < 3) continue;
    const itemId = cols[0]?.trim() ?? "";
    const name = cols[1]?.trim() ?? "";
    const qtyStr = cols[2]?.trim() ?? "1";
    if (i === 0 && (itemId === "Item id" || itemId.toLowerCase().includes("item"))) continue;
    const qty = parseInt(qtyStr, 10) || 1;
    if (!itemId || !name) continue;
    items.push({ itemId, name, qty });
  }
  return items;
}

const DEFAULT_STATS: Record<string, number> = Object.fromEntries(
  OSRS_SKILLS.map((s) => [s.id, 1])
);

export default function LoadoutsClient({
  initialLoadouts,
  activeLoadoutId,
  loadError,
}: {
  initialLoadouts: Loadout[];
  activeLoadoutId: string | null;
  loadError?: string | null;
}) {
  const [loadouts, setLoadouts] = useState<Loadout[]>(() =>
    initialLoadouts.length > 0
      ? initialLoadouts.map((l) => ({
          ...l,
          equipment: normaliseEquipmentByStyle(l.equipment ?? null),
        }))
      : [{
          id: `new-${Date.now()}`,
          name: "Main Account",
          stats: { ...DEFAULT_STATS },
          equipment: DEFAULT_EQUIPMENT_BY_STYLE,
          prayers: DEFAULT_PRAYERS_BY_STYLE,
          special_weapons: [],
          account_type: "normal",
          sort_order: 0,
        }]
  );
  const [activeId, setActiveId] = useState<string | null>(activeLoadoutId ?? loadouts[0]?.id ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(loadouts[0]?.id ?? "new");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState("");
  const [username, setUsername] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [loadoutViewTab, setLoadoutViewTab] = useState<"combat" | "bank">("combat");
  const [bankItems, setBankItems] = useState<BankItem[]>([]);
  const [bankImportText, setBankImportText] = useState("");
  const [questRequirements, setQuestRequirements] = useState<
    { questId: string; questName: string; items: { itemName: string; quantity: number }[] }[]
  >([]);

  const router = useRouter();
  const [combatStyle, setCombatStyle] = useState<CombatStyle>("melee");
  const [prayerStyle, setPrayerStyle] = useState<CombatStyle>("melee");
  const OSRS_GAME_ID = "a8c56ade-08b9-4765-a596-9d9a3d5b1ab7";

  useEffect(() => {
    if (bankItems.length === 0) return;
    fetch(`/api/quest-required-items?game_id=${OSRS_GAME_ID}`)
      .then((r) => r.json())
      .then((data) => setQuestRequirements(data.quests ?? []))
      .catch(() => setQuestRequirements([]));
  }, [bankItems.length]);
  const selected = loadouts.find((l) => l.id === selectedId) ?? loadouts[0];
  const selectedStats = selected?.stats ?? { ...DEFAULT_STATS };
  const equipmentByStyle = (selected?.equipment as EquipmentByStyle | undefined)
    ? normaliseEquipmentByStyle(selected.equipment)
    : DEFAULT_EQUIPMENT_BY_STYLE;
  const selectedEquipment = equipmentByStyle[combatStyle];
  const prayersByStyle = normalisePrayers(selected?.prayers);
  const selectedPrayers = prayersByStyle[prayerStyle];
  const specialWeapons: string[] = useMemo(
    () => (Array.isArray(selected?.special_weapons) ? selected.special_weapons : []),
    [selected?.special_weapons]
  );
  const accountType: AccountType = (selected?.account_type as AccountType) || "normal";

  const setAccountType = useCallback(
    (t: AccountType) => {
      setLoadouts((prev) =>
        prev.map((l) =>
          l.id === selectedId ? { ...l, account_type: t } : l
        )
      );
    },
    [selectedId]
  );

  const setStat = useCallback(
    (skillId: string, value: number) => {
      const v = Math.min(99, Math.max(1, value));
      setLoadouts((prev) =>
        prev.map((l) =>
          l.id === selectedId ? { ...l, stats: { ...l.stats, [skillId]: v } } : l
        )
      );
    },
    [selectedId]
  );

  const setPrayer = useCallback(
    (prayerId: string, active: boolean, style: CombatStyle = prayerStyle) => {
      setLoadouts((prev) =>
        prev.map((l) => {
          if (l.id !== selectedId) return l;
          const prayers = normalisePrayers(l.prayers ?? null);
          const list = prayers[style];
          const next = active
            ? [...list.filter((id) => id !== prayerId), prayerId]
            : list.filter((id) => id !== prayerId);
          return { ...l, prayers: { ...prayers, [style]: next } };
        })
      );
    },
    [selectedId, prayerStyle]
  );

  const setSpecialWeapon = useCallback(
    (slotIndex: number, itemId: string) => {
      setLoadouts((prev) =>
        prev.map((l) => {
          if (l.id !== selectedId) return l;
          const current = Array.isArray(l.special_weapons) ? [...l.special_weapons] : [];
          while (current.length <= slotIndex) current.push("");
          current[slotIndex] = itemId;
          return { ...l, special_weapons: current };
        })
      );
    },
    [selectedId]
  );

  const addSpecialWeaponSlot = useCallback(() => {
    setLoadouts((prev) =>
      prev.map((l) =>
        l.id === selectedId
          ? { ...l, special_weapons: [...(l.special_weapons ?? []), ""] }
          : l
      )
    );
  }, [selectedId]);

  const removeSpecialWeaponSlot = useCallback(
    (slotIndex: number) => {
      setLoadouts((prev) =>
        prev.map((l) => {
          if (l.id !== selectedId) return l;
          const arr = [...(l.special_weapons ?? [])];
          arr.splice(slotIndex, 1);
          return { ...l, special_weapons: arr };
        })
      );
    },
    [selectedId]
  );

  const quickSelectWeapon = useCallback(
    (itemId: string) => {
      const current = specialWeapons;
      const idx = current.findIndex((id) => !id);
      const insertAt = idx >= 0 ? idx : current.length;
      setLoadouts((prev) =>
        prev.map((l) => {
          if (l.id !== selectedId) return l;
          const arr = [...(l.special_weapons ?? [])];
          while (arr.length <= insertAt) arr.push("");
          arr[insertAt] = itemId;
          return { ...l, special_weapons: arr };
        })
      );
    },
    [selectedId, specialWeapons]
  );

  const setEquipmentSlot = useCallback(
    (slotId: string, itemId: string) => {
      setLoadouts((prev) =>
        prev.map((l) => {
          if (l.id !== selectedId) return l;
          const eq = normaliseEquipmentByStyle(l.equipment ?? null);
          const next = { ...eq, [combatStyle]: { ...eq[combatStyle], [slotId]: itemId } };
          return { ...l, equipment: next };
        })
      );
    },
    [selectedId, combatStyle]
  );

  const importStats = useCallback(async () => {
    const name = username.trim();
    if (!name) return;
    setImportLoading(true);
    setImportError(null);
    try {
      const res = await fetch(`/api/osrs-stats?player=${encodeURIComponent(name)}`);
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? "Failed to fetch stats");
        return;
      }
      const stats = data.stats ?? {};
      setLoadouts((prev) =>
        prev.map((l) =>
          l.id === selectedId ? { ...l, stats: { ...DEFAULT_STATS, ...stats } } : l
        )
      );
    } catch {
      setImportError("Network error");
    } finally {
      setImportLoading(false);
    }
  }, [username, selectedId]);

  const saveAll = useCallback(async () => {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const result = await saveLoadouts(
        loadouts.map((l) => ({
          id: l.id,
          name: l.name,
          stats: l.stats,
          equipment: l.equipment,
          prayers: l.prayers,
          special_weapons: l.special_weapons,
          account_type: l.account_type,
          sort_order: l.sort_order,
        })),
        activeId
      );

      if (!result.success) {
        setError(result.error);
        return;
      }

      const { loadouts: savedLoadouts, activeLoadoutId: savedActiveId } = result;
      const normalised = savedLoadouts.map((l) => ({
        ...l,
        equipment: normaliseEquipmentByStyle(l.equipment ?? null),
      }));
      setLoadouts(normalised);
      if (savedActiveId) setActiveId(savedActiveId);
      const stillSelected = normalised.some((l) => l.id === selectedId);
      if (!stillSelected && normalised.length > 0) {
        setSelectedId(savedActiveId && normalised.some((l) => l.id === savedActiveId)
          ? savedActiveId
          : normalised[0]!.id);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : String(e)) ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }, [loadouts, activeId, selectedId, router]);

  return (
    <div className="space-y-6 max-w-4xl">
      {loadError && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Failed to load loadouts: {loadError}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            Account
          </p>
          <h1 className="font-heading text-2xl font-semibold">
            Account Loadouts
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Configure your combat stats. Services will automatically use these when you order.
          </p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? "Saved!" : "Save All"}
        </button>
      </div>

      {/* Account tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] w-fit">
        {loadouts.map((l) => (
          <div
            key={l.id}
            className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedId === l.id
                ? "bg-primary text-white"
                : "text-[var(--text-muted)] hover:bg-white/5"
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setSelectedId(l.id);
                if (!l.id.startsWith("new")) setActiveId(l.id);
              }}
              className="flex items-center gap-2"
            >
              <UserCircle className="h-3.5 w-3.5 shrink-0" />
              {editingNameId === l.id ? null : (
                <span>{l.name}</span>
              )}
              {activeId === l.id && !l.id.startsWith("new") && editingNameId !== l.id && (
                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
              )}
            </button>

            {/* Inline naam-editor */}
            {editingNameId === l.id && (
              <input
                type="text"
                autoFocus
                value={editingNameValue}
                onChange={(e) => setEditingNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const trimmed = editingNameValue.trim();
                    if (trimmed) {
                      setLoadouts((prev) =>
                        prev.map((lo) => lo.id === l.id ? { ...lo, name: trimmed } : lo)
                      );
                    }
                    setEditingNameId(null);
                  }
                  if (e.key === "Escape") setEditingNameId(null);
                }}
                onBlur={() => {
                  const trimmed = editingNameValue.trim();
                  if (trimmed) {
                    setLoadouts((prev) =>
                      prev.map((lo) => lo.id === l.id ? { ...lo, name: trimmed } : lo)
                    );
                  }
                  setEditingNameId(null);
                }}
                className="w-28 bg-transparent border-b border-white/50 text-sm font-medium outline-none placeholder:text-white/40"
                placeholder={l.name}
                maxLength={30}
              />
            )}

            {/* Rename knop (alleen zichtbaar bij hover/active) */}
            {editingNameId !== l.id && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingNameId(l.id);
                  setEditingNameValue(l.name);
                  setSelectedId(l.id);
                }}
                className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded ${
                  selectedId === l.id ? "hover:bg-white/20" : "hover:bg-white/10"
                }`}
                title="Rename"
              >
                <Pencil className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        {loadouts.length < 3 && (
          <button
            onClick={() => {
              const newId = `new-${Date.now()}`;
              const next = loadouts.length + 1;
              setLoadouts((prev) => [
                ...prev,
                {
                  id: newId,
                  name: `Account ${next}`,
                  stats: { ...DEFAULT_STATS },
                  equipment: DEFAULT_EQUIPMENT_BY_STYLE,
                  prayers: DEFAULT_PRAYERS_BY_STYLE,
                  special_weapons: [],
                  account_type: "normal",
                  sort_order: prev.length,
                },
              ]);
              setSelectedId(newId);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-muted)] hover:bg-white/5"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Active: {loadouts.find((l) => l.id === activeId)?.name ?? "None"} â€” Used for pricing in
        builder & checkout
      </p>

      {/* Combat loadout */}
      <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="font-heading font-semibold">Combat Loadout</h2>
          </div>
          <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
            <button
              onClick={() => setLoadoutViewTab("combat")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                loadoutViewTab === "combat" ? "bg-primary text-white" : "text-[var(--text-muted)] hover:bg-white/5"
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              Combat
            </button>
            <button
              onClick={() => setLoadoutViewTab("bank")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                loadoutViewTab === "bank" ? "bg-primary text-white" : "text-[var(--text-muted)] hover:bg-white/5"
              }`}
            >
              <Landmark className="h-3.5 w-3.5" />
              Bank
            </button>
          </div>
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          {loadoutViewTab === "combat"
            ? "Configure your combat setup with equipment, stats, and prayers to calculate requirements and upcharges."
            : "Import your bank from RuneLite Bank Memory plugin to see your items."}
        </p>

        {loadoutViewTab === "bank" ? (
          /* Bank tab */
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]">
              <h3 className="text-sm font-semibold mb-2">Import RuneLite Bank Memory</h3>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                In RuneLite: Bank Memory plugin â†’ Saved banks â†’ right-click Current bank â†’ Copy item data to clipboard. Paste below or upload the text file.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <textarea
                  value={bankImportText}
                  onChange={(e) => setBankImportText(e.target.value)}
                  placeholder="Paste your bank export here (tab-separated: Item id, Item name, Item quantity)"
                  className="flex-1 min-h-[100px] rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2 text-sm font-mono resize-y"
                />
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept=".txt"
                    className="hidden"
                    id="bank-file-upload"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const r = new FileReader();
                        r.onload = () => setBankImportText((r.result as string) ?? "");
                        r.readAsText(f);
                      }
                      e.target.value = "";
                    }}
                  />
                  <label
                    htmlFor="bank-file-upload"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-[var(--border-default)] hover:bg-white/5 cursor-pointer text-sm"
                  >
                    <Upload className="h-4 w-4" />
                    Upload .txt
                  </label>
                  <button
                    onClick={() => setBankItems(parseRuneLiteBankExport(bankImportText))}
                    disabled={!bankImportText.trim()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    Import
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-orange-500/90 mt-2">
                Note: items with ornament kits or other variants may not display correctly.
              </p>
            </div>
            {bankItems.length > 0 ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold mb-2">Your bank ({bankItems.length} items)</h3>
                  <div
                    className="inline-grid grid-cols-8 gap-2 p-4 rounded-xl bg-[#1a1520] border-2 border-[#2d2436] max-h-[480px] overflow-y-auto"
                    style={{ boxShadow: "inset 0 0 20px rgba(0,0,0,0.3)" }}
                  >
                    {bankItems.map((item, idx) => {
                      const icon = getBankItemIcon(item.name);
                      return (
                        <div
                          key={`${item.itemId}-${idx}`}
                          className="group relative flex flex-col items-center justify-center gap-0.5 rounded-lg bg-[#161018] border border-[#3d3248] p-1.5 min-w-[52px] overflow-hidden"
                          title={`${item.name} Ã— ${item.qty.toLocaleString()}`}
                        >
                          <div className="w-10 h-10 flex-shrink-0 rounded border border-[#2d2436] overflow-hidden flex items-center justify-center bg-[#0d0a10]">
                            {icon ? (
                              <WikiImage src={icon} alt={item.name} size={36} />
                            ) : (
                              <span className="text-[8px] text-[#6b5b7a]">â€”</span>
                            )}
                          </div>
                          {item.qty > 1 && (
                            <span className="text-[9px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
                              {item.qty >= 1000000
                                ? `${(item.qty / 1000000).toFixed(1)}M`
                                : item.qty >= 1000
                                  ? `${(item.qty / 1000).toFixed(1)}K`
                                  : item.qty}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {questRequirements.filter((q) => q.items.length > 0).length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Quest item readiness</h3>
                    <p className="text-xs text-[var(--text-muted)] mb-3">
                      Quests that require items â€” how many you have in your bank.
                    </p>
                    <div className="max-h-[280px] overflow-y-auto space-y-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-3">
                      {questRequirements
                        .filter((q) => q.items.length > 0)
                        .map((q) => {
                          const { has, total } = countQuestItemsInBank(q.items, bankItems);
                          const pct = total ? Math.round((has / total) * 100) : 0;
                          return (
                            <div
                              key={q.questId}
                              className="flex items-center justify-between gap-3 py-2 border-b border-[var(--border-default)] last:border-0"
                            >
                              <span className="text-sm font-medium truncate flex-1">{q.questName}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`text-xs font-bold ${
                                    pct === 100 ? "text-green-400" : pct >= 50 ? "text-orange-400" : "text-[var(--text-muted)]"
                                  }`}
                                >
                                  {has}/{total}
                                </span>
                                <div className="w-16 h-1.5 rounded-full bg-[var(--bg-card)] overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      pct === 100 ? "bg-green-500" : pct >= 50 ? "bg-orange-500" : "bg-[var(--text-muted)]"
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* â”€â”€ Gear Optimizer â”€â”€ */}
                <div className="rounded-xl border border-[#E8720C]/20 bg-[#E8720C]/[0.02] p-4">
                  <GearOptimizer
                    bankItems={bankItems}
                    stats={selectedStats}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No bank imported. Paste or upload your RuneLite export above.</p>
            )}
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(340px,1fr)_1fr] gap-8 items-start">
          {/* Equipment (in-game layout) */}
          <div>
            <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] w-fit mb-4">
              {COMBAT_STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setCombatStyle(s.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    combatStyle === s.id
                      ? "bg-primary text-white"
                      : "text-[var(--text-muted)] hover:bg-white/5"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <h3 className="text-sm font-semibold mb-3">Equipment ({combatStyle})</h3>
            <div
              className="inline-grid grid-cols-3 grid-rows-5 gap-2 w-[300px] min-h-[360px] p-4 rounded-xl bg-[#1a1520] border-2 border-[#2d2436]"
              style={{ boxShadow: "inset 0 0 20px rgba(0,0,0,0.3)" }}
            >
              {EQUIPMENT_LAYOUT.map(({ id, gridArea }) => {
                const slot = EQUIPMENT_SLOTS.find((s) => s.id === id)!;
                const rawValue = selectedEquipment[id] ?? "";
                const { displayName: itemName, iconUrl } = resolveSlotItem(slot, rawValue);
                return (
                  <div
                    key={id}
                    style={{ gridArea }}
                    className="group relative flex flex-col items-center justify-center gap-1 rounded-lg bg-[#161018] border border-[#3d3248] p-2 min-w-0 overflow-hidden"
                  >
                    <div className="w-12 h-12 flex-shrink-0 rounded border border-[#2d2436] overflow-hidden flex items-center justify-center bg-[#0d0a10]">
                      {iconUrl ? (
                        <WikiImage src={iconUrl} alt={itemName} size={40} />
                      ) : (
                        <span className="text-[9px] text-[#6b5b7a]">â€”</span>
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

            {/* Extra Equipment & Special Weapons */}
            <div className="mt-6 pt-4 border-t border-[var(--border-default)]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Extra Equipment & Special Weapons</h3>
                <button
                  onClick={addSpecialWeaponSlot}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90"
                >
                  <Plus className="h-3 w-3" /> Add Slot
                </button>
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mb-3">
                Quick Select Special Weapons
              </p>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {QUICK_SELECT_WEAPONS.map((w) => {
                  const isSelected = specialWeapons.includes(w.id);
                  return (
                    <button
                      key={w.id || "empty"}
                      type="button"
                      onClick={() => w.id && quickSelectWeapon(w.id)}
                      disabled={!w.id}
                      className={`flex items-center justify-center w-10 h-10 rounded-lg border transition-colors overflow-hidden ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/50 bg-primary/20"
                          : "border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-primary/50"
                      } ${!w.id ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                      title={w.label}
                    >
                      {w.icon ? (
                        <WikiImage src={w.icon} alt={w.label} size={32} />
                      ) : (
                        <span className="text-[8px] text-[var(--text-muted)]">â€”</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2">
                {specialWeapons.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    No weapon slots yet. Click a quick-select icon or Add Slot.
                  </p>
                ) : (
                  specialWeapons.map((weaponId, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)]"
                    >
                      <div className="w-9 h-9 flex-shrink-0 rounded border overflow-hidden flex items-center justify-center bg-[var(--bg-card)]">
                        {getSpecialWeaponIcon(weaponId) ? (
                          <WikiImage
                            src={getSpecialWeaponIcon(weaponId)}
                            alt={getSpecialWeaponLabel(weaponId)}
                            size={28}
                          />
                        ) : (
                          <span className="text-[8px] text-[var(--text-muted)]">â€”</span>
                        )}
                      </div>
                      <select
                        value={weaponId}
                        onChange={(e) => setSpecialWeapon(idx, e.target.value)}
                        className="flex-1 h-8 rounded border border-[var(--border-default)] bg-[var(--bg-card)] px-2 text-xs focus:outline-none focus:border-primary [color-scheme:dark]"
                      >
                        {ALL_SPECIAL_WEAPONS.map((weapon) => (
                          <option key={weapon.id || "empty"} value={weapon.id}>
                            {weapon.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeSpecialWeaponSlot(idx)}
                        className="p-1.5 rounded text-[var(--text-muted)] hover:bg-red-500/20 hover:text-red-400"
                        aria-label="Remove slot"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Prayers per combat style */}
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-sm font-semibold">Prayers</h3>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    Select prayer unlocks per combat style.
                  </p>
                </div>
                <div className="flex rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-1">
                  {COMBAT_STYLES.map(({ id, label }) => {
                    const count = prayersByStyle[id].length;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPrayerStyle(id)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-colors ${
                          prayerStyle === id
                            ? "bg-primary text-white"
                            : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        {label}
                        {count > 0 && (
                          <span className="ml-1 opacity-75">({count})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRAYERS_BY_STYLE[prayerStyle].map((prayer) => {
                  const active = selectedPrayers.includes(prayer.id);
                  return (
                    <button
                      key={prayer.id}
                      type="button"
                      onClick={() => setPrayer(prayer.id, !active, prayerStyle)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                        active
                          ? "bg-primary/20 border-primary text-primary"
                          : "bg-[var(--bg-elevated)] border-[var(--border-default)] text-[var(--text-muted)] hover:border-primary/50"
                      }`}
                    >
                      <span className="text-sm font-medium">{prayer.label}</span>
                      <span className="text-[10px] opacity-75">({prayer.level})</span>
                      {prayer.description && (
                        <span className="text-[9px] rounded bg-white/10 px-1.5 py-0.5 uppercase tracking-wide">
                          {prayer.description}
                        </span>
                      )}
                      {active && <Check className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { style: "range" as const, id: "rigour", label: "Rigour", desc: "Range scroll unlock" },
                  { style: "mage" as const, id: "augury", label: "Augury", desc: "Mage scroll unlock" },
                ].map((unlock) => {
                  const active = prayersByStyle[unlock.style].includes(unlock.id);
                  return (
                    <button
                      key={unlock.id}
                      type="button"
                      onClick={() => setPrayer(unlock.id, !active, unlock.style)}
                      className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:border-primary/40 hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <span>
                        <span className="block text-xs font-semibold">{unlock.label}</span>
                        <span className="block text-[10px] opacity-75">{unlock.desc}</span>
                      </span>
                      <span className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                        active ? "border-primary bg-primary text-white" : "border-[var(--border-default)]"
                      }`}>
                        {active && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-[var(--text-muted)] mt-2">
                Rigour and Augury are scroll unlocks. They are saved with your account and used for bossing/gear pricing.
              </p>
            </div>
          </div>

          {/* Stats (right column) */}
          <div className="space-y-6">
            {/* Import Stats */}
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                  RuneScape username (optional)
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && importStats()}
                  placeholder="Enter your OSRS username"
                  className="w-full h-10 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 text-sm"
                />
              </div>
              <button
                onClick={importStats}
                disabled={importLoading || !username.trim()}
                className="flex items-center gap-2 px-4 h-10 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50"
              >
                {importLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Import Stats
              </button>
            </div>
            {/* Account type (Ironman/UIM/HCIM/UHCIM) */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-2">
                Account type
              </label>
              <div className="flex flex-wrap gap-2">
                {ACCOUNT_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAccountType(t.id)}
                    title={t.label}
                    className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-colors ${
                      accountType === t.id
                        ? "border-primary ring-2 ring-primary/50 bg-primary/20"
                        : "border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-primary/50"
                    }`}
                  >
                    {t.icon ? (
                      <WikiImage src={t.icon} alt={t.label} size={24} />
                    ) : (
                      <span className="text-[10px] font-medium text-[var(--text-muted)]">â€”</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            {importError && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="h-4 w-4" />
                {importError}
              </div>
            )}

            {/* Stats grid */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Skills</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {OSRS_SKILLS.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)]"
                  >
                    <div className="relative w-10 h-10">
                      <Image
                        src={skill.icon}
                        alt={skill.label}
                        width={40}
                        height={40}
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <span className="text-[10px] font-medium text-[var(--text-muted)] uppercase">
                      {skill.label}
                    </span>
                    <SkillLevelInput
                      value={selectedStats[skill.id] ?? 1}
                      onChange={(v) => setStat(skill.id, v)}
                    />
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Higher stats = lower price on stat-based services (quests, bossing, Firecape, etc.).
            </p>
          </div>
        </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}
