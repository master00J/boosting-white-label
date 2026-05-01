"use client";

import { useState } from "react";
import { Globe, Check, Loader2, ChevronDown } from "lucide-react";

// Common VPN countries with flag emojis
export const VPN_COUNTRIES = [
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "SK", name: "Slovakia", flag: "🇸🇰" },
  { code: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "LT", name: "Lithuania", flag: "🇱🇹" },
  { code: "LV", name: "Latvia", flag: "🇱🇻" },
  { code: "EE", name: "Estonia", flag: "🇪🇪" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "RS", name: "Serbia", flag: "🇷🇸" },
  { code: "BG", name: "Bulgaria", flag: "🇧🇬" },
  { code: "HR", name: "Croatia", flag: "🇭🇷" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
];

export function getCountryInfo(code: string | null) {
  if (!code) return null;
  return VPN_COUNTRIES.find((c) => c.code === code.toUpperCase()) ?? { code, name: code, flag: "🌐" };
}

export default function VpnLocationPicker({
  orderId,
  initialCountryCode,
}: {
  orderId: string;
  initialCountryCode: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(initialCountryCode);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  const current = getCountryInfo(selected);

  const filtered = VPN_COUNTRIES.filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (code: string | null) => {
    setOpen(false);
    setSearch("");
    if (code === selected) return;
    setSaving(true);
    setSelected(code);
    try {
      await fetch(`/api/worker/orders/${orderId}/vpn-location`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpn_country_code: code }),
      });
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] hover:border-primary/40 transition-colors text-sm"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
        ) : (
          <Globe className="h-4 w-4 text-primary shrink-0" />
        )}
        {current ? (
          <span className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
            <span className="text-base leading-none">{current.flag}</span>
            <span className="truncate">{current.name}</span>
          </span>
        ) : (
          <span className="flex-1 text-left text-muted-foreground">Select VPN country…</span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setSearch(""); }} />
          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl shadow-2xl overflow-hidden">
            <div className="p-2 border-b border-[var(--border-default)]">
              <input
                autoFocus
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country…"
                className="w-full h-8 px-3 rounded-lg bg-[var(--bg-elevated)] text-sm focus:outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {selected && (
                <button
                  onClick={() => handleSelect(null)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 transition-colors"
                >
                  <span className="text-base">✖</span> Clear location
                </button>
              )}
              {filtered.map((country) => (
                <button
                  key={country.code}
                  onClick={() => handleSelect(country.code)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-white/5 transition-colors"
                >
                  <span className="text-base leading-none w-6 text-center">{country.flag}</span>
                  <span className="flex-1 text-left">{country.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{country.code}</span>
                  {selected === country.code && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-3 py-4 text-sm text-muted-foreground text-center">No countries found</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
