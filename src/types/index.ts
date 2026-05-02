// ─── Types primitifs ───────────────────────────────────────────────────────
export type DayIndex   = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Priority   = "low" | "med" | "high";
export type Recurrence = "once" | "daily" | "weekly" | "monthly";
export type TabId      = "home" | "tasks" | "agenda" | "schedule" | "family";

export type IconName =
  | "home" | "check" | "checkCircle" | "bell" | "users" | "plus" | "search" | "settings"
  | "x" | "trash" | "star" | "clock" | "calendar" | "repeat" | "alert" | "chef" | "cart"
  | "sofa" | "bath" | "bed" | "door" | "dog" | "child" | "broom" | "sparkle"
  | "chevronLeft" | "chevronRight" | "sun" | "moon" | "briefcase" | "flag" | "edit"
  | "lock" | "mail" | "eye" | "eyeOff" | "wifi";

// ─── Modèles de données ────────────────────────────────────────────────────
export interface WorkHours {
  start: string;
  end: string;
}

export interface Member {
  id: string;
  name: string;
  emoji: string;
  color: string;
  avatarBg: string;
  isChild?: boolean;
  workDays: DayIndex[];
  workHours: Partial<Record<DayIndex, WorkHours>>;
}

export interface Task {
  id: string;
  name: string;
  memberId: string; // IDs séparés par virgule ex: "m1,m2"
  roomId: string;
  day: DayIndex;
  priority: Priority;
  recurrence: Recurrence;
  done: boolean;
  note?: string;
  dueTime?: string;
  dueDate?: string; // "YYYY-MM-DD" — date précise pour les tâches recurrence:"once"
}

export interface Grocery {
  id: string;
  name: string;
  qty: string;
  done: boolean;
}

export interface Reminder {
  id: string;
  title: string;
  time: string;
  day: DayIndex;
  emoji: string;
}

export type Meals = Record<DayIndex, string>;

export interface Room {
  id: string;
  name: string;
  icon: IconName;
  color: string;
}

export interface ConfettiPiece {
  id: number;
  color: string;
  x: number;
  delay: number;
}

export interface Vacation {
  name: string;
  start: Date;
  end: Date;
  color: string;
}

// ─── Props partagées entre toutes les vues ─────────────────────────────────
export type ViewProps = {
  members: Member[];
  tasks: Task[];
  rooms: Room[];
  groceries: Grocery[];
  meals: Meals;
  reminders: Reminder[];
  selDay: DayIndex;
  setSelDay: (d: DayIndex) => void;
  weekOff: number;
  setWeekOff: (n: number) => void;
  addTask: (t: Task) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  updateTask: (t: Task) => void;
  addGrocery: (g: Omit<Grocery, "id">) => void;
  toggleGroc: (id: string) => void;
  deleteGroc: (id: string) => void;
  updateMeals: (m: Meals) => void;
  addReminder: (r: Omit<Reminder, "id">) => void;
  deleteRem: (id: string) => void;
  updateMember: (m: Member) => void;
  addMember: (m: Pick<Member, "name" | "emoji"> & { color?: string; avatarBg?: string }) => void;
  deleteMember: (id: string) => void;
  addRoom: (r: Omit<Room, "id">) => void;
  deleteRoom: (id: string) => void;
  weekendWarn: boolean;
  burst: () => void;
};
