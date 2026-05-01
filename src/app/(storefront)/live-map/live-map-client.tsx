"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Activity } from "lucide-react";
import { getCountryInfo } from "@/app/(worker)/booster/orders/[id]/vpn-location-picker";

// Load the full map component (which uses react-simple-maps) client-side only
const WorldMap = dynamic(() => import("./world-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] flex items-center justify-center bg-[#0f0f13]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground">Loading map…</p>
      </div>
    </div>
  ),
});

type Location = { country_code: string; count: number };

export default function LiveMapClient({
  locations: initialLocations,
  total: initialTotal,
}: {
  locations: Location[];
  total: number;
}) {
  const [locations, setLocations] = useState(initialLocations);
  const [total, setTotal] = useState(initialTotal);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/active-locations");
      if (res.ok) {
        const data = (await res.json()) as { locations: Location[]; total: number };
        setLocations(data.locations);
        setTotal(data.total);
        setLastRefresh(new Date());
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const activeCountries = new Set(locations.map((l) => l.country_code)).size;

  return (
    <main
      className="min-h-screen text-white"
      style={{ background: "radial-gradient(ellipse 120% 80% at 50% 0%, #1a0303 0%, #0a0000 50%, #060000 100%)" }}
    >
      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-16 space-y-8">

        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "#FF8C00" }} />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "#FF8C00" }} />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#FF8C00" }}>Live</p>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold">Booster Activity Map</h1>
          <p className="max-w-xl" style={{ color: "rgba(255,160,80,0.6)" }}>
            Real-time overview of where our boosters are actively executing orders.
            Locations reflect the VPN server being used.
          </p>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4">
          {[
            { icon: <Activity className="h-4 w-4" style={{ color: "#FF8C00" }} />, value: total, label: "Active orders" },
            { icon: <span className="text-lg">🌍</span>, value: activeCountries, label: "Countries active" },
          ].map((stat, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "rgba(255,100,20,0.07)", border: "1px solid rgba(255,100,20,0.2)" }}
            >
              {stat.icon}
              <div>
                <p className="text-2xl font-bold" style={{ color: "#FF8C00" }}>{stat.value}</p>
                <p className="text-xs" style={{ color: "rgba(255,150,60,0.6)" }}>{stat.label}</p>
              </div>
            </div>
          ))}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: "rgba(255,100,20,0.07)", border: "1px solid rgba(255,100,20,0.2)" }}
          >
            <span className="text-xs" style={{ color: "rgba(255,150,60,0.5)" }}>
              Updated {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <button
              onClick={refresh}
              className="text-xs underline underline-offset-2 transition-opacity hover:opacity-70"
              style={{ color: "#FF8C00" }}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Globe */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,100,20,0.25)", boxShadow: "0 0 40px rgba(255,80,10,0.12)" }}
        >
          <WorldMap locations={locations} />
        </div>

        {/* Country list */}
        {locations.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium" style={{ color: "rgba(255,150,60,0.7)" }}>Active regions</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {[...locations].sort((a, b) => b.count - a.count).map((loc) => {
                const info = getCountryInfo(loc.country_code);
                if (!info) return null;
                return (
                  <div
                    key={loc.country_code}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                    style={{ background: "rgba(255,100,20,0.07)", border: "1px solid rgba(255,100,20,0.18)" }}
                  >
                    <span className="text-xl leading-none">{info.flag}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate text-white">{info.name}</p>
                      <p className="text-[10px]" style={{ color: "rgba(255,150,60,0.55)" }}>
                        {loc.count} order{loc.count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span
                      className="ml-auto w-2 h-2 rounded-full animate-pulse shrink-0"
                      style={{ background: "#FF8C00" }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <Activity className="h-8 w-8 opacity-20" style={{ color: "#FF8C00" }} />
            <p className="text-sm" style={{ color: "rgba(255,150,60,0.5)" }}>No active orders at the moment.</p>
          </div>
        )}

      </div>
    </main>
  );
}
