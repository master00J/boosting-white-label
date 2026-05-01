"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

type PermissionState = "default" | "granted" | "denied" | "unsupported" | "loading";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) view[i] = rawData.charCodeAt(i);
  return view;
}

export default function PushSubscribe() {
  const [status, setStatus] = useState<PermissionState>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission as PermissionState);
  }, []);

  const subscribe = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) return;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const json = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });

      setStatus("granted");
    } catch (err) {
      console.warn("Push subscribe failed:", err);
    } finally {
      setBusy(false);
    }
  };

  const unsubscribe = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("default");
    } catch (err) {
      console.warn("Push unsubscribe failed:", err);
    } finally {
      setBusy(false);
    }
  };

  if (status === "loading" || status === "unsupported") return null;

  if (status === "granted") {
    return (
      <button
        onClick={unsubscribe}
        disabled={busy}
        title="Notifications enabled — click to disable"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-green-400 hover:text-zinc-400 hover:bg-white/5 border border-green-400/20 transition-colors disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Bell className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">Notifications on</span>
      </button>
    );
  }

  if (status === "denied") {
    return (
      <span
        title="Notifications blocked — allow in browser settings"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-500 border border-zinc-700/30"
      >
        <BellOff className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Blocked</span>
      </span>
    );
  }

  return (
    <button
      onClick={subscribe}
      disabled={busy}
      title="Enable push notifications for new chats"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/5 border border-border transition-colors disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Bell className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">Enable notifications</span>
    </button>
  );
}
