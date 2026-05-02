import type { DayIndex, Member, Vacation } from "../types";
import { PASTEL, VACANCES } from "./constants";

// ─── Jours ─────────────────────────────────────────────────────────────────

/** Retourne le jour de la semaine actuel en DayIndex (Lundi = 0, Dimanche = 6) */
export const todayIdx = (): DayIndex => {
  const d = new Date().getDay();
  return (d === 0 ? 6 : d - 1) as DayIndex;
};

/** Vrai si le jour est samedi (5) ou dimanche (6) */
export const isWeekend = (d: DayIndex): boolean => d === 5 || d === 6;

// ─── Couleurs ──────────────────────────────────────────────────────────────

/** Génère un index de couleur pastel déterministe à partir d'une chaîne */
export function getColorIdx(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % PASTEL.length;
  return Math.abs(h) % PASTEL.length;
}

// ─── Membres multiples ─────────────────────────────────────────────────────

/** Découpe un champ memberId CSV en tableau d'IDs */
export const parseMemberIds = (s: string): string[] =>
  s ? s.split(",").filter(Boolean) : [];

// ─── Horaires de travail ───────────────────────────────────────────────────

/** Vrai si l'heure donnée se trouve dans les heures de travail du membre ce jour-là */
export function isInWorkHours(m: Member, day: DayIndex, time: string): boolean {
  if (!time || !m.workHours[day]) return false;
  const wh = m.workHours[day]!;
  const mins = (t: string) => {
    const [h, mm] = t.split(":").map(Number);
    return h * 60 + mm;
  };
  return mins(time) >= mins(wh.start) && mins(time) < mins(wh.end);
}

/**
 * Retourne un message d'avertissement si l'heure choisie est pendant les heures
 * de travail/école d'un des membres sélectionnés (IDs séparés par virgule).
 */
export function getWorkConflict(
  memberId: string,
  day: DayIndex,
  time: string,
  members: Member[],
): string | null {
  if (!memberId || !time) return null;
  for (const id of memberId.split(",").filter(Boolean)) {
    const m = members.find((x) => x.id === id);
    if (!m || !isInWorkHours(m, day, time)) continue;
    const wh = m.workHours[day]!;
    return `${m.name} ${m.isChild ? "est à l'école" : "travaille"} de ${wh.start} à ${wh.end} ce jour-là`;
  }
  return null;
}

// ─── Calendrier français ───────────────────────────────────────────────────

function easterDate(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(year, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1);
}

export const dateKey = (d: Date): string =>
  `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Retourne une Map<dateKey, nomFérié> pour une année donnée */
export function getFrenchHolidays(year: number): Map<string, string> {
  const h = new Map<string, string>();
  const add = (month: number, day: number, name: string) =>
    h.set(dateKey(new Date(year, month - 1, day)), name);

  add(1, 1,   "Jour de l'An");
  add(5, 1,   "Fête du Travail");
  add(5, 8,   "Victoire 1945");
  add(7, 14,  "Fête Nationale");
  add(8, 15,  "Assomption");
  add(11, 1,  "Toussaint");
  add(11, 11, "Armistice");
  add(12, 25, "Noël");

  const easter = easterDate(year);
  const addDays = (date: Date, n: number) => new Date(date.getTime() + n * 864e5);
  h.set(dateKey(addDays(easter, 1)),  "Lundi de Pâques");
  h.set(dateKey(addDays(easter, 39)), "Ascension");
  h.set(dateKey(addDays(easter, 50)), "Lundi de Pentecôte");

  return h;
}

/** Retourne la période de vacances scolaires correspondant à une date, ou null */
export function getVacation(date: Date): Vacation | null {
  const t = date.getTime();
  return VACANCES.find((v) => t >= v.start.getTime() && t <= v.end.getTime()) ?? null;
}
