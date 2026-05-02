import type { Priority, Recurrence, Room, IconName, Vacation } from "../types";

// ─── Jours de la semaine ───────────────────────────────────────────────────
export const DAYS_S  = ["L", "M", "M", "J", "V", "S", "D"] as const;
export const DAYS_S2 = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;
export const DAYS_F  = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;
export const MONTHS  = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
] as const;

// ─── Couleurs ──────────────────────────────────────────────────────────────
export const CONF_CLR = ["#FCE38A", "#C8B6FF", "#A8D5FF", "#FFC0CB", "#A8E6B7", "#FFCBA4"];

export const PASTEL = [
  { bg: "#FCE38A", text: "#8B6914" },
  { bg: "#C8B6FF", text: "#4C3899" },
  { bg: "#A8D5FF", text: "#1E4D85" },
  { bg: "#FFC0CB", text: "#8B2F45" },
  { bg: "#A8E6B7", text: "#1B5E2A" },
  { bg: "#FFCBA4", text: "#7A4416" },
];

export const MEMBER_COLORS = [
  { color: "#EC4899", avatarBg: "#FCE7F3" },
  { color: "#3B82F6", avatarBg: "#DBEAFE" },
  { color: "#10B981", avatarBg: "#D1FAE5" },
  { color: "#A78BFA", avatarBg: "#EDE9FE" },
  { color: "#F59E0B", avatarBg: "#FEF3C7" },
  { color: "#EF4444", avatarBg: "#FEF2F2" },
];

// ─── Configuration des priorités et récurrences ────────────────────────────
export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  high: { label: "Urgent", color: "#DC2626", bg: "#FEE2E2" },
  med:  { label: "Normal", color: "#CA8A04", bg: "#FEF9C3" },
  low:  { label: "Faible", color: "#16A34A", bg: "#DCFCE7" },
};

export const RECURRENCE_CONFIG: Record<Recurrence, { label: string; short: string }> = {
  once:    { label: "Une fois",       short: "1×"       },
  daily:   { label: "Chaque jour",    short: "Quotidien" },
  weekly:  { label: "Chaque semaine", short: "Hebdo"    },
  monthly: { label: "Chaque mois",    short: "Mensuel"  },
};

// ─── Pièces par défaut ─────────────────────────────────────────────────────
export const DEFAULT_ROOMS: Room[] = [
  { id: "r-salon",   name: "Salon",           icon: "sofa",  color: "#3B82F6" },
  { id: "r-cuisine", name: "Cuisine",         icon: "chef",  color: "#F59E0B" },
  { id: "r-wc",      name: "Toilettes",       icon: "door",  color: "#8B5CF6" },
  { id: "r-ch1",     name: "Chambre parents", icon: "bed",   color: "#EC4899" },
  { id: "r-ch2",     name: "Chambre enfant",  icon: "child", color: "#10B981" },
  { id: "r-ch3",     name: "Chambre 3",       icon: "bed",   color: "#6366F1" },
  { id: "r-ch4",     name: "Chambre 4",       icon: "bed",   color: "#14B8A6" },
  { id: "r-sdb1",    name: "Salle de bain 1", icon: "bath",  color: "#0EA5E9" },
  { id: "r-sdb2",    name: "Salle de bain 2", icon: "bath",  color: "#06B6D4" },
  { id: "r-chien",   name: "Chien 🐕",        icon: "dog",   color: "#78716C" },
  { id: "r-general", name: "Général",         icon: "home",  color: "#64748B" },
];

// ─── Vacances scolaires françaises ─────────────────────────────────────────
export const VACANCES: Vacation[] = [
  { name: "Toussaint", start: new Date(2024, 9,  19), end: new Date(2024, 10,  4), color: "#F59E0B" },
  { name: "Noël",      start: new Date(2024, 11, 21), end: new Date(2025,  0,  6), color: "#3B82F6" },
  { name: "Hiver",     start: new Date(2025,  1, 22), end: new Date(2025,  2, 10), color: "#06B6D4" },
  { name: "Printemps", start: new Date(2025,  3, 19), end: new Date(2025,  4,  5), color: "#10B981" },
  { name: "Été",       start: new Date(2025,  6,  5), end: new Date(2025,  8,  1), color: "#EC4899" },
  { name: "Toussaint", start: new Date(2025,  9, 18), end: new Date(2025, 10,  3), color: "#F59E0B" },
  { name: "Noël",      start: new Date(2025, 11, 20), end: new Date(2026,  0,  5), color: "#3B82F6" },
  { name: "Hiver",     start: new Date(2026,  1, 21), end: new Date(2026,  2,  9), color: "#06B6D4" },
  { name: "Printemps", start: new Date(2026,  3, 18), end: new Date(2026,  4,  4), color: "#10B981" },
  { name: "Été",       start: new Date(2026,  6,  4), end: new Date(2026,  8,  1), color: "#EC4899" },
];

// ─── Emojis prédéfinis pour la configuration famille ──────────────────────
export const PRESET_EMOJIS = ["👨", "👩", "👦", "👧", "👴", "👵", "🧑", "👶"];

// ─── Icônes disponibles pour les pièces ────────────────────────────────────
export const ROOM_ICONS: IconName[] = [
  "sofa", "chef", "bath", "bed", "door", "dog", "child",
  "broom", "home", "sparkle", "briefcase", "star", "bell",
];
