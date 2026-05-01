"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Command } from "cmdk";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface SelectableItem {
  id: string;
  label: string;
  price?: number;
  description?: string;
}

interface SearchableItemSelectProps {
  items: SelectableItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  formatPrice?: (price: number) => string;
  showDifficultyFilter?: boolean;
}

/** Parses the first word of a description as difficulty level */
function getDifficulty(description?: string): string | null {
  if (!description) return null;
  const first = description.split(/[·\-,]/)[0].trim();
  const known = ["novice", "intermediate", "experienced", "master", "grandmaster", "elite"];
  return known.includes(first.toLowerCase()) ? first : null;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  novice: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  intermediate: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  experienced: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  master: "text-red-400 bg-red-400/10 border-red-400/20",
  grandmaster: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  elite: "text-sky-400 bg-sky-400/10 border-sky-400/20",
};

export function SearchableItemSelect({
  items,
  value,
  onChange,
  placeholder = "— Select —",
  formatPrice,
  showDifficultyFilter = true,
}: SearchableItemSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [diffFilter, setDiffFilter] = React.useState<string>("all");

  const selectedItem = items.find((i) => i.id === value);

  // Collect unique difficulty levels present in the items
  const difficulties = React.useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const d = getDifficulty(item.description);
      if (d) set.add(d.toLowerCase());
    }
    return Array.from(set);
  }, [items]);

  const filtered = React.useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        !search || item.label.toLowerCase().includes(search.toLowerCase());
      const itemDiff = getDifficulty(item.description)?.toLowerCase() ?? null;
      const matchesDiff = diffFilter === "all" || itemDiff === diffFilter;
      return matchesSearch && matchesDiff;
    });
  }, [items, search, diffFilter]);

  function handleSelect(id: string) {
    onChange(id);
    setOpen(false);
    setSearch("");
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "w-full h-10 flex items-center justify-between gap-2 rounded-lg border px-3 text-sm transition-colors",
            "border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)]",
            "hover:border-primary/50 focus:outline-none focus:border-primary",
            open && "border-primary"
          )}
        >
          <span className={cn("truncate", !selectedItem && "text-[var(--text-muted)]")}>
            {selectedItem ? selectedItem.label : placeholder}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {selectedItem && formatPrice && selectedItem.price !== undefined && (
              <span className="text-xs text-primary font-medium">
                {formatPrice(selectedItem.price)}
              </span>
            )}
            {value && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                  setOpen(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && onChange("")}
                className="p-0.5 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="h-3 w-3" />
              </span>
            )}
            <ChevronDown className={cn("h-4 w-4 text-[var(--text-muted)] transition-transform", open && "rotate-180")} />
          </div>
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          className={cn(
            "z-50 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]",
            "shadow-xl shadow-black/40 animate-in fade-in-0 zoom-in-95",
            "w-[var(--radix-popover-trigger-width)] max-w-sm"
          )}
        >
          {/* Search input */}
          <Command shouldFilter={false}>
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--border-subtle)]">
              <Search className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder={`Search ${items.length} items…`}
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Difficulty filter tabs */}
            {showDifficultyFilter && difficulties.length > 1 && (
              <div className="flex gap-1 px-2 py-1.5 border-b border-[var(--border-subtle)] overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setDiffFilter("all")}
                  className={cn(
                    "shrink-0 text-xs px-2.5 py-1 rounded-full border transition-colors",
                    diffFilter === "all"
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  )}
                >
                  All ({items.length})
                </button>
                {difficulties.map((d) => {
                  const count = items.filter(
                    (i) => getDifficulty(i.description)?.toLowerCase() === d
                  ).length;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDiffFilter(d)}
                      className={cn(
                        "shrink-0 text-xs px-2.5 py-1 rounded-full border capitalize transition-colors",
                        diffFilter === d
                          ? cn("border", DIFFICULTY_COLORS[d] ?? "border-primary/50 bg-primary/10 text-primary")
                          : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {d} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            <Command.List className="max-h-64 overflow-y-auto overscroll-contain py-1">
              <Command.Empty className="py-6 text-center text-sm text-[var(--text-muted)]">
                No results for &ldquo;{search}&rdquo;
              </Command.Empty>

              <Command.Group>
                {filtered.map((item) => {
                  const isSelected = item.id === value;
                  const difficulty = getDifficulty(item.description);
                  const diffColor = difficulty ? DIFFICULTY_COLORS[difficulty.toLowerCase()] : null;

                  return (
                    <Command.Item
                      key={item.id}
                      value={item.label}
                      onSelect={() => handleSelect(item.id)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 cursor-pointer text-sm",
                        "hover:bg-white/[0.05] aria-selected:bg-white/[0.05] transition-colors",
                        isSelected && "bg-primary/[0.08]"
                      )}
                    >
                      <Check
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 text-primary transition-opacity",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--text-primary)] truncate">{item.label}</p>
                        {item.description && (
                          <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                            {difficulty && diffColor ? (
                              <>
                                <span className={cn("inline-block px-1.5 py-0.5 rounded border text-[10px] font-medium capitalize mr-1", diffColor)}>
                                  {difficulty}
                                </span>
                                {item.description.replace(new RegExp(`^${difficulty}\\s*[·\\-,]?\\s*`, "i"), "")}
                              </>
                            ) : (
                              item.description
                            )}
                          </p>
                        )}
                      </div>
                      {item.price !== undefined && formatPrice && (
                        <span className="text-xs font-medium text-primary shrink-0">
                          {item.price > 0 ? `from ${formatPrice(item.price)}` : "free"}
                        </span>
                      )}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            </Command.List>
          </Command>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
