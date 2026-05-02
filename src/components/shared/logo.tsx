"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { useTheme, useSiteBranding } from "@/components/providers/theme-provider";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
}

export default function Logo({ className, size = "md", href = "/" }: LogoProps) {
  const theme = useTheme();
  const { siteName } = useSiteBranding();

  const sizeClasses = {
    sm: "h-6",
    md: "h-8",
    lg: "h-10",
  };

  const logoSrc = theme.logo_url?.trim();
  const content = logoSrc ? (
    <Image
      src={logoSrc}
      alt="Store logo"
      height={size === "sm" ? 24 : size === "md" ? 32 : 40}
      width={120}
      className={cn("object-contain", sizeClasses[size])}
    />
  ) : (
    <span className={cn(
      "font-bold tracking-tight text-[var(--text-primary)]",
      size === "sm" && "text-lg",
      size === "md" && "text-xl",
      size === "lg" && "text-2xl",
    )}>
      {theme.brand_name?.trim() || siteName.trim() || "BoostPlatform"}
    </span>
  );

  return (
    <Link href={href} className={cn("flex items-center", className)}>
      {content}
    </Link>
  );
}
