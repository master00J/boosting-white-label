"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Save, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type GameRow = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
};

export default function WorkerGamesClient({
  workerId,
  allGames,
  selectedGameIds,
}: {
  workerId: string;
  allGames: GameRow[];
  selectedGameIds: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedGameIds));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      await supabase
        .from("workers")
        .update({ games: Array.from(selected) } as never)
        .eq("id", workerId);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Booster</p>
          <h1 className="font-heading text-2xl font-semibold">My games</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Select the games for which you want to receive orders.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? "Saved!" : "Save"}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {allGames.map((game) => {
          const isSelected = selected.has(game.id);
          return (
            <button
              key={game.id}
              onClick={() => toggle(game.id)}
              className={`relative p-4 rounded-2xl border transition-all text-left ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-[var(--border-default)] bg-[var(--bg-card)] hover:border-primary/30"
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
              <div className="flex flex-col items-center gap-2">
                {game.logo_url ? (
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden">
                    <Image src={game.logo_url} alt={game.name} fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-2xl">
                    🎮
                  </div>
                )}
                <span className="text-xs font-medium text-center leading-tight">{game.name}</span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        {selected.size} of {allGames.length} games selected
      </p>
    </div>
  );
}
