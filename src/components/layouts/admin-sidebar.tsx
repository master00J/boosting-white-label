"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { adminNav, type AdminNavItem } from "@/lib/config/navigation";
import Logo from "@/components/shared/logo";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";

function NavGroup({
  item,
  collapsed,
  onNavigate,
}: {
  item: AdminNavItem;
  collapsed: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const isActive = item.href
    ? pathname === item.href || pathname.startsWith(item.href + "/")
    : item.children?.some(
        (c) => pathname === c.href || pathname.startsWith(c.href + "/")
      );

  const [open, setOpen] = useState(isActive ?? false);
  const Icon = item.icon;

  if (!item.children) {
    return (
      <Link
        href={item.href!}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          isActive
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left">{item.label}</span>
            {open ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </>
        )}
      </button>
      {open && !collapsed && (
        <div className="ml-7 mt-1 space-y-0.5 border-l border-border pl-3">
          {item.children.map((child) => {
            const childActive =
              pathname === child.href || pathname.startsWith(child.href + "/");
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={cn(
                  "block px-2 py-1.5 rounded-md text-sm transition-colors",
                  childActive
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground"
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

function SidebarContent({
  collapsed,
  onNavigate,
  onClose,
  showCloseButton,
  allowedSections,
  isSuperAdmin,
}: {
  collapsed: boolean;
  onNavigate: () => void;
  onClose?: () => void;
  showCloseButton?: boolean;
  allowedSections: Set<string> | null;
  isSuperAdmin: boolean;
}) {
  const filteredNav =
    allowedSections === null
      ? adminNav
      : adminNav.filter((item) => {
          const key = item.sectionKey;
          if (!key) return true;
          if (key === "ranks") return isSuperAdmin;
          return allowedSections.has(key);
        });

  return (
    <div className="flex flex-col h-full">
      {/* Logo row */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border flex-shrink-0">
        {!collapsed && <Logo size="sm" href="/admin/dashboard" />}
        {showCloseButton ? (
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors ml-auto"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors ml-auto"
            aria-label="Toggle sidebar"
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                !collapsed && "rotate-180"
              )}
            />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {filteredNav.map((item, i) => (
          <NavGroup
            key={item.sectionKey ?? item.href ?? i}
            item={item}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Admin Panel v2.0
          </p>
        </div>
      )}
    </div>
  );
}

export default function AdminSidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
  const [permissions, setPermissions] = useState<{ allowedSections: string[]; isSuperAdmin: boolean } | null>(null);

  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/me/permissions")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setPermissions(data);
        else if (!cancelled) setPermissions({ allowedSections: [], isSuperAdmin: false });
      })
      .catch(() => {
        if (!cancelled) setPermissions({ allowedSections: [], isSuperAdmin: false });
      });
    return () => { cancelled = true; };
  }, []);

  const allowedSet = permissions
    ? new Set(permissions.allowedSections)
    : null;
  const isSuperAdmin = permissions?.isSuperAdmin ?? false;

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname, setMobileSidebarOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setMobileSidebarOpen]);

  return (
    <>
      <aside
        className={cn(
          "hidden md:flex flex-col h-full bg-card border-r border-border transition-all duration-200 flex-shrink-0",
          sidebarCollapsed ? "w-16" : "w-60"
        )}
      >
        <SidebarContent
          collapsed={sidebarCollapsed}
          onNavigate={() => {}}
          onClose={() => setSidebarCollapsed(!sidebarCollapsed)}
          showCloseButton={false}
          allowedSections={allowedSet}
          isSuperAdmin={isSuperAdmin}
        />
      </aside>

      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-card border-r border-border transition-transform duration-300 md:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent
          collapsed={false}
          onNavigate={() => setMobileSidebarOpen(false)}
          onClose={() => setMobileSidebarOpen(false)}
          showCloseButton={true}
          allowedSections={allowedSet}
          isSuperAdmin={isSuperAdmin}
        />
      </aside>
    </>
  );
}
