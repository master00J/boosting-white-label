import {
  LayoutDashboard,
  ShoppingBag,
  Wallet,
  Users,
  Star,
  Settings,
  Gamepad2,
  TrendingUp,
  DollarSign,
  Megaphone,
  HeadphonesIcon,
  FileText,
  Activity,
  Key,
  Zap,
  Trophy,
  Link,
  BookOpen,
  Heart,
  Shield,
  MessageCircle,
  Sparkles,
} from "lucide-react";

export const customerNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "My Orders", icon: ShoppingBag },
  { href: "/favorites", label: "My Favorites", icon: Heart },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/loyalty", label: "Loyalty", icon: Star },
  { href: "/referrals", label: "Referrals", icon: Link },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const workerNav = [
  { href: "/booster/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/booster/orders", label: "Available Orders", icon: ShoppingBag },
  { href: "/booster/orders/active", label: "Active Orders", icon: Zap },
  { href: "/booster/earnings", label: "Earnings", icon: DollarSign },
  { href: "/booster/games", label: "My Games", icon: Gamepad2 },
  { href: "/booster/settings", label: "Settings", icon: Settings },
];

export type AdminNavItem = {
  href?: string;
  label: string;
  icon: React.ElementType;
  sectionKey?: string; // for rank-based filtering; "ranks" only for super_admin
  children?: { href: string; label: string }[];
};

export const adminNav: AdminNavItem[] = [
  { href: "/admin/dashboard", label: "Staff Overview", icon: LayoutDashboard, sectionKey: "dashboard" },
  {
    label: "Orders",
    icon: ShoppingBag,
    sectionKey: "orders",
    children: [{ href: "/admin/orders", label: "All Orders" }],
  },
  {
    label: "Catalog",
    icon: Gamepad2,
    sectionKey: "catalog",
    children: [{ href: "/admin/games", label: "Games" }],
  },
  {
    label: "Workers",
    icon: Users,
    sectionKey: "workers",
    children: [
      { href: "/admin/workers", label: "All Workers" },
      { href: "/admin/workers/applications", label: "Applications" },
      { href: "/admin/workers/tiers", label: "Tiers" },
    ],
  },
  {
    label: "Customers",
    icon: Users,
    sectionKey: "customers",
    children: [
      { href: "/admin/customers", label: "All Customers" },
      { href: "/admin/customers/new-signups", label: "New Signups" },
    ],
  },
  {
    label: "Finance",
    icon: DollarSign,
    sectionKey: "finance",
    children: [
      { href: "/admin/finance", label: "Overview" },
      { href: "/admin/finance/transactions", label: "Transactions" },
      { href: "/admin/finance/payouts", label: "Payouts" },
    ],
  },
  {
    label: "Marketing",
    icon: Megaphone,
    sectionKey: "marketing",
    children: [
      { href: "/admin/marketing/coupons", label: "Coupons" },
      { href: "/admin/marketing/affiliates", label: "Affiliates" },
      { href: "/admin/marketing/referrals", label: "Referrals" },
      { href: "/admin/marketing/loyalty", label: "Loyalty" },
      { href: "/admin/marketing/lootboxes", label: "Lootboxes" },
      { href: "/admin/marketing/lootboxes/deliveries", label: "Item Deliveries" },
    ],
  },
  {
    label: "Helpdesk",
    icon: HeadphonesIcon,
    sectionKey: "helpdesk",
    children: [
      { href: "/admin/helpdesk", label: "Tickets" },
      { href: "/admin/helpdesk/settings", label: "AI & Settings" },
    ],
  },
  {
    label: "Content",
    icon: FileText,
    sectionKey: "content",
    children: [
      { href: "/admin/content/pages", label: "Pages" },
      { href: "/admin/content/banners", label: "Banners" },
      { href: "/admin/content/announcements", label: "Announcements" },
    ],
  },
  {
    label: "Storefront",
    icon: TrendingUp,
    sectionKey: "storefront",
    children: [
      { href: "/admin/storefront/hero", label: "Hero banners" },
      { href: "/admin/storefront/theme", label: "Theme" },
    ],
  },
  { href: "/admin/discord", label: "Discord", icon: Trophy, sectionKey: "discord" },
  { href: "/admin/activity", label: "Activity Log", icon: Activity, sectionKey: "activity" },
  {
    label: "Settings",
    icon: Settings,
    sectionKey: "settings",
    children: [
      { href: "/admin/settings", label: "General" },
      { href: "/admin/settings/admin-users", label: "Admin Access" },
      { href: "/admin/settings/payments", label: "Payments" },
      { href: "/admin/settings/currency", label: "Currency & Gold" },
      { href: "/admin/settings/api-keys", label: "API Keys" },
      { href: "/admin/settings/notifications", label: "Notifications" },
      { href: "/admin/settings/security", label: "Security" },
      { href: "/admin/settings/email", label: "Email" },
      { href: "/admin/settings/integrations", label: "Integrations" },
      { href: "/admin/settings/chat-agents", label: "Chat Agents" },
    ],
  },
  { href: "/admin/import", label: "Import", icon: Key, sectionKey: "import" },
  { href: "/admin/guide", label: "Admin Guide", icon: BookOpen, sectionKey: "guide" },
  { href: "/admin/setup-assistant", label: "Setup-assistent", icon: Sparkles, sectionKey: "guide" },
  { href: "/admin/chat", label: "Live Chat", icon: MessageCircle, sectionKey: "chat" },
  { href: "/admin/ranks", label: "Ranks", icon: Shield, sectionKey: "ranks" },
];
