// Supabase Edge Function — notify-cron
// Schedule: every 5 minutes via pg_cron (see README).
// Reads upcoming task/reminder occurrences in the next ~6 minutes and pushes
// Web Push notifications to all registered devices. Idempotent via push_log.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// ─── Env ──────────────────────────────────────────────────────────────────
const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC  = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

const supa = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Date helpers ─────────────────────────────────────────────────────────
// We assume Europe/Paris timezone for "today" / dueTime semantics. Edit if needed.
const TZ = "Europe/Paris";

const fmtParts = (d: Date) => {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false, weekday: "short",
  }).formatToParts(d);
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? "";
  // Mon=0 ... Sun=6  (matches DayIndex in app)
  const wmap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return {
    dateStr: `${get("year")}-${get("month")}-${get("day")}`,
    hour:    parseInt(get("hour"), 10),
    minute:  parseInt(get("minute"), 10),
    day:     wmap[get("weekday").slice(0, 3)] ?? 0,
  };
};

// Returns minutes since midnight in Paris timezone.
const minutesOf = (h: number, m: number) => h * 60 + m;

// ─── Types (mirror DB columns; not Task from app) ─────────────────────────
type DbTask = {
  id: string; user_id: string; name: string; day: number;
  done: boolean; recurrence: string;
  due_time: string | null; due_date: string | null;
  done_dates: string | null;
};
type DbReminder = {
  id: string; user_id: string; title: string; emoji: string;
  day: number; time: string | null; date: string | null;
};
type Subscription = {
  endpoint: string; p256dh: string; auth: string; user_id: string;
};

