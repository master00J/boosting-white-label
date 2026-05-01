"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasAccessToPath } from "@/lib/admin-sections";
import LoadingSpinner from "@/components/shared/loading-spinner";

/**
 * For admin users with a rank: redirects to /admin/dashboard if they try to access a section they don't have permission for.
 * Shows a loading state while checking permissions so the page is not a blank black screen.
 */
export default function AdminRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!pathname?.startsWith("/admin")) {
      setChecked(true);
      return;
    }
    let cancelled = false;
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setDenied(true);
        setChecked(true);
      }
    }, 8000);
    fetch("/api/admin/me/permissions")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { allowedSections: string[]; isSuperAdmin: boolean } | null) => {
        if (cancelled) return;
        clearTimeout(timeoutId);
        if (!data) {
          setDenied(true);
          setChecked(true);
          return;
        }
        const allowed = new Set(data.allowedSections);
        if (!hasAccessToPath(allowed, pathname, data.isSuperAdmin)) {
          setDenied(true);
          router.replace("/admin/dashboard");
          setChecked(true);
          return;
        }
        setDenied(false);
        setChecked(true);
      })
      .catch(() => {
        if (!cancelled) {
          clearTimeout(timeoutId);
          setDenied(true);
          setChecked(true);
        }
      });
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [pathname, router]);

  if (!checked) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  if (denied) {
    return (
      <div className="flex h-screen items-center justify-center bg-background px-4 text-center">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-white">Access unavailable</h1>
          <p className="mt-2 text-sm text-zinc-400">Admin permissions could not be verified for this section.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
