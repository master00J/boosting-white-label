"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Search,
  Store,
  Eye,
  EyeOff,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Sheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils/slugify";
import { getBankItemIcon } from "@/lib/osrs-equipment";

type Game = { id: string; name: string; slug: string };

type Shop = {
  id: string;
  game_id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

type ShopItem = {
  id: string;
  shop_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  price_each: number;
  is_available: boolean;
  sort_order: number;
};

type BankRow = { itemId: string; name: string; qty: number };

function parseBankExport(text: string): BankRow[] {
  const lines = text.trim().split(/\r?\n/);
  const items: BankRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split("\t");
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

/** Inline editable price cell */
function PriceCell({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState(String(value));
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { setRaw(String(value)); }, [value]);

  const commit = () => {
    const n = parseFloat(raw);
    if (!isNaN(n) && n >= 0) onChange(n);
    else setRaw(String(value));
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={ref}
        type="number"
        min={0}
        step={0.01}
        value={raw}
        autoFocus
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setRaw(String(value)); setEditing(false); } }}
        className="w-24 h-7 px-2 rounded bg-[var(--bg-card)] border border-primary text-xs text-right focus:outline-none"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="w-24 h-7 px-2 rounded hover:bg-white/5 text-xs text-right font-mono tabular-nums transition-colors"
      title="Click to edit price"
    >
      ${value.toFixed(2)}
    </button>
  );
}

