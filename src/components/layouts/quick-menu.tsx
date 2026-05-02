"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Gamepad2, Info, MessageCircle, ShoppingCart, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useCartStore } from "@/stores/cart-store";
import { useAuth } from "@/components/providers/auth-provider";

export default function QuickMenu() {
  const pathname = usePathname();
  const { user, profile } = useAuth();
  const cartCount = useCartStore((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));

  const dashboardHref = () => {
    if (!profile) return "/dashboard";
    if (profile.role === "admin" || profile.role === "super_admin") return "/admin/dashboard";
    if (profile.role === "worker") return "/booster/dashboard";
    return "/dashboard";
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const itemClass = (href: string) =>
    cn(
      "group flex items-center gap-2.5 rounded-xl px-2.5 py-2.5",
      "overflow-hidden transition-all duration-200 ease-out",
      "w-10 hover:w-36 border backdrop-blur-sm",
      isActive(href)
        ? "bg-[#E8720C]/15 border-[#E8720C]/50 text-[#FF9438]"
        : "bg-[#0E0B07]/80 border-[#E8720C]/15 text-[var(--text-muted)] hover:bg-[#E8720C]/10 hover:border-[#E8720C]/40 hover:text-[#FF9438]"
    );

  const labelClass = "text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75";

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col gap-2">
      <Link href="/" className={itemClass("/")}>
        <Home className="h-5 w-5 shrink-0" />
        <span className={labelClass}>Home</span>
      </Link>

      <Link href="/games" className={itemClass("/games")}>
        <Gamepad2 className="h-5 w-5 shrink-0" />
        <span className={labelClass}>Games</span>
      </Link>

      <Link href="/about" className={itemClass("/about")}>
        <Info className="h-5 w-5 shrink-0" />
        <span className={labelClass}>About</span>
      </Link>

      <Link href="/contact" className={itemClass("/contact")}>
        <MessageCircle className="h-5 w-5 shrink-0" />
        <span className={labelClass}>Contact</span>
      </Link>

      <Link href="/checkout" className={itemClass("/checkout")}>
        <div className="relative shrink-0">
          <ShoppingCart className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-[#E8720C] text-[#0E0B07] text-[9px] font-bold flex items-center justify-center leading-none">
              {cartCount > 9 ? "9+" : cartCount}
            </span>
          )}
        </div>
        <span className={labelClass}>
          Cart{cartCount > 0 ? ` (${cartCount})` : ""}
        </span>
      </Link>

      {user && (
        <Link href={dashboardHref()} className={itemClass(dashboardHref())}>
          <LayoutDashboard className="h-5 w-5 shrink-0" />
          <span className={labelClass}>Dashboard</span>
        </Link>
      )}
    </div>
  );
}
