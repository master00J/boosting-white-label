"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, Loader2 } from "lucide-react";

interface WikiSearchResult {
  id: number;
  name: string;
  icon_url: string;
}

function WikiImg({ src, alt, size }: { src: string; alt: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) return <span className="text-[9px] text-[var(--text-muted)]">—</span>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- external OSRS wiki URLs
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

export default function GearSlotPicker({
  slotLabel,
  value,
  onChange,
}: {
  slotLabel: string;
  value: string;
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WikiSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
        setQuery("");
        setResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const handleOpen = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 2,
        left: rect.left + window.scrollX,
      });
    }
    setOpen((v) => !v);
  };

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/osrs/items/search?q=${encodeURIComponent(q)}`);
      if (res.ok) setResults(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  const select = (name: string) => {
    onChange(name);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  const iconUrl = value
    ? `https://oldschool.runescape.wiki/images/${value.replace(/ /g, "_").replace(/'/g, "%27")}.png`
    : "";

  const useName = query.trim().replace(/^\w/, (c) => c.toUpperCase());

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={{ position: "absolute", top: dropdownPos.top, left: dropdownPos.left, zIndex: 9999 }}
      className="w-52 rounded-lg border border-[#3d3248] bg-[#161018] shadow-xl overflow-hidden"
    >
      {/* Search input */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-[#2d2436]">
        <Search className="h-3 w-3 text-[#6b5b7a] shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder={`Search ${slotLabel}…`}
          className="flex-1 bg-transparent text-[10px] text-white outline-none placeholder:text-[#6b5b7a]"
        />
        {loading && <Loader2 className="h-3 w-3 animate-spin text-[#6b5b7a] shrink-0" />}
      </div>

      {/* Clear */}
      <button
        type="button"
        onClick={() => select("")}
        className="w-full px-2 py-1 text-[10px] text-[#6b5b7a] hover:bg-white/5 text-left transition-colors"
      >
        — None —
      </button>

      <div className="max-h-48 overflow-y-auto">
        {query.length < 2 && (
          <p className="px-2 py-1.5 text-[10px] text-[#6b5b7a] italic">Type to search…</p>
        )}
        {results.length === 0 && query.length >= 2 && !loading && (
          <>
            <p className="px-2 py-1.5 text-[10px] text-[#6b5b7a] italic">Not on GE — use name directly:</p>
            <button
              type="button"
              onClick={() => select(useName)}
              className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-white/5 transition-colors text-left text-[10px] text-primary"
            >
              + Use &quot;{useName}&quot;
            </button>
          </>
        )}
        {results.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => select(r.name)}
            className="w-full flex items-center gap-2 px-2 py-1 hover:bg-white/5 transition-colors text-left"
          >
            <WikiImg src={r.icon_url} alt={r.name} size={16} />
            <span className="text-[10px] text-white truncate">{r.name}</span>
          </button>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        title={value || slotLabel}
        className="w-full h-5 rounded border border-[#2d2436] bg-[#0d0a10] px-0.5 text-[9px] text-left truncate opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1"
      >
        {value ? (
          <>
            <WikiImg src={iconUrl} alt={value} size={12} />
            <span className="truncate flex-1">{value}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onChange(""); } }}
              className="text-[#6b5b7a] hover:text-red-400 transition-colors shrink-0 cursor-pointer"
            >×</span>
          </>
        ) : (
          <span className="text-[#6b5b7a]">— {slotLabel} —</span>
        )}
      </button>

      {typeof window !== "undefined" && createPortal(dropdown, document.body)}
    </div>
  );
}
