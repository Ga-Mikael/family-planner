// Conversion entre le format de la base de données (snake_case) et le format
// de l'application (camelCase). Ces fonctions sont les seuls endroits où l'on
// touche aux noms de colonnes Supabase.

import type { Task, Member, Grocery, Reminder, Room, IconName } from "../types";
import { newId } from "./utils";

/** JSON.parse défensif — une valeur corrompue en base ne doit pas blanchir l'app. */
function safeParseDates(raw: unknown): string[] | undefined {
  if (typeof raw !== "string" || !raw) return undefined;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : undefined;
  } catch {
    console.warn("done_dates illisible, ignoré:", raw);
    return undefined;
  }
}

// ─── DB → App ──────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toTask = (r: any): Task => ({
  id:         r.id,
  name:       r.name,
  memberId:   r.member_id,
  roomId:     r.room_id,
  day:        r.day,
  priority:   r.priority,
  recurrence: r.recurrence,
  done:       r.done,
  note:       r.note       ?? undefined,
  dueTime:    r.due_time   ?? undefined,
  dueDate:    r.due_date   ?? undefined,
  doneDates:  safeParseDates(r.done_dates),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toMember = (r: any): Member => ({
  id:         r.id,
  name:       r.name,
  emoji:      r.emoji,
  color:      r.color,
  avatarBg:   r.avatar_bg,
  isChild:    r.is_child,
  workDays:   r.work_days  ?? [],
  workHours:  r.work_hours ?? {},
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toGrocery = (r: any): Grocery => ({
  id:       r.id,
  name:     r.name,
  qty:      r.qty,
  done:     r.done,
  category: r.category ?? undefined,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toReminder = (r: any): Reminder => ({
  id:    r.id,
  title: r.title,
  time:  r.time,
  day:   r.day,
  emoji: r.emoji,
  date:  r.date ?? undefined,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toRoom = (r: any): Room => ({
  id:    r.id,
  name:  r.name,
  icon:  r.icon as IconName,
  color: r.color,
});

// ─── App → DB ──────────────────────────────────────────────────────────────
export const fromTask = (t: Task, uid: string) => ({
  id:         t.id,
  name:       t.name,
  member_id:  t.memberId,
  room_id:    t.roomId,
  day:        t.day,
  priority:   t.priority,
  recurrence: t.recurrence,
  done:       t.done,
  note:       t.note    ?? null,
  due_time:   t.dueTime ?? null,
  // Colonnes optionnelles : incluses seulement si la valeur existe
  // (évite les erreurs si la colonne n'est pas encore créée en base)
  ...(t.dueDate                ? { due_date:   t.dueDate                    } : {}),
  ...(t.doneDates?.length      ? { done_dates: JSON.stringify(t.doneDates)  } : {}),
  user_id:    uid,
});

export const fromMember = (m: Member, uid: string, order: number) => ({
  id:         m.id,
  name:       m.name,
  emoji:      m.emoji,
  color:      m.color,
  avatar_bg:  m.avatarBg,
  is_child:   m.isChild ?? false,
  work_days:  m.workDays,
  work_hours: m.workHours,
  sort_order: order,
  user_id:    uid,
});

export const fromGrocery = (g: Omit<Grocery, "id">, uid: string) => ({
  id:      newId("g"),
  name:    g.name,
  qty:     g.qty,
  done:    g.done,
  ...(g.category ? { category: g.category } : {}),
  user_id: uid,
});

export const fromReminder = (
  r: Omit<Reminder, "id">,
  uid: string,
) => ({
  id:      newId("r"),
  title:   r.title,
  time:    r.time,
  day:     r.day,
  emoji:   r.emoji,
  ...(r.date ? { date: r.date } : {}),
  user_id: uid,
});

export const fromRoom = (r: Room, uid: string, order: number) => ({
  id:         r.id,
  name:       r.name,
  icon:       r.icon,
  color:      r.color,
  sort_order: order,
  user_id:    uid,
});