// ─── Core ─────────────────────────────────────────────────────────────────
async function run() {
  const now = new Date();
  const { dateStr, hour, minute, day } = fmtParts(now);
  const nowMin = minutesOf(hour, minute);

  // Window: this run and the next 5 minutes (cron fires every 5 min).
  // Task variants: 'pre5' (5 min before dueTime) and 'exact' (at dueTime).
  // We fire pre5 in [nowMin, nowMin+5); exact in [nowMin, nowMin+5).
  const windowEnd = nowMin + 5;

  // Pull tasks + reminders + subscriptions in parallel.
  const [tasksR, remindersR, subsR] = await Promise.all([
    supa.from("tasks").select("*").not("due_time", "is", null),
    supa.from("reminders").select("*").not("time", "is", null),
    supa.from("push_subscriptions").select("user_id, endpoint, p256dh, auth"),
  ]);
  if (tasksR.error)     throw tasksR.error;
  if (remindersR.error) throw remindersR.error;
  if (subsR.error)      throw subsR.error;

  const tasks    = (tasksR.data    as DbTask[])     ?? [];
  const reminders= (remindersR.data as DbReminder[]) ?? [];
  const subs     = (subsR.data     as Subscription[]) ?? [];

  if (subs.length === 0) {
    return new Response(JSON.stringify({ ok: true, reason: "no subscriptions" }), { status: 200 });
  }

  // Group subs by user_id for targeting (currently family shares one user, but ready for multi).
  const subsByUser = new Map<string, Subscription[]>();
  for (const s of subs) {
    const arr = subsByUser.get(s.user_id) ?? [];
    arr.push(s);
    subsByUser.set(s.user_id, arr);
  }

  type Pending = {
    user_id: string;
    source: "task" | "reminder";
    source_id: string;
    variant: "exact" | "pre5";
    fire_at: string; // ISO
    title: string;
    body: string;
  };
  const pending: Pending[] = [];

  // ─ Tasks ─
  for (const t of tasks) {
    if (!t.due_time) continue;
    const [th, tm] = t.due_time.split(":").map(Number);
    if (Number.isNaN(th) || Number.isNaN(tm)) continue;
    const taskMin = minutesOf(th, tm);

    // Is this task scheduled today?
    const isToday =
      t.recurrence !== "once"
        ? t.day === day
        : t.due_date
          ? t.due_date === dateStr
          : t.day === day;
    if (!isToday) continue;

    // Done check
    if (t.recurrence === "once") {
      if (t.done) continue;
    } else {
      const dd = t.done_dates ? JSON.parse(t.done_dates) as string[] : [];
      if (dd.includes(dateStr)) continue;
    }

    // pre5 variant: fire 5 min before due_time
    const pre5Min = taskMin - 5;
    if (pre5Min >= nowMin && pre5Min < windowEnd) {
      pending.push({
        user_id: t.user_id, source: "task", source_id: t.id, variant: "pre5",
        fire_at: now.toISOString(),
        title: `⏰ Dans 5 min : ${t.name}`,
        body:  `Prévue à ${t.due_time}`,
      });
    }
    // exact variant
    if (taskMin >= nowMin && taskMin < windowEnd) {
      pending.push({
        user_id: t.user_id, source: "task", source_id: t.id, variant: "exact",
        fire_at: now.toISOString(),
        title: `⏰ ${t.name}`,
        body:  `Tâche prévue à ${t.due_time}`,
      });
    }
  }

  // ─ Reminders ─
  for (const r of reminders) {
    if (!r.time) continue;
    const [rh, rm] = r.time.split(":").map(Number);
    if (Number.isNaN(rh) || Number.isNaN(rm)) continue;
    const remMin = minutesOf(rh, rm);

    const isToday = r.date ? r.date === dateStr : r.day === day;
    if (!isToday) continue;

    if (remMin >= nowMin && remMin < windowEnd) {
      pending.push({
        user_id: r.user_id, source: "reminder", source_id: r.id, variant: "exact",
        fire_at: now.toISOString(),
        title: `${r.emoji ?? "🔔"} ${r.title}`,
        body:  `Rappel à ${r.time}`,
      });
    }
  }

  if (pending.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, scanned: { tasks: tasks.length, reminders: reminders.length } }), { status: 200 });
  }

  // Idempotency check: skip rows already in push_log.
  const filtered: Pending[] = [];
  for (const p of pending) {
    // Round fire_at to minute precision for log dedupe.
    const minuteISO = new Date(Math.floor(now.getTime() / 60000) * 60000).toISOString();
    const { data, error } = await supa.from("push_log").select("id").match({
      user_id: p.user_id, source: p.source, source_id: p.source_id,
      fire_at: minuteISO, variant: p.variant,
    });
    if (error) { console.error("log check", error); continue; }
    if (!data || data.length === 0) {
      filtered.push({ ...p, fire_at: minuteISO });
    }
  }

  if (filtered.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, dedup: pending.length }), { status: 200 });
  }

  // Send pushes. Each pending → all subscriptions for that user_id.
  let sent = 0;
  let failed = 0;
  const goneEndpoints: string[] = [];

  for (const p of filtered) {
    const targets = subsByUser.get(p.user_id) ?? [];
    for (const sub of targets) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ title: p.title, body: p.body, tag: `${p.source}-${p.source_id}-${p.variant}`, url: "/" }),
        );
        sent++;
      } catch (err) {
        // 404/410 → subscription expired, remove
        // deno-lint-ignore no-explicit-any
        const status = (err as any)?.statusCode;
        if (status === 404 || status === 410) {
          goneEndpoints.push(sub.endpoint);
        } else {
          console.error("push error", status, err);
        }
        failed++;
      }
    }
    // Log to prevent re-fire next run.
    await supa.from("push_log").insert({
      user_id: p.user_id, source: p.source, source_id: p.source_id,
      fire_at: p.fire_at, variant: p.variant,
    });
  }

  // Cleanup expired endpoints.
  if (goneEndpoints.length > 0) {
    await supa.from("push_subscriptions").delete().in("endpoint", goneEndpoints);
  }

  // Old log rows (>7d) cleanup
  const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await supa.from("push_log").delete().lt("fire_at", cutoff);

  return new Response(JSON.stringify({ ok: true, sent, failed, planned: filtered.length, removed: goneEndpoints.length }), { status: 200 });
}

Deno.serve(async () => {
  try {
    return await run();
  } catch (err) {
    console.error("run failed", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }
});
