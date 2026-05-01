"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingCart, Menu, X, LogOut, LayoutDashboard, Package, ChevronDown, Gamepad2, Search, MessageSquare, Store } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import Logo from "@/components/shared/logo";
import { useAuth } from "@/components/providers/auth-provider";
import { useCartStore } from "@/stores/cart-store";
import UserAvatar from "@/components/shared/user-avatar";
import GamesMegaMenu from "@/components/layouts/games-mega-menu";

const NAV_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/shop", label: "GIM Shop" },
  { href: "/live-map", label: "Live Map" },
  { href: "/lootboxes", label: "Lootboxes" },
  { href: "/duel-arena", label: "Duel Arena" },
  { href: "/apply", label: "Become a booster" },
  { href: "/contact", label: "Contact" },
];

export default function StorefrontNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const itemCount = useCartStore((s) => s.getItemCount());
  const gamesRef = useRef<HTMLDivElement>(null);
  const gamesCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setGamesOpen(false);
    setSearchQuery("");
  }, [pathname]);

  const openGames = useCallback(() => {
    if (gamesCloseTimer.current) clearTimeout(gamesCloseTimer.current);
    setGamesOpen(true);
  }, []);

  const scheduleCloseGames = useCallback(() => {
    gamesCloseTimer.current = setTimeout(() => {
      setGamesOpen(false);
      setSearchQuery("");
    }, 150);
  }, []);

  const closeGames = useCallback(() => {
    setGamesOpen(false);
    setSearchQuery("");
  }, []);

  const getDashboardHref = () => {
    if (!profile) return "/dashboard";
    if (profile.role === "admin" || profile.role === "super_admin") return "/admin/dashboard";
    if (profile.role === "worker") return "/booster/dashboard";
    return "/dashboard";
  };

  const getDashboardLabel = () => {
    if (!profile) return "Dashboard";
    if (profile.role === "admin" || profile.role === "super_admin") return "Staff Overview";
    if (profile.role === "worker") return "Booster Dashboard";
    return "Dashboard";
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-40 transition-all duration-300",
        scrolled
          ? "bg-[#0C0906]/96 backdrop-blur-xl border-b border-[#E8720C]/20 shadow-lg shadow-black/30"
          : "bg-[#0C0906]/85 backdrop-blur-md border-b border-[#E8720C]/08"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
        {/* Logo */}
        <Logo size="md" href="/" />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 shrink-0">
          {/* Games mega-menu trigger */}
          <div
            ref={gamesRef}
            className="relative"
            onMouseEnter={openGames}
            onMouseLeave={scheduleCloseGames}
          >
            <button
              type="button"
              onClick={() => { setGamesOpen((v) => !v); searchRef.current?.focus(); }}
              className={cn(
                "flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                gamesOpen || pathname.startsWith("/games")
                  ? "text-[#FF9438] bg-[#E8720C]/[0.08]"
                  : "text-[var(--text-secondary)] hover:text-[#FF9438] hover:bg-[#E8720C]/[0.06]"
              )}
            >
              <Gamepad2 className="h-4 w-4" />
              Games
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", gamesOpen && "rotate-180")} />
            </button>
            {gamesOpen && (
              <div onMouseEnter={openGames} onMouseLeave={scheduleCloseGames}>
                <GamesMegaMenu query={searchQuery} onClose={closeGames} />
              </div>
            )}
          </div>

          {/* Direct nav links */}
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                pathname.startsWith(link.href)
                  ? "text-[#FF9438] bg-[#E8720C]/[0.08]"
                  : "text-[var(--text-secondary)] hover:text-[#FF9438] hover:bg-[#E8720C]/[0.06]"
              )}
            >
              {link.label}
            </Link>
          ))}

          {/* Support link */}
          <Link
            href="/contact"
            className="px-2.5 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[#7289da] hover:bg-[#7289da]/[0.08] transition-colors"
            aria-label="Support"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
          </Link>
        </nav>

        {/* Search bar — center, desktop only */}
        <div className="hidden md:flex flex-1 max-w-sm" onMouseEnter={openGames} onMouseLeave={scheduleCloseGames}>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); openGames(); }}
              onFocus={openGames}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  e.preventDefault();
                  closeGames();
                  router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                }
              }}
              placeholder="Search games & services…"
              className={cn(
                "w-full h-9 pl-9 pr-3 rounded-lg text-sm transition-colors",
                "bg-[#1A1208]/80 border text-[var(--text-primary)] placeholder:text-[var(--text-muted)]",
                "focus:outline-none",
                gamesOpen
                  ? "border-[#E8720C]/50 bg-[#1A1208]"
                  : "border-[#E8720C]/20 hover:border-[#E8720C]/35"
              )}
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Cart */}
          <Link
            href="/cart"
            className="relative p-2 rounded-lg text-[var(--text-secondary)] hover:text-[#FF9438] hover:bg-[#E8720C]/[0.06] transition-colors"
            aria-label={`Shopping cart${mounted && itemCount > 0 ? `, ${itemCount} items` : ""}`}
          >
            <ShoppingCart className="h-5 w-5" />
            {mounted && itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </Link>

          {/* Auth — only render after mount to avoid hydration mismatch */}
          {mounted && (user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#E8720C]/[0.08] transition-colors"
                aria-label="User menu"
                aria-expanded={userMenuOpen}
              >
                <UserAvatar
                  src={profile?.avatar_url}
                  name={profile?.display_name ?? profile?.email}
                  size={28}
                />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl shadow-2xl z-20 py-1.5 overflow-hidden">
                    <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
                      <p className="text-sm font-medium truncate">{profile?.display_name ?? "User"}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{profile?.email}</p>
                    </div>
                    <Link
                      href={getDashboardHref()}
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#E8720C]/[0.06] hover:text-[#FF9438] transition-colors"
                    >
                      <LayoutDashboard className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      {getDashboardLabel()}
                    </Link>
                    <Link
                      href="/orders"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#E8720C]/[0.06] hover:text-[#FF9438] transition-colors"
                    >
                      <Package className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      My orders
                    </Link>
                    <Link
                      href="/support"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[#E8720C]/[0.06] hover:text-[#FF9438] transition-colors"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                      Support
                    </Link>
                    <div className="border-t border-[var(--border-subtle)] my-1" />
                    <button
                      onClick={async () => {
                        setUserMenuOpen(false);
                        await signOut();
                        router.replace("/");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[#FF9438] hover:bg-[#E8720C]/[0.06] transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 rounded-md text-sm font-semibold bg-[var(--color-primary)] text-[#0E0B07] hover:bg-[#FF9438] hover:shadow-lg hover:shadow-[#E8720C]/25 transition-all"
              >
                Register
              </Link>
            </div>
          ))}

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-[var(--text-secondary)] hover:text-[#FF9438] hover:bg-[#E8720C]/[0.06] transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0C0906]/98 backdrop-blur-xl border-t border-[#E8720C]/15 px-4 py-4 space-y-1">
          <Link
            href="/games"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[#FF9438] hover:bg-[#E8720C]/[0.06] transition-colors"
          >
            <Gamepad2 className="h-4 w-4" />
            Games
          </Link>

          <Link
            href="/shop"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[#FF9438] hover:bg-[#E8720C]/[0.06] transition-colors"
          >
            <Store className="h-4 w-4" />
            GIM Shop
          </Link>

          {/* Nav links */}
          {NAV_LINKS.filter((l) => l.href !== "/shop").map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[#FF9438] hover:bg-[#E8720C]/[0.06] transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/contact"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[#7289da] hover:bg-[#7289da]/[0.06] transition-colors"
          >
            <svg className="w-4 h-4 text-[#7289da]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            Support
          </Link>

          {mounted && !user && (
            <div className="pt-3 border-t border-[#E8720C]/15 flex gap-2">
              <Link href="/login" className="flex-1 text-center px-3 py-2 rounded-lg text-sm border border-[#E8720C]/20 text-[var(--text-secondary)] hover:text-[#FF9438] hover:bg-[#E8720C]/[0.06] transition-colors">
                Sign in
              </Link>
              <Link href="/register" className="flex-1 text-center px-3 py-2 rounded-md text-sm font-semibold bg-[var(--color-primary)] text-[#0E0B07] hover:bg-[#FF9438] transition-colors">
                Register
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
