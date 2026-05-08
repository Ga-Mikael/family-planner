// Hook qui programme les notifications navigateur pour :
//   - les tâches du jour ayant une heure (dueTime)
//   - les rappels du jour (reminders)
// Nécessite que Notification.permission === "granted"
// Utilise registration.showNotification() si SW dispo (requis sur iOS PWA),
// sinon fallback sur new Notification().
// Re-programmées à chaque changement de tasks/reminders.

import { useEffect } from "react";
import type { Task, Reminder } from "../types";
import { todayIdx, toDateStr, isTaskDoneOn } from "../lib/utils";

async function fireNotif(title: string, body: string) {
  const opts: NotificationOptions = {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  };
  // Prefer SW path — required on iOS standalone PWA, works everywhere.
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg) {
        reg.showNotification(title, opts);
        return;
      }
    } catch { /* fall through */ }
  }
  // Fallback main-thread notification (desktop browsers, non-PWA tabs).
  try { new Notification(title, opts); } catch { /* permission likely denied */ }
}

export function useNotifications(tasks: Task[], reminders: Reminder[]) {
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const now       = new Date();
    const todayStr  = toDateStr(now);
    const todayDay  = todayIdx();
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    /** Programme une notification à une heure précise du jour courant */
    const schedule = (title: string, body: string, hour: number, minute: number) => {
      const fireAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
      const delay  = fireAt.getTime() - now.getTime();
      // Ne planifie que si l'heure est dans le futur (dans les prochaines 24h)
      if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
        timeouts.push(setTimeout(() => { void fireNotif(title, body); }, delay));
      }
    };

    // ── Tâches avec heure du jour ──────────────────────────────────────────
    tasks.forEach((t) => {
      if (!t.dueTime) return;
      if (isTaskDoneOn(t, todayStr)) return; // déjà validée aujourd'hui

      const isForToday =
        t.recurrence !== "once"
          ? t.day === todayDay
          : t.dueDate ? t.dueDate === todayStr : t.day === todayDay;

      if (!isForToday) return;

      const [h, m] = t.dueTime.split(":").map(Number);
      // Prévenez 5 minutes avant
      schedule(`⏰ Dans 5 min : ${t.name}`, `Prévue à ${t.dueTime}`, h, m - 5 < 0 ? 0 : m - 5);
      // Notif exacte à l'heure
      schedule(`⏰ ${t.name}`, `Tâche prévue à ${t.dueTime}`, h, m);
    });

    // ── Rappels du jour ────────────────────────────────────────────────────
    reminders.forEach((r) => {
      if (!r.time) return;

      const isForToday = r.date
        ? r.date === todayStr
        : r.day === todayDay;

      if (!isForToday) return;

      const [h, m] = r.time.split(":").map(Number);
      schedule(`${r.emoji} ${r.title}`, `Rappel à ${r.time}`, h, m);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [tasks, reminders]);
}
