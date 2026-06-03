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
    if (!userId) throw new Error("Non connecté");
    if (!("serviceWorker" in navigator)) throw new Error("Service Worker non supporté");
    if (!("PushManager" in window)) throw new Error("Push non supporté par ce navigateur");
    if (!VAPID_PUBLIC_KEY) throw new Error("Clé VAPID publique absente (VITE_VAPID_PUBLIC_KEY non configurée sur Netlify ?)");

    // 1. Permission
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      setState(perm === "denied" ? "denied" : "default");
      throw new Error(perm === "denied" ? "Permission refusée (Réglages iPhone → Notre Foyer)" : "Permission non accordée");
    }

    // 2. Subscribe via SW
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const key = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // Cast to satisfy strict ArrayBufferView<ArrayBuffer> typing
          applicationServerKey: key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
        });
      } catch (e) {
        // Common cause: VAPID key mismatch with an existing subscription, or
        // the PWA isn't installed (iOS requires standalone for push).
        const m = e instanceof Error ? e.message : String(e);
        throw new Error(`pushManager.subscribe a échoué — ${m}. (Sur iPhone : l'app doit être installée via 'Sur l'écran d'accueil')`);
      }
    }

    // 3. Persist to Supabase
    const json = sub.toJSON();
    const p256dh = json.keys?.p256dh;
    const auth   = json.keys?.auth;
    if (!p256dh || !auth) throw new Error("Clés de souscription manquantes");

    const { error } = await supabase.from("push_subscriptions").upsert({
      user_id:      userId,
      endpoint:     sub.endpoint,
      p256dh,
      auth,
      device_label: deviceLabel(),
      user_agent:   navigator.userAgent.slice(0, 240),
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });
    // Supabase returns a PostgrestError object (not an Error) — re-wrap so
    // callers get a readable message instead of "[object Object]".
    if (error) throw new Error(`Enregistrement Supabase échoué — ${error.message}${error.hint ? ` (${error.hint})` : ""}`);

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
