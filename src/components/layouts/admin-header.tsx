"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell, LogOut, User, Settings, Command, Menu } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import UserAvatar from "@/components/shared/user-avatar";
import { adminNav } from "@/lib/config/navigation";
import { useUIStore } from "@/stores/ui-store";
import { useNotificationStore } from "@/stores/notification-store";

interface SearchResult {
  href: string;
  label: string;
  group: string;
}

function flattenNav(): SearchResult[] {
  const results: SearchResult[] = [];
  for (const item of adminNav) {
    if (item.href) {
      results.push({ href: item.href, label: item.label, group: "Navigation" });
    }
    if (item.children) {
      for (const child of item.children) {
        results.push({ href: child.href, label: child.label, group: item.label });
      }
    }
  }
  return results;
}

const ALL_RESULTS = flattenNav();

function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const filtered = query.trim()
    ? ALL_RESULTS.filter((r) =>
        r.label.toLowerCase().includes(query.toLowerCase()) ||
        r.group.toLowerCase().includes(query.toLowerCase())
      )
    : ALL_RESULTS.slice(0, 8);

  const handleSelect = (href: string) => {
    router.push(href);
    onClose();
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, actions..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            ESC
          </kbd>
        </div>
        <div className="max-h-72 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No results found
            </p>
          ) : (
            filtered.map((result, i) => (
              <button
                key={i}
                onClick={() => handleSelect(result.href)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors text-left"
              >
                <span className="flex-1 text-foreground">{result.label}</span>
                <span className="text-xs text-muted-foreground">
                  {result.group}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminHeader() {
  const { profile, signOut } = useAuth();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { setMobileSidebarOpen } = useUIStore();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();

  const openCmd = useCallback(() => setCmdOpen(true), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openCmd();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [openCmd]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <>
      <header className="h-14 md:h-16 flex items-center justify-between px-3 md:px-6 bg-card border-b border-border flex-shrink-0 gap-2">
        {/* Left: hamburger (mobile) + search */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors flex-shrink-0"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Search trigger */}
          <button
            onClick={openCmd}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors w-full max-w-xs"
          >
            <Search className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="flex-1 text-left truncate">Search...</span>
            <kbd className="hidden sm:flex items-center gap-0.5 text-xs bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen((v) => !v)}
              className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
              )}
            </button>
            {notificationsOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setNotificationsOpen(false)}
                  aria-hidden
                />
                <div className="absolute right-0 top-full mt-1 w-80 max-h-[min(24rem,70vh)] bg-card border border-border rounded-lg shadow-xl z-20 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
                    <span className="text-sm font-medium">Notifications</span>
                    {notifications.length > 0 && unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markAllAsRead()}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1 min-h-0 py-1">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6 px-3">
                        No notifications
                      </p>
                    ) : (
                      notifications.map((n) => {
                        const handleClick = () => {
                          if (!n.is_read) markAsRead(n.id);
                          setNotificationsOpen(false);
                          if (n.link) router.push(n.link);
                        };
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={handleClick}
                            className={`w-full text-left px-3 py-2.5 border-b border-border/50 last:border-0 hover:bg-white/5 ${!n.is_read ? "bg-primary/5" : ""}`}
                          >
                            <p className="text-sm font-medium leading-snug">{n.title}</p>
                            {n.message && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {n.message}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {n.created_at
                                ? new Date(n.created_at).toLocaleDateString("nl-NL", {
                                    day: "numeric",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </p>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <UserAvatar
                src={profile?.avatar_url}
                name={profile?.display_name ?? profile?.email}
                size={28}
              />
              <div className="text-left hidden md:block">
                <p className="text-sm font-medium leading-none">
                  {profile?.display_name ?? "Admin"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {profile?.role}
                </p>
              </div>
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-lg shadow-xl z-20 py-1 overflow-hidden">
                  <Link
                    href="/admin/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                    Settings
                  </Link>
                  <Link
                    href="/admin/settings/account"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 transition-colors"
                  >
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    Profile
                  </Link>
                  <div className="border-t border-border my-1" />
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {cmdOpen && <CommandPalette onClose={() => setCmdOpen(false)} />}
    </>
  );
}
