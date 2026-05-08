// Subscribes the current device to Web Push and stores the subscription in
// Supabase. Idempotent — same endpoint is upserted on each call.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

type State = "loading" | "unsupported" | "denied" | "default" | "subscribed";

function urlBase64ToUint8Array(b64: string): Uint8Array {
  const padding = "=".repeat((4 - b64.length % 4) % 4);
  const base64  = (b64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function deviceLabel(): string {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua))   return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac/i.test(ua))    return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  return "Web";
}

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export function usePushSubscription() {
  const [state, setState] = useState<State>("loading");

  const refresh = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID_PUBLIC_KEY) {
      setState("unsupported");
      return;
    }
    if (typeof Notification === "undefined") { setState("unsupported"); return; }
    if (Notification.permission === "denied") { setState("denied"); return; }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) setState("subscribed");
      else setState(Notification.permission === "granted" ? "default" : "default");
    } catch {
      setState("default");
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  /** Subscribes (asks permission if needed) and persists to Supabase. */
  const subscribe = useCallback(async () => {
    const userId = await currentUserId();
    if (!userId) throw new Error("Not signed in");
    if (!VAPID_PUBLIC_KEY) throw new Error("VAPID public key missing in env");

    // 1. Permission
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setState(perm === "denied" ? "denied" : "default");
      return;
    }

    // 2. Subscribe via SW
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // Cast to satisfy strict ArrayBufferView<ArrayBuffer> typing
        applicationServerKey: key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
      });
    }

    // 3. Persist to Supabase
    const json = sub.toJSON();
    const p256dh = json.keys?.p256dh;
    const auth   = json.keys?.auth;
    if (!p256dh || !auth) throw new Error("Subscription keys missing");

    const { error } = await supabase.from("push_subscriptions").upsert({
      user_id:      userId,
      endpoint:     sub.endpoint,
      p256dh,
      auth,
      device_label: deviceLabel(),
      user_agent:   navigator.userAgent.slice(0, 240),
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });
    if (error) throw error;

    setState("subscribed");
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    setState("default");
  }, []);

  return { state, subscribe, unsubscribe, refresh };
}