/** Bank import panel inside a shop */
function ShopItemsPanel({ shop }: { shop: Shop; gameSlug?: string }) {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bankText, setBankText] = useState("");
  const [bankRows, setBankRows] = useState<BankRow[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [sheetUrl, setSheetUrl] = useState("");
  const [sheetImporting, setSheetImporting] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const fetchItems = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/gim-shop/${shop.id}/items`)
      .then((r) => r.json())
      .then((d: ShopItem[]) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setError("Failed to load items"))
      .finally(() => setLoading(false));
  }, [shop.id]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleImport = () => {
    const rows = parseBankExport(bankText);
    if (rows.length === 0) { setError("No valid items found. Make sure the format is correct (tab-separated: id, name, qty)."); return; }
    setBankRows(rows);
    setImportOpen(false);
    setBankText("");
    setError(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setBankText(text ?? "");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSheetImport = async () => {
    if (!sheetUrl.trim()) return;
    setSheetImporting(true);
    setSheetError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch("/api/admin/gim-shop/import-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sheetUrl.trim() }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json() as { items?: { item_name: string; quantity: number; price_each: number }[]; error?: string };
      if (!res.ok || !data.items) {
        setSheetError(data.error ?? "Import failed");
        return;
      }
      // Convert to BankRow format and set price overrides
      const rows: BankRow[] = data.items.map((i) => ({ itemId: i.item_name, name: i.item_name, qty: i.quantity }));
      const newOverrides: Record<string, number> = {};
      data.items.forEach((i) => { newOverrides[i.item_name] = i.price_each; });
      setBankRows(rows);
      setPriceOverrides(newOverrides);
      setImportOpen(false);
      setSheetUrl("");
    } catch (e) {
      if ((e as Error).name === "AbortError") setSheetError("Request timed out");
      else setSheetError("Import failed. Check that the sheet is public.");
    } finally {
      setSheetImporting(false);
    }
  };

  // Merge bankRows into existing items: keep prices of existing items
  const mergedItems: (ShopItem | (BankRow & { price_each: number; is_available: boolean }))[] = bankRows.length > 0
    ? bankRows.map((r, idx) => {
      const existing = items.find((i) => i.item_id === r.itemId);
      return existing
        ? { ...existing, quantity: r.qty }
        : { id: `new-${idx}`, shop_id: shop.id, item_id: r.itemId, item_name: r.name, quantity: r.qty, price_each: 0, is_available: true, sort_order: idx };
    })
    : items;

  const displayItems = mergedItems as ShopItem[];


  // Local price overrides when bank is imported but not yet saved
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>({});
  const [availOverrides, setAvailOverrides] = useState<Record<string, boolean>>({});

  const finalItems = displayItems.map((item) => ({
    ...item,
    price_each: priceOverrides[item.item_id] ?? item.price_each,
    is_available: availOverrides[item.item_id] ?? item.is_available,
  }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(`/api/admin/gim-shop/${shop.id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: finalItems.map((item, idx) => ({
            item_id: item.item_id,
            item_name: item.item_name,
            quantity: item.quantity,
            price_each: item.price_each,
            is_available: item.is_available,
            sort_order: idx,
          })),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? "Save failed");
        return;
      }
      setSaved(true);
      setBankRows([]);
      setPriceOverrides({});
      setAvailOverrides({});
      setTimeout(() => setSaved(false), 2500);
      fetchItems();
    } catch (e) {
      if ((e as Error).name === "AbortError") setError("Request timed out. Please try again.");
      else setError("Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (item: ShopItem) => {
    if (bankRows.length > 0) {
      setAvailOverrides((prev) => ({ ...prev, [item.item_id]: !(availOverrides[item.item_id] ?? item.is_available) }));
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      await fetch(`/api/admin/gim-shop/${shop.id}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, is_available: !item.is_available }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      fetchItems();
    } catch { /* ignore */ }
  };

  const filteredItems = finalItems.filter((i) =>
    !search || i.item_name.toLowerCase().includes(search.toLowerCase())
  );

  const hasUnsaved = bankRows.length > 0 || Object.keys(priceOverrides).length > 0;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setImportOpen((o) => !o)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs transition-colors"
        >
          <Upload className="h-3.5 w-3.5" />
          Import bank
          {importOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-xs focus:outline-none focus:border-primary"
          />
        </div>

        {hasUnsaved && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="gap-1.5 text-xs"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : null}
            {saved ? "Saved!" : saving ? "Saving…" : "Save changes"}
          </Button>
        )}

        {!hasUnsaved && items.length > 0 && (
          <a
            href={`/shop/${shop.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview shop
          </a>
        )}
      </div>

      {/* Import panel */}
      {importOpen && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-4">
          {/* Google Sheets import */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Sheet className="h-3.5 w-3.5 text-green-400" />
              <p className="text-xs font-medium">Import from Google Sheets</p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Paste the Google Sheets URL. The sheet must be shared as &quot;Anyone with the link can view&quot;.
              Columns needed: <span className="font-mono">Item Name</span>, <span className="font-mono">In Stock</span>, <span className="font-mono">Price</span>.
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={sheetUrl}
                onChange={(e) => { setSheetUrl(e.target.value); setSheetError(null); }}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="flex-1 h-8 px-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-default)] text-xs focus:outline-none focus:border-primary"
              />
              <Button size="sm" onClick={handleSheetImport} disabled={!sheetUrl.trim() || sheetImporting} className="gap-1.5 shrink-0">
                {sheetImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sheet className="h-3.5 w-3.5" />}
                {sheetImporting ? "Importing…" : "Import"}
              </Button>
            </div>
            {sheetError && (
              <p className="text-[11px] text-destructive">{sheetError}</p>
            )}
          </div>

          <div className="border-t border-[var(--border-default)] pt-3 space-y-2">
            <p className="text-xs font-medium">Or import RuneLite Bank Memory export</p>
            <p className="text-[11px] text-muted-foreground">
              In RuneLite: open Bank Memory plugin → export → copy the tab-separated output here, or upload the .txt file.
            </p>
            <Textarea
              value={bankText}
              onChange={(e) => setBankText(e.target.value)}
              placeholder={"Item id\tItem name\tItem quantity\n1234\tCoins\t500000"}
              rows={4}
              className="font-mono text-xs"
            />
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" onClick={handleImport} disabled={!bankText.trim()}>
                Parse import
              </Button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs transition-colors"
              >
                <Upload className="h-3.5 w-3.5" /> Upload .txt
              </button>
              <input ref={fileRef} type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Items grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
          <Store className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {items.length === 0
              ? "No items yet. Import a bank export to populate the shop."
              : "No items match your search."}
          </p>
        </div>
      ) : (
        <>
          <p className="text-[11px] text-muted-foreground">
            {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
            {bankRows.length > 0 ? " — set prices, then save" : ""}
            {" · "}
            <span className="text-primary">Click a price to edit it</span>
          </p>

          <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground bg-white/[0.03] px-3 py-2 border-b border-[var(--border-default)]">
              <span className="w-8" />
              <span>Item</span>
              <span className="w-16 text-right">Qty</span>
              <span className="w-24 text-right">Price each</span>
              <span className="w-8" />
            </div>

            <div className="divide-y divide-[var(--border-default)] max-h-[520px] overflow-y-auto">
              {filteredItems.map((item) => {
                const icon = getBankItemIcon(item.item_name);
                return (
                  <div
                    key={item.item_id}
                    className={`grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-0 px-3 py-2 transition-colors ${item.is_available ? "" : "opacity-40"}`}
                  >
                    {/* Icon */}
                    <div className="w-8 flex items-center justify-center">
                      {icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={icon} alt={item.item_name} width={24} height={24} className="object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-6 h-6 rounded bg-white/5" />
                      )}
                    </div>

                    {/* Name */}
                    <span className="text-xs truncate pr-3">{item.item_name}</span>

                    {/* Qty */}
                    <span className="w-16 text-right text-xs font-mono tabular-nums text-muted-foreground">
                      {item.quantity.toLocaleString()}
                    </span>

                    {/* Price */}
                    <div className="w-24 flex justify-end">
                      <PriceCell
                        value={item.price_each}
                        onChange={(v) => {
                          if (bankRows.length > 0) {
                            setPriceOverrides((prev) => ({ ...prev, [item.item_id]: v }));
                          } else {
                            // Optimistic update then save
                            setItems((prev) => prev.map((i) => i.item_id === item.item_id ? { ...i, price_each: v } : i));
                            fetch(`/api/admin/gim-shop/${shop.id}/items`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: item.id, price_each: v }),
                            }).catch(() => fetchItems());
                          }
                        }}
                      />
                    </div>

                    {/* Visibility toggle */}
                    <div className="w-8 flex justify-center">
                      <button
                        onClick={() => toggleAvailability(item)}
                        className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                        title={item.is_available ? "Hide from shop" : "Show in shop"}
                      >
                        {item.is_available ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** Create/edit shop modal form */
function ShopForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Shop>;
  onSave: (data: { name: string; slug: string; description: string; is_active: boolean }) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!initial?.slug) setSlug(slugify(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave({ name, slug, description, is_active: isActive });
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Shop name</Label>
          <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="My GIM Shop" required />
        </div>
        <div className="space-y-1.5">
          <Label>Slug (URL)</Label>
          <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-gim-shop" required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description of this shop" rows={2} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="active-toggle" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
        <Label htmlFor="active-toggle">Active (visible to customers)</Label>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {initial?.id ? "Save changes" : "Create shop"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function GimShopClient({ game }: { game: Game }) {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [openShopId, setOpenShopId] = useState<string | null>(null);

  const fetchShops = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/games/${game.id}/gim-shop`)
      .then((r) => r.json())
      .then((d: Shop[]) => setShops(Array.isArray(d) ? d : []))
      .catch(() => setError("Failed to load shops"))
      .finally(() => setLoading(false));
  }, [game.id]);

  useEffect(() => { fetchShops(); }, [fetchShops]);

  const handleCreate = async (data: { name: string; slug: string; description: string; is_active: boolean }) => {
    const res = await fetch(`/api/admin/games/${game.id}/gim-shop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})) as { error?: string }; setError(d.error ?? "Create failed"); return; }
    const created = await res.json() as Shop;
    setModal(null);
    setOpenShopId(created.id);
    fetchShops();
  };

  const handleEdit = async (data: { name: string; slug: string; description: string; is_active: boolean }) => {
    if (!editingShop) return;
    const res = await fetch(`/api/admin/gim-shop/${editingShop.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})) as { error?: string }; setError(d.error ?? "Update failed"); return; }
    setModal(null);
    setEditingShop(null);
    fetchShops();
  };

  const handleDelete = async (shop: Shop) => {
    if (!confirm(`Delete shop "${shop.name}" and all its items?`)) return;
    const res = await fetch(`/api/admin/gim-shop/${shop.id}`, { method: "DELETE" });
    if (!res.ok) { setError("Delete failed"); return; }
    if (openShopId === shop.id) setOpenShopId(null);
    fetchShops();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/games" className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-0.5">
            {game.name}
          </p>
          <h1 className="font-heading text-xl font-semibold flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            GIM Shop
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload your group ironman bank and set prices per item.
          </p>
        </div>
        <Button size="sm" onClick={() => setModal("create")} className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" /> New shop
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          <X className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Create modal */}
      {modal === "create" && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5 space-y-3">
          <p className="text-sm font-semibold">Create new shop</p>
          <ShopForm onSave={handleCreate} onCancel={() => setModal(null)} />
        </div>
      )}

      {/* Edit modal */}
      {modal === "edit" && editingShop && (
        <div className="rounded-xl border border-primary/30 bg-[var(--bg-card)] p-5 space-y-3">
          <p className="text-sm font-semibold">Edit shop</p>
          <ShopForm
            initial={editingShop}
            onSave={handleEdit}
            onCancel={() => { setModal(null); setEditingShop(null); }}
          />
        </div>
      )}

      {/* Shop list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : shops.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Store className="h-10 w-10 text-muted-foreground/30" />
          <div>
            <p className="text-sm font-medium">No shops yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create a shop, import your bank and set prices.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {shops.map((shop) => {
            const isOpen = openShopId === shop.id;
            return (
              <div
                key={shop.id}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden"
              >
                {/* Shop header row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => setOpenShopId(isOpen ? null : shop.id)}
                    className="flex-1 flex items-center gap-3 min-w-0 text-left"
                  >
                    {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{shop.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">/shop/{shop.slug}</p>
                    </div>
                    <span className={`ml-auto shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${shop.is_active ? "bg-green-500/15 text-green-400" : "bg-white/5 text-muted-foreground"}`}>
                      {shop.is_active ? "Active" : "Inactive"}
                    </span>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingShop(shop); setModal("edit"); }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(shop)}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Items panel (collapsible) */}
                {isOpen && (
                  <div className="border-t border-[var(--border-default)] p-4">
                    <ShopItemsPanel shop={shop} gameSlug={game.slug} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
