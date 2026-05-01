"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/client";

type Game = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_featured: boolean;
};

type ServiceResult = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  category: { slug: string; image_url: string | null } | null;
  game: { name: string; slug: string; logo_url: string | null } | null;
};

interface Props {
  query: string;
  onClose: () => void;
}

export default function GamesMegaMenu({ query, onClose }: Props) {
  const [games, setGames] = useState<Game[]>([]);
  const [services, setServices] = useState<ServiceResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchingServices, setSearchingServices] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("games")
      .select("id, name, slug, logo_url, is_featured")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        setGames((data as Game[]) ?? []);
        setLoading(false);
      });
  }, []);

  // Search services when query changes
  useEffect(() => {
    if (!query || query.length < 2) { setServices([]); return; }
    setSearchingServices(true);
    const supabase = createClient();
    supabase
      .from("services")
      .select("id, name, slug, image_url, category:service_categories(slug, image_url), game:games(name, slug, logo_url)")
      .eq("is_active", true)
      .ilike("name", `%${query}%`)
      .limit(8)
      .then(({ data }) => {
        setServices((data as ServiceResult[]) ?? []);
        setSearchingServices(false);
      });
  }, [query]);

  const filteredGames = query
    ? games.filter((g) => g.name.toLowerCase().includes(query.toLowerCase()))
    : games;

  const hasResults = filteredGames.length > 0 || services.length > 0;

  return (
    <>
      <div className="fixed left-0 right-0 top-16 bottom-0 z-30" onClick={onClose} />

      <div className="fixed left-0 right-0 top-16 z-40 bg-[#0A0803] border-b border-[#E8720C]/30 shadow-2xl shadow-black/80 max-h-[520px] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 rounded-full border-2 border-[#E8720C]/30 border-t-[#E8720C] animate-spin" />
            </div>
          ) : query && !hasResults && !searchingServices ? (
            <div className="text-center py-16 text-[var(--text-muted)]">
              <p className="text-sm">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-xs mt-1 opacity-60">Try searching for a game or service name</p>
            </div>
          ) : (
            <>
              {/* Services results — shown when searching */}
              {query && services.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#E8720C]/60 mb-2">
                    Services
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {services.map((svc) => (
                      <Link
                        key={svc.id}
                        href={`/games/${svc.game?.slug}/${svc.slug}`}
                        onClick={onClose}
                        className={cn(
                          "group flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all",
                          "text-[var(--text-secondary)] hover:text-[#FF9438]",
                          "hover:bg-[#E8720C]/[0.07] border border-transparent hover:border-[#E8720C]/20"
                        )}
                      >
                        <div className="w-7 h-7 rounded-md bg-[#1A1208] border border-[#E8720C]/15 flex items-center justify-center overflow-hidden shrink-0">
                          {(() => {
                            const thumb = svc.image_url
                              ?? (svc.category as { image_url?: string | null } | null)?.image_url
                              ?? svc.game?.logo_url;
                            return thumb ? (
                              <Image src={thumb} alt={svc.name} width={28} height={28} className="object-contain w-full h-full p-0.5" unoptimized />
                            ) : (
                              <span className="text-sm leading-none">⚔️</span>
                            );
                          })()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-tight truncate">{svc.name}</p>
                          {svc.game && (
                            <p className="text-[10px] text-[var(--text-muted)] truncate">{svc.game.name}</p>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Games grid */}
              {filteredGames.length > 0 && (
                <div>
                  {query && services.length > 0 && (
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#E8720C]/60 mb-2">
                      Games
                    </p>
                  )}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-1">
                    {filteredGames.map((game) => (
                      <Link
                        key={game.id}
                        href={`/games/${game.slug}`}
                        onClick={onClose}
                        className={cn(
                          "group flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all",
                          "text-[var(--text-secondary)] hover:text-[#FF9438]",
                          "hover:bg-[#E8720C]/[0.07] border border-transparent hover:border-[#E8720C]/20"
                        )}
                      >
                        <div className="w-7 h-7 rounded-md bg-[#1A1208] border border-[#E8720C]/15 flex items-center justify-center overflow-hidden shrink-0">
                          {game.logo_url ? (
                            <Image src={game.logo_url} alt={game.name} width={28} height={28} className="object-cover w-full h-full" unoptimized />
                          ) : (
                            <span className="text-base leading-none">🎮</span>
                          )}
                        </div>
                        <span className="text-sm font-medium leading-tight truncate">
                          {game.name}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-2.5 border-t border-[#E8720C]/10 shrink-0 flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">
            {query
              ? `${filteredGames.length} game${filteredGames.length !== 1 ? "s" : ""} · ${services.length} service${services.length !== 1 ? "s" : ""}`
              : `${filteredGames.length} game${filteredGames.length !== 1 ? "s" : ""}`
            }
          </span>
          <Link href="/games" onClick={onClose} className="text-xs font-medium text-[#E8720C]/70 hover:text-[#FF9438] transition-colors">
            View all games →
          </Link>
        </div>
      </div>
    </>
  );
}
