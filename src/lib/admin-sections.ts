/**
 * Admin dashboard section keys. Used for rank-based access: each rank has a set of allowed section_key values.
 * Super-admins always have access to all sections (and to "ranks" which is only for them).
 */
export const ADMIN_SECTION_KEYS = [
  "dashboard",
  "orders",
  "catalog",
  "workers",
  "customers",
  "finance",
  "marketing",
  "helpdesk",
  "content",
  "storefront",
  "discord",
  "activity",
  "settings",
  "import",
  "guide",
  "chat", // Live chat support
  "ranks", // Only super_admin; for managing ranks
] as const;

export type AdminSectionKey = (typeof ADMIN_SECTION_KEYS)[number];

/** Human-readable labels for section keys (for rank permission UI). */
export const ADMIN_SECTION_LABELS: Record<string, string> = {
  dashboard: "Staff Overview",
  orders: "Orders",
  catalog: "Catalog",
  workers: "Workers",
  customers: "Customers",
  finance: "Finance",
  marketing: "Marketing",
  helpdesk: "Helpdesk",
  content: "Content",
  storefront: "Storefront",
  discord: "Discord",
  activity: "Activity Log",
  settings: "Settings",
  import: "Import",
  guide: "Admin Guide",
  chat: "Live Chat",
  ranks: "Ranks (super-admin only)",
};

/** Map admin pathname prefix to section key. First match wins. */
const PATH_TO_SECTION: { prefix: string; section: AdminSectionKey }[] = [
  { prefix: "/admin/dashboard", section: "dashboard" },
  { prefix: "/admin/orders", section: "orders" },
  { prefix: "/admin/games", section: "catalog" },
  { prefix: "/admin/workers", section: "workers" },
  { prefix: "/admin/customers", section: "customers" },
  { prefix: "/admin/finance", section: "finance" },
  { prefix: "/admin/marketing", section: "marketing" },
  { prefix: "/admin/helpdesk", section: "helpdesk" },
  { prefix: "/admin/content", section: "content" },
  { prefix: "/admin/storefront", section: "storefront" },
  { prefix: "/admin/discord", section: "discord" },
  { prefix: "/admin/activity", section: "activity" },
  { prefix: "/admin/settings", section: "settings" },
  { prefix: "/admin/import", section: "import" },
  { prefix: "/admin/guide", section: "guide" },
  { prefix: "/admin/chat", section: "chat" },
  { prefix: "/admin/ranks", section: "ranks" },
];

export function pathnameToSectionKey(pathname: string): AdminSectionKey | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  for (const { prefix, section } of PATH_TO_SECTION) {
    if (normalized === prefix || normalized.startsWith(prefix + "/")) return section;
  }
  return null;
}

export function hasAccessToPath(allowedSections: Set<string>, pathname: string, isSuperAdmin: boolean): boolean {
  if (isSuperAdmin) return true;
  const section = pathnameToSectionKey(pathname);
  if (section === null) return false;
  if (section === "ranks") return false; // only super_admin
  return allowedSections.has(section);
}
