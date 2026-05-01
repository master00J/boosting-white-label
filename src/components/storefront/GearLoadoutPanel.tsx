"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { Sword, Target, Wand2, Plus, Settings2, X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { normaliseEquipmentByStyle, EQUIPMENT_SLOTS } from "@/lib/osrs-equipment";
import InlineLoadoutCreator, {
  type LoadoutSummary,
} from "@/components/storefront/InlineLoadoutCreator";

// ─── Item lookup (id → label + icon) ─────────────────────────────────────────

const ITEM_LOOKUP = new Map<string, { id: string; label: string; icon: string; slotLabel: string }>();
for (const slot of EQUIPMENT_SLOTS) {
  for (const item of slot.items) {
    if (item.id) {
      ITEM_LOOKUP.set(item.id, { id: item.id, label: item.label, icon: item.icon, slotLabel: slot.label });
    }
  }
}

export { ITEM_LOOKUP };

export const COMBAT_STYLES = [
  { id: "melee" as const, label: "Melee", icon: Sword },
  { id: "range" as const, label: "Range", icon: Target },
  { id: "mage" as const, label: "Mage", icon: Wand2 },
];

export default function GearLoadoutPanel({
  loadouts,
  selectedLoadoutId,
  overrideGearItems,
  userId,
  onSelectLoadout,
  onResetOverride,
  onRemoveItem,
  onLoadoutCreated,
}: {
  loadouts: LoadoutSummary[];
  selectedLoadoutId: string | null;
  overrideGearItems: string[] | null;
  userId?: string | null;
  onSelectLoadout: (id: string | null) => void;
  onResetOverride: () => void;
  onRemoveItem: (id: string) => void;
  onLoadoutCreated: (loadout: LoadoutSummary) => void;
}) {
  const [activeStyle, setActiveStyle] = useState<"melee" | "range" | "mage">("melee");
  const [showCreator, setShowCreator] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const selectedLoadout = loadouts.find((l) => l.id === selectedLoadoutId) ?? null;

  const equipmentByStyle = useMemo(
    () => normaliseEquipmentByStyle(selectedLoadout?.equipment ?? null),
    [selectedLoadout]
  );

  const localLoadoutItems = useMemo(() => {
    if (!selectedLoadout) return [];
    const items: string[] = [];
    for (const slotMap of Object.values(equipmentByStyle)) {
      for (const rawId of Object.values(slotMap)) {
        const itemId = String(rawId);
        if (rawId && !items.includes(itemId)) items.push(itemId);
      }
    }
    for (const itemId of selectedLoadout.special_weapons ?? []) {
      if (itemId && !items.includes(itemId)) items.push(itemId);
    }
    return items;
  }, [selectedLoadout, equipmentByStyle]);

  const effectiveItems = overrideGearItems ?? localLoadoutItems;

  return (
    <div className="space-y-2">
      {/* Account selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => { onSelectLoadout(null); setShowCreator(false); setEditingId(null); }}
          className={cn(
            "px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
            !selectedLoadoutId && !showCreator
              ? "border-primary/50 bg-primary/10 text-primary"
              : "border-[var(--border-default)] hover:border-primary/30 text-[var(--text-secondary)]"
          )}
        >
          No account
        </button>
        {loadouts.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => { onSelectLoadout(l.id); setShowCreator(false); setEditingId(null); }}
            className={cn(
              "px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all",
              selectedLoadoutId === l.id && !showCreator
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-[var(--border-default)] hover:border-primary/30 text-[var(--text-secondary)]"
            )}
          >
            {l.name}
          </button>
        ))}
        {userId && loadouts.length < 3 && (
          <button
            type="button"
            onClick={() => { onSelectLoadout(null); setShowCreator((v) => !v); setEditingId(null); }}
            className={cn(
              "px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all flex items-center gap-1",
              showCreator
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-dashed border-primary/30 text-[var(--text-muted)] hover:text-primary hover:border-primary/50"
            )}
          >
            <Plus className="h-3 w-3" />
            New
          </button>
        )}
      </div>

      {/* Inline loadout creator (new account) */}
      {showCreator && (
        <InlineLoadoutCreator
          existingCount={loadouts.length}
          onCreated={(l) => { onLoadoutCreated(l); onSelectLoadout(l.id); setShowCreator(false); }}
          onCancel={() => setShowCreator(false)}
        />
      )}

      {/* Gear display / editor when account is selected */}
      {selectedLoadoutId && !editingId && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] overflow-hidden">
          {/* Style tabs: Melee / Range / Mage + Edit button */}
          <div className="flex border-b border-[var(--border-default)]">
            {COMBAT_STYLES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveStyle(id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors",
                  activeStyle === id
                    ? "bg-primary/10 text-primary border-b-2 border-primary"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
                )}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
            {userId && (
              <button
                type="button"
                onClick={() => setEditingId(selectedLoadoutId)}
                className="px-3 py-2 text-[10px] font-semibold text-[var(--text-muted)] hover:text-primary hover:bg-white/5 transition-colors border-l border-[var(--border-default)] flex items-center gap-1"
                title="Edit gear for this account"
              >
                <Settings2 className="h-3 w-3" />
                Edit
              </button>
            )}
          </div>

          {localLoadoutItems.length === 0 ? (
            <div className="p-4 text-center space-y-2">
              <p className="text-xs text-orange-400/80 flex items-center justify-center gap-1">
                <span>⚠</span> No gear configured for this account.
              </p>
              {userId && (
                <button
                  type="button"
                  onClick={() => setEditingId(selectedLoadoutId)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-xs text-primary hover:bg-primary/5 transition-colors"
                >
                  <Settings2 className="h-3 w-3" />
                  Configure gear
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Equipment slots for active style */}
              <div className="p-3 grid grid-cols-2 gap-1.5">
                {EQUIPMENT_SLOTS.map((slot) => {
                  const itemId = equipmentByStyle[activeStyle]?.[slot.id] ?? "";
                  const details = itemId ? ITEM_LOOKUP.get(itemId) : null;
                  const isActive = effectiveItems.includes(itemId);

                  return (
                    <div
                      key={slot.id}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs transition-colors",
                        itemId && isActive
                          ? "border-primary/20 bg-primary/5"
                          : itemId
                          ? "border-[var(--border-subtle)] bg-[var(--bg-card)] opacity-40"
                          : "border-[var(--border-subtle)] bg-transparent opacity-25"
                      )}
                    >
                      {details?.icon ? (
                        <Image
                          src={details.icon}
                          alt={details.label}
                          width={18}
                          height={18}
                          className="w-4.5 h-4.5 object-contain flex-shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-4 h-4 rounded bg-[var(--border-subtle)] flex-shrink-0" />
                      )}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[10px] text-[var(--text-muted)] leading-none">{slot.label}</span>
                        <span className="text-[11px] text-[var(--text-primary)] truncate leading-tight">
                          {details?.label ?? (itemId ? itemId : "—")}
                        </span>
                      </div>
                      {itemId && isActive && (
                        <button
                          type="button"
                          onClick={() => onRemoveItem(itemId)}
                          className="text-[var(--text-muted)] hover:text-red-400/80 transition-colors flex-shrink-0"
                          title="Remove from pricing"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Special weapons */}
              {(selectedLoadout?.special_weapons ?? []).length > 0 && (
                <div className="px-3 pb-3 space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Special Weapons
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedLoadout?.special_weapons ?? []).map((itemId) => {
                      const details = ITEM_LOOKUP.get(itemId);
                      const isActive = effectiveItems.includes(itemId);
                      return (
                        <div
                          key={itemId}
                          className={cn(
                            "flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-lg border text-[11px] transition-colors",
                            isActive
                              ? "border-primary/25 bg-primary/5 text-[var(--text-secondary)]"
                              : "border-[var(--border-subtle)] opacity-40 text-[var(--text-muted)]"
                          )}
                        >
                          {details?.icon && (
                            <Image
                              src={details.icon}
                              alt={details.label ?? itemId}
                              width={18}
                              height={18}
                              className="w-4 h-4 object-contain flex-shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                          )}
                          <span>{details?.label ?? itemId}</span>
                          {isActive && (
                            <button
                              type="button"
                              onClick={() => onRemoveItem(itemId)}
                              className="text-[var(--text-muted)] hover:text-red-400/80 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer: active items + reset */}
              <div className="px-3 py-2 border-t border-[var(--border-default)] flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-muted)]">
                  {effectiveItems.length} item{effectiveItems.length !== 1 ? "s" : ""} active
                  {overrideGearItems !== null && (
                    <span className="ml-1 text-orange-400/70">(modified)</span>
                  )}
                </span>
                {overrideGearItems !== null && (
                  <button
                    type="button"
                    onClick={onResetOverride}
                    className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] hover:text-primary/70 transition-colors"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Reset
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Inline editor for existing account */}
      {selectedLoadoutId && editingId === selectedLoadoutId && (
        <InlineLoadoutCreator
          existingCount={loadouts.length}
          editingLoadout={selectedLoadout}
          onCreated={(updated) => {
            onLoadoutCreated(updated);
            setEditingId(null);
          }}
          onCancel={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
