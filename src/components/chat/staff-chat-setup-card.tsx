"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, CheckCircle2, ExternalLink, Loader2, Smartphone, Wifi } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type PushStatus = "loading" | "unsupported" | "default" | "granted" | "denied" | "busy";

type PushDiagnostics = {
  subscriptions_count: number;
  vapid_configured: boolean;
  db_error: string | null;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) view[i] = rawData.charCodeAt(i);
  return view;
}

function getStandaloneMode() {
  if (typeof window === "undefined") return false;
  const standaloneMedia = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  return standaloneMedia || iosStandalone;
}

export default function StaffChatSetupCard() {
  const [pushStatus, setPushStatus] = useState<PushStatus>("loading");
  const [isStandalone, setIsStandalone] = useState(false);
  const [diagnostics, setDiagnostics] = useState<PushDiagnostics | null>(null);
  const [testStatus, setTestStatus] = useState<"idle" | "busy" | "sent" | "error">("idle");
  const [testError, setTestError] = useState("");

  const refreshDiagnostics = useCallback(async () => {
    const res = await fetch("/api/push/test");
    if (!res.ok) return;
    const data = await res.json() as PushDiagnostics;
    setDiagnostics(data);
  }, []);

  useEffect(() => {
    setIsStandalone(getStandaloneMode());
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushStatus("unsupported");
      return;
    }
    setPushStatus(Notification.permission as PushStatus);
    void refreshDiagnostics();
  }, [refreshDiagnostics]);

  const subscribe = async () => {
    if (pushStatus === "busy") return;
    setPushStatus("busy");
    setTestError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus(permission as PushStatus);
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setPushStatus("default");
        setTestError("Push is not configured. Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY.");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      const data = await res.json().catch(() => null) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Failed to save push subscription.");

      setPushStatus("granted");
      await refreshDiagnostics();
    } catch (err) {
      setPushStatus(Notification.permission as PushStatus);
      setTestError(err instanceof Error ? err.message : "Failed to enable notifications.");
    }
  };

  const sendTest = async () => {
    setTestStatus("busy");
    setTestError("");
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json().catch(() => null) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error ?? "Failed to send test notification.");
      setTestStatus("sent");
      await refreshDiagnostics();
      window.setTimeout(() => setTestStatus("idle"), 3500);
    } catch (err) {
      setTestStatus("error");
      setTestError(err instanceof Error ? err.message : "Failed to send test notification.");
    }
  };

  const pushReady = pushStatus === "granted" && (diagnostics?.subscriptions_count ?? 0) > 0;
  const vapidReady = diagnostics?.vapid_configured ?? true;

  return (
    <div className="mx-3 my-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-xs">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <Smartphone className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-white">Staff chat app</p>
            <span className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
              pushReady ? "border-green-500/30 bg-green-500/10 text-green-400" : "border-amber-500/30 bg-amber-500/10 text-amber-300"
            )}>
              {pushReady ? "Ready" : "Setup needed"}
            </span>
          </div>
          <p className="mt-1 text-zinc-400">
            Install this page as an app and enable push so staff never miss live chat messages.
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2">
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/15 px-3 py-2">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <ExternalLink className="h-3.5 w-3.5" />
            Installed as app
          </span>
          <span className={isStandalone ? "text-green-400" : "text-amber-300"}>
            {isStandalone ? "Yes" : "Add to Home Screen"}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/15 px-3 py-2">
          <span className="flex items-center gap-1.5 text-zinc-300">
            {pushStatus === "granted" ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
            Notifications
          </span>
          <span className={pushReady ? "text-green-400" : pushStatus === "denied" ? "text-red-400" : "text-amber-300"}>
            {pushStatus === "unsupported" ? "Unsupported" : pushStatus === "denied" ? "Blocked" : pushReady ? "Enabled" : "Disabled"}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/15 px-3 py-2">
          <span className="flex items-center gap-1.5 text-zinc-300">
            <Wifi className="h-3.5 w-3.5" />
            Push config
          </span>
          <span className={vapidReady ? "text-green-400" : "text-red-400"}>
            {vapidReady ? "Configured" : "Missing VAPID"}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {pushStatus !== "granted" && pushStatus !== "unsupported" && pushStatus !== "denied" && (
          <button
            type="button"
            onClick={subscribe}
            disabled={pushStatus === "busy"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {pushStatus === "busy" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
            Enable notifications
          </button>
        )}
        <button
          type="button"
          onClick={sendTest}
          disabled={!pushReady || testStatus === "busy"}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-200 hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {testStatus === "busy" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Send test
        </button>
      </div>

      <div className="mt-3 rounded-xl bg-black/15 px-3 py-2 text-[11px] text-zinc-400">
        <p>iPhone: open in Safari, Share, Add to Home Screen, then allow notifications in the app.</p>
        <p className="mt-1">Android: Chrome menu, Install app/Add to Home screen, then allow notifications.</p>
      </div>

      {testStatus === "sent" && (
        <p className="mt-2 text-[11px] text-green-400">Test notification sent to this staff account.</p>
      )}
      {(testError || diagnostics?.db_error) && (
        <p className="mt-2 text-[11px] text-red-400">{testError || diagnostics?.db_error}</p>
      )}
    </div>
  );
}
