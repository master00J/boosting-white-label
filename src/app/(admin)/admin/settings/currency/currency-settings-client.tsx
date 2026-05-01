"use client";

import { useState } from "react";
import { Save, Loader2, Check, Coins, Plus, Trash2 } from "lucide-react";
import type { GameCurrencyConfig, CurrencyRates } from "@/types/currency";

interface Props {
  initialRates: CurrencyRates;
  games: { id: string; name: string }[];
}

const DEFAULT_GAME_CONFIG: GameCurrencyConfig = {
  gold_currency_label: "GP",
  gold_per_usd: 500000,
  gold_payment_instructions: "",
  gold_enabled: false,
};

export default function CurrencySettingsClient({ initialRates, games }: Props) {
  const [rates, setRates] = useState<CurrencyRates>(initialRates);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateUsdEurRate = (val: string) => {
    setRates((r) => ({ ...r, usd_eur_rate: parseFloat(val) || 0 }));
  };

  const updateGameConfig = (gameId: string, patch: Partial<GameCurrencyConfig>) => {
    setRates((r) => ({
      ...r,
      games: {
        ...r.games,
        [gameId]: { ...(r.games[gameId] as GameCurrencyConfig ?? DEFAULT_GAME_CONFIG), ...patch },
      },
    }));
  };

  const addGame = (gameId: string) => {
    if (rates.games[gameId]) return;
    updateGameConfig(gameId, DEFAULT_GAME_CONFIG);
  };

  const removeGame = (gameId: string) => {
    setRates((r) => {
      const updated = { ...r.games };
      delete updated[gameId];
      return { ...r, games: updated };
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { currency_rates: rates } }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const configuredGameIds = Object.keys(rates.games);
  const unconfiguredGames = games.filter((g) => !configuredGameIds.includes(g.id));

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Settings</p>
          <h1 className="font-heading text-2xl font-semibold">Currency & Gold</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure USD as primary currency and per-game gold payment rates.</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved!" : "Save"}
        </button>
      </div>

      {/* Exchange rate */}
      <div className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
        <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" />
          Exchange rate
        </h2>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">USD → EUR rate</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">1 USD =</span>
            <input
              type="number"
              step="0.001"
              min="0.01"
              max="10"
              value={rates.usd_eur_rate}
              onChange={(e) => updateUsdEurRate(e.target.value)}
              className="w-28 px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm focus:outline-none focus:border-primary transition-colors"
            />
            <span className="text-sm text-muted-foreground">EUR</span>
          </div>
          <p className="text-xs text-muted-foreground">Used to convert USD prices to EUR for Stripe/PayPal if needed.</p>
        </div>
      </div>

      {/* Per-game gold config */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-sm">Gold payment — per game</h2>
          {unconfiguredGames.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => { if (e.target.value) { addGame(e.target.value); e.target.value = ""; } }}
              className="text-xs px-3 py-1.5 rounded-lg border border-dashed border-primary/40 bg-transparent text-primary hover:bg-primary/5 transition-colors cursor-pointer"
            >
              <option value="" disabled>+ Add game</option>
              {unconfiguredGames.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>

        {configuredGameIds.length === 0 && (
          <div className="p-6 rounded-2xl border border-dashed border-[var(--border-default)] text-center text-sm text-muted-foreground">
            No games configured yet. Use &quot;+ Add game&quot; to set up gold payments for a game.
          </div>
        )}

        {configuredGameIds.map((gameId) => {
          const game = games.find((g) => g.id === gameId);
          const cfg = (rates.games[gameId] as GameCurrencyConfig) ?? DEFAULT_GAME_CONFIG;
          return (
            <div key={gameId} className="p-5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{game?.name ?? gameId}</h3>
                <div className="flex items-center gap-3">
                  {/* Gold enabled toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => updateGameConfig(gameId, { gold_enabled: !cfg.gold_enabled })}
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${cfg.gold_enabled ? "bg-primary" : "bg-[var(--bg-elevated)]"}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${cfg.gold_enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                    </div>
                    <span className="text-xs text-muted-foreground">Gold enabled</span>
                  </label>
                  <button
                    onClick={() => removeGame(gameId)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Gold currency label</label>
                  <input
                    type="text"
                    value={cfg.gold_currency_label}
                    onChange={(e) => updateGameConfig(gameId, { gold_currency_label: e.target.value })}
                    placeholder="e.g. OSRS GP"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Gold per $1 USD</label>
                  <input
                    type="number"
                    min="1"
                    value={cfg.gold_per_usd}
                    onChange={(e) => updateGameConfig(gameId, { gold_per_usd: parseInt(e.target.value) || 1 })}
                    placeholder="e.g. 750000"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Payment instructions (shown to customer after ordering)</label>
                <textarea
                  value={cfg.gold_payment_instructions}
                  onChange={(e) => updateGameConfig(gameId, { gold_payment_instructions: e.target.value })}
                  rows={3}
                  placeholder="e.g. Trade the gold to username: BoostPlatform in-game. World 301, Grand Exchange."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-sm focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              {cfg.gold_per_usd > 0 && (
                <p className="text-xs text-muted-foreground bg-[var(--bg-elevated)] px-3 py-2 rounded-lg">
                  Preview: $1.00 = {cfg.gold_per_usd.toLocaleString("en-US")} {cfg.gold_currency_label}
                </p>
              )}
            </div>
          );
        })}

        {unconfiguredGames.length > 0 && configuredGameIds.length === 0 && (
          <button
            onClick={() => unconfiguredGames[0] && addGame(unconfiguredGames[0].id)}
            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add first game
          </button>
        )}
      </div>
    </div>
  );
}
