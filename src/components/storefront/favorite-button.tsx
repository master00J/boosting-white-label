"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils/cn";

type Props = {
  gameId: string;
  className?: string;
  size?: "sm" | "md";
};

export default function FavoriteButton({ gameId, className, size = "md" }: Props) {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!user) {
      setInitialized(true);
      return;
    }
    fetch("/api/favorites")
      .then((r) => r.json())
      .then((data: { gameIds?: string[] }) => {
        setIsFavorite(Array.isArray(data.gameIds) && data.gameIds.includes(gameId));
        setInitialized(true);
      })
      .catch(() => setInitialized(true));
  }, [user, gameId]);

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return;
    setLoading(true);
    try {
      if (isFavorite) {
        const res = await fetch(`/api/favorites?game_id=${encodeURIComponent(gameId)}`, { method: "DELETE" });
        if (res.ok) setIsFavorite(false);
      } else {
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ game_id: gameId }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && (data.ok || data.added)) setIsFavorite(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user || !initialized) return null;

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "rounded-full p-1.5 transition-colors",
        "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary/50",
        "disabled:opacity-50",
        isFavorite ? "text-red-400 hover:text-red-300" : "text-[var(--text-muted)] hover:text-red-400",
        className
      )}
    >
      <Heart
        className={cn(iconSize, isFavorite && "fill-current")}
      />
    </button>
  );
}
