"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { SetupCoachPanel } from "@/components/admin/setup-coach-panel";
import { cn } from "@/lib/utils/cn";

export function AdminSetupCoach() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (pathname?.startsWith("/admin/setup-assistant")) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        size="lg"
        className={cn(
          "fixed bottom-6 right-6 z-[100] h-14 w-14 rounded-full shadow-lg p-0",
          "bg-gradient-to-br from-primary to-violet-600 hover:opacity-95 border-0",
        )}
        onClick={() => setOpen(true)}
        aria-label="Open setup-assistent"
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-end sm:items-center sm:justify-center sm:p-6 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label="Setup-assistent"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full sm:max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[var(--bg-elevated)]">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold text-sm">Setup-assistent</p>
                  <p className="text-[11px] text-muted-foreground">AI-hulp voor je admin — ook op /admin/setup-assistant</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setOpen(false)} aria-label="Sluiten">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <SetupCoachPanel variant="drawer" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
