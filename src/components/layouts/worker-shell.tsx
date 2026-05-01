"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Package,
  DollarSign, Gamepad2, Settings, LogOut, ChevronRight,
  Bell, Menu, X, Star,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import Logo from "@/components/shared/logo";
import { useAuth } from "@/components/providers/auth-provider";
import UserAvatar from "@/components/shared/user-avatar";

const NAV = [
  { href: "/booster/dashboard", label: "Overview", icon: LayoutDashboard },
  {
    label: "Orders",
    icon: Package,
    children: [
      { href: "/booster/orders", label: "Available" },
      { href: "/booster/orders/active", label: "Active" },
      { href: "/booster/orders/history", label: "History" },
    ],
  },
  { href: "/booster/earnings", label: "Earnings", icon: DollarSign },
  { href: "/booster/games", label: "My games", icon: Gamepad2 },
  { href: "/booster/settings", label: "Settings", icon: Settings },
];

type NavItem = {
  href?: string;
  label: string;
  icon: React.ElementType;
  children?: { href: string; label: string }[];
};

function NavGroup({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const isActive = item.href
    ? pathname === item.href || pathname.startsWith(item.href + "/")
    : item.children?.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"));
  const [open, setOpen] = useState(isActive ?? false);
  const Icon = item.icon;

  if (!item.children) {
    return (
      <Link
        href={item.href!}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span>{item.label}</span>
        {isActive && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
          isActive
            ? "text-primary"
            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5"
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span>{item.label}</span>
        <ChevronRight className={cn("h-3.5 w-3.5 ml-auto transition-transform", open && "rotate-90")} />
      </button>
      {open && (
        <div className="ml-7 mt-0.5 space-y-0.5">
          {item.children!.map((child) => {
            const childActive = pathname === child.href || pathname.startsWith(child.href + "/");
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "block px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                  childActive
                    ? "text-primary bg-primary/10"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function WorkerShell({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-[var(--border-default)]">
        <Logo size="sm" />
      </div>

      {/* Profile summary */}
      <div className="p-4 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-3">
          <UserAvatar src={profile?.avatar_url} name={profile?.display_name ?? profile?.email} size={36} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.display_name ?? "Booster"}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{profile?.email}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between px-2 py-1.5 rounded-lg bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-orange-400" />
            <span className="text-xs text-[var(--text-muted)]">Booster</span>
          </div>
          <span className="text-xs font-semibold text-orange-400">Worker</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map((item) => (
          <NavGroup key={item.href ?? item.label} item={item} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-[var(--border-default)] space-y-0.5">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 flex-shrink-0 bg-[var(--bg-card)] border-r border-[var(--border-default)]">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-60 bg-[var(--bg-card)] border-r border-[var(--border-default)] lg:hidden">
            {sidebar}
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-[var(--border-default)] bg-[var(--bg-card)] flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <button className="relative p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors">
              <Bell className="h-5 w-5" />
            </button>
            <UserAvatar src={profile?.avatar_url} name={profile?.display_name ?? profile?.email} size={32} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
