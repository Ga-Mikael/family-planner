import { useState, useEffect, useCallback, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Member, Task, Grocery, Reminder, Room, ConfettiPiece } from "../types";
import { toTask, toMember, toGrocery, toReminder, toRoom, fromTask, fromMember, fromGrocery, fromReminder, fromRoom } from "../lib/converters";
import { newId } from "../lib/utils";
import { DEFAULT_ROOMS, MEMBER_COLORS, CONF_CLR } from "../lib/constants";

/**
 * App-wide data hook.
 *
 * Returns stable function references for every CRUD action so that consumers
 * (memoized components, useMemo of viewProps in App.tsx, etc.) don't bust
 * when unrelated state changes. State read by handlers comes from refs kept
 * synchronized with the latest state — not from closure variables.
 */
export function useAppData(session: Session | null) {
  const [dataReady,  setDataReady]  = useState(false);
  const [dbError,    setDbError]    = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [members,    setMembers]    = useState<Member[]>([]);
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [groceries,  setGroceries]  = useState<Grocery[]>([]);
  const [reminders,  setReminders]  = useState<Reminder[]>([]);
  const [rooms,      setRooms]      = useState<Room[]>([]);
  const [confetti,   setConfetti]   = useState<ConfettiPiece[]>([]);

  // ── Undo : dernière suppression restaurable (toast "Annuler" dans App) ────
  const [lastDeleted, setLastDeleted] = useState<{ label: string; restore: () => Promise<void> } | null>(null);
  const lastDeletedRef = useRef<{ label: string; restore: () => Promise<void> } | null>(null);
  useEffect(() => { lastDeletedRef.current = lastDeleted; }, [lastDeleted]);
  const clearUndo = useCallback(() => setLastDeleted(null), []);
  const undoDelete = useCallback(async () => {
    const entry = lastDeletedRef.current;
    if (!entry) return;
    setLastDeleted(null);
    await entry.restore();
  }, []);

  // ── Refs to latest state (read inside stable callbacks without re-binding) ─
  const sessionRef   = useRef(session);
  const tasksRef     = useRef(tasks);
  const groceriesRef = useRef(groceries);
  const remindersRef = useRef(reminders);
  const membersRef   = useRef(members);
  const roomsRef     = useRef(rooms);

  useEffect(() => { sessionRef.current   = session;   }, [session]);
  useEffect(() => { tasksRef.current     = tasks;     }, [tasks]);
  useEffect(() => { groceriesRef.current = groceries; }, [groceries]);
  useEffect(() => { remindersRef.current = reminders;  }, [reminders]);
  useEffect(() => { membersRef.current   = members;   }, [members]);
  useEffect(() => { roomsRef.current     = rooms;     }, [rooms]);

  const uid = useCallback((): string => sessionRef.current!.user.id, []);

  const logErr = useCallback((op: string, e: { message: string } | null) => {
    if (e) { console.error(`Supabase ${op}:`, e); setDbError(`Erreur (${op}) : ${e.message}`); }
  }, []);

  const burst = useCallback(() => {
    const p = Array.from({ length: 14 }, (_, i) => ({ id: Date.now() + i, color: CONF_CLR[i % CONF_CLR.length], x: 20 + Math.random() * 60, delay: Math.random() * 0.3 }));
    setConfetti(p);
    setTimeout(() => setConfetti([]), 1200);
  }, []);

  const loadData = useCallback(async (userId: string) => {
    const [tR, mR, gR, rR, roR] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("members").select("*").eq("user_id", userId).order("sort_order"),
      supabase.from("groceries").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("reminders").select("*").eq("user_id", userId),
      supabase.from("rooms").select("*").eq("user_id", userId).order("sort_order"),
    ]);

    const firstErr = [mR.error, tR.error, gR.error, rR.error, roR.error].find(Boolean);
    if (firstErr) {
      console.error("Supabase loadData error:", firstErr);
      setDbError(`Erreur base de données : ${firstErr.message}`);
      setDataReady(true);
      return;
    }
    setDbError(null);

    if (mR.data) {
      if (mR.data.length === 0) {
        setNeedsSetup(true);
        setDataReady(true);
        return;
      } else {
        setMembers(mR.data.map(toMember));
        setNeedsSetup(false);
      }
    }

    if (tR.data && mR.data && mR.data.length > 0) setTasks(tR.data.map(toTask));
    if (gR.data) setGroceries(gR.data.map(toGrocery));
    if (rR.data) setReminders(rR.data.map(toReminder));
    if (roR.data && roR.data.length > 0) {
      setRooms(roR.data.map(toRoom));
    } else if (roR.data && roR.data.length === 0 && mR.data && mR.data.length > 0) {
      await supabase.from("rooms").insert(DEFAULT_ROOMS.map((r, i) => fromRoom(r, userId, i)));
      setRooms(DEFAULT_ROOMS);
    }
    setDataReady(true);
  }, []);

  useEffect(() => {
    if (session?.user) loadData(session.user.id);
  }, [session, loadData]);

  useEffect(() => {
    if (!session?.user) return;
    const userId = session.user.id;

    // Apply a single row change in-place rather than refetching the whole
    // dataset on every event. Each handler is idempotent — if the row was
    // already added/updated/removed by an optimistic local update, the
    // operation becomes a no-op.
    const applyDiff = <T extends { id: string }>(
      setter: Dispatch<SetStateAction<T[]>>,
      eventType: "INSERT" | "UPDATE" | "DELETE",
      newRow: T | null,
      oldId: string | null,
    ) => {
      if (eventType === "DELETE") {
        if (!oldId) return;
        setter((prev) => prev.filter((x) => x.id !== oldId));
        return;
      }
      if (!newRow) return;
      setter((prev) => {
        const idx = prev.findIndex((x) => x.id === newRow.id);
        if (eventType === "INSERT") return idx === -1 ? [...prev, newRow] : prev;
        // UPDATE
        if (idx === -1) return [...prev, newRow];
        const next = prev.slice(); next[idx] = newRow; return next;
      });
    };

    const ch = supabase.channel(`foyer-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` }, (p) => {
        const row = p.new && Object.keys(p.new).length ? toTask(p.new) : null;
        const oldId = (p.old as { id?: string } | null)?.id ?? null;
        applyDiff(setTasks, p.eventType as "INSERT" | "UPDATE" | "DELETE", row, oldId);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "members", filter: `user_id=eq.${userId}` }, (p) => {
        const row = p.new && Object.keys(p.new).length ? toMember(p.new) : null;
        const oldId = (p.old as { id?: string } | null)?.id ?? null;
        applyDiff(setMembers, p.eventType as "INSERT" | "UPDATE" | "DELETE", row, oldId);
        // If the table goes empty for this user, treat as needing setup.
        if (p.eventType === "DELETE") {
          setNeedsSetup((cur) => cur || membersRef.current.length <= 1);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "groceries", filter: `user_id=eq.${userId}` }, (p) => {
        const row = p.new && Object.keys(p.new).length ? toGrocery(p.new) : null;
        const oldId = (p.old as { id?: string } | null)?.id ?? null;
        applyDiff(setGroceries, p.eventType as "INSERT" | "UPDATE" | "DELETE", row, oldId);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reminders", filter: `user_id=eq.${userId}` }, (p) => {
        const row = p.new && Object.keys(p.new).length ? toReminder(p.new) : null;
        const oldId = (p.old as { id?: string } | null)?.id ?? null;
        applyDiff(setReminders, p.eventType as "INSERT" | "UPDATE" | "DELETE", row, oldId);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `user_id=eq.${userId}` }, (p) => {
        const row = p.new && Object.keys(p.new).length ? toRoom(p.new) : null;
        const oldId = (p.old as { id?: string } | null)?.id ?? null;
        applyDiff(setRooms, p.eventType as "INSERT" | "UPDATE" | "DELETE", row, oldId);
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [session]);

  /* ── CRUD (all stable refs) ── */
  const addTask = useCallback(async (t: Task) => {
    setTasks((p) => [...p, t]); burst();
    const { error } = await supabase.from("tasks").insert(fromTask(t, uid())); logErr("addTask", error);
  }, [burst, uid, logErr]);

  const deleteTask = useCallback(async (id: string) => {
    const snapshot = tasksRef.current.find((t) => t.id === id);
    setTasks((p) => p.filter((t) => t.id !== id));
    if (snapshot) {
      setLastDeleted({
        label: snapshot.name,
        restore: async () => {
          setTasks((p) => p.some((x) => x.id === snapshot.id) ? p : [...p, snapshot]);
          const { error } = await supabase.from("tasks").insert(fromTask(snapshot, uid())); logErr("undoTask", error);
        },
      });
    }
    const { error } = await supabase.from("tasks").delete().eq("id", id); logErr("deleteTask", error);
  }, [uid, logErr]);

  const updateTask = useCallback(async (t: Task) => {
    setTasks((p) => p.map((x) => x.id === t.id ? t : x));
    const { error } = await supabase.from("tasks").update(fromTask(t, uid())).eq("id", t.id); logErr("updateTask", error);
  }, [uid, logErr]);

  const toggleTask = useCallback(async (id: string, dateStr?: string) => {
    const task = tasksRef.current.find((t) => t.id === id); if (!task) return;

    // Tâches récurrentes : on valide uniquement l'occurrence du jour donné
    if (task.recurrence !== "once" && dateStr) {
      const dates   = task.doneDates ?? [];
      const isDone  = dates.includes(dateStr);
      const newDates = isDone
        ? dates.filter((d) => d !== dateStr)
        : [...dates, dateStr];
      setTasks((p) => p.map((t) => t.id === id ? { ...t, doneDates: newDates } : t));
      if (!isDone) burst();
      const { error } = await supabase.from("tasks")
        .update({ done_dates: newDates.length ? JSON.stringify(newDates) : null })
        .eq("id", id);
      logErr("toggleTask", error);
      return;
    }

    // Tâche "une fois" ou basculement global
    const done = !task.done;
    setTasks((p) => p.map((t) => t.id === id ? { ...t, done } : t));
    if (done) burst();
    const { error } = await supabase.from("tasks").update({ done }).eq("id", id); logErr("toggleTask", error);
  }, [burst, logErr]);

  const addGrocery = useCallback(async (g: Omit<Grocery, "id">) => {
    const row = fromGrocery(g, uid());
    setGroceries((p) => [...p, { ...g, id: row.id }]);
    const { error } = await supabase.from("groceries").insert(row); logErr("addGrocery", error);
  }, [uid, logErr]);

  const toggleGroc = useCallback(async (id: string) => {
    const g = groceriesRef.current.find((x) => x.id === id); if (!g) return;
    const done = !g.done;
    setGroceries((p) => p.map((x) => x.id === id ? { ...x, done } : x));
    const { error } = await supabase.from("groceries").update({ done }).eq("id", id); logErr("toggleGroc", error);
  }, [logErr]);

  const deleteGroc = useCallback(async (id: string) => {
    const snapshot = groceriesRef.current.find((x) => x.id === id);
    setGroceries((p) => p.filter((x) => x.id !== id));
    if (snapshot) {
      setLastDeleted({
        label: snapshot.name,
        restore: async () => {
          setGroceries((p) => p.some((x) => x.id === snapshot.id) ? p : [...p, snapshot]);
          const { error } = await supabase.from("groceries").insert({ ...fromGrocery(snapshot, uid()), id: snapshot.id }); logErr("undoGroc", error);
        },
      });
    }
    const { error } = await supabase.from("groceries").delete().eq("id", id); logErr("deleteGroc", error);
  }, [uid, logErr]);

  const updateGrocCategory = useCallback(async (id: string, category: string | null) => {
    setGroceries((p) => p.map((x) => x.id === id ? { ...x, category: category ?? undefined } : x));
    const { error } = await supabase.from("groceries").update({ category }).eq("id", id); logErr("updateGrocCategory", error);
  }, [logErr]);

  const addReminder = useCallback(async (r: Omit<Reminder, "id">) => {
    const row = fromReminder(r, uid());
    setReminders((p) => [...p, { ...r, id: row.id }]);
    const { error } = await supabase.from("reminders").insert(row); logErr("addReminder", error);
  }, [uid, logErr]);

  const deleteRem = useCallback(async (id: string) => {
    const snapshot = remindersRef.current.find((x) => x.id === id);
    setReminders((p) => p.filter((x) => x.id !== id));
    if (snapshot) {
      setLastDeleted({
        label: snapshot.title,
        restore: async () => {
          setReminders((p) => p.some((x) => x.id === snapshot.id) ? p : [...p, snapshot]);
          const { error } = await supabase.from("reminders").insert({ ...fromReminder(snapshot, uid()), id: snapshot.id }); logErr("undoRem", error);
        },
      });
    }
    const { error } = await supabase.from("reminders").delete().eq("id", id); logErr("deleteRem", error);
  }, [uid, logErr]);

  const updateMember = useCallback(async (m: Member) => {
    setMembers((p) => p.map((x) => x.id === m.id ? m : x));
    const idx = membersRef.current.findIndex((x) => x.id === m.id);
    const { error } = await supabase.from("members").update(fromMember(m, uid(), idx)).eq("id", m.id); logErr("updateMember", error);
  }, [uid, logErr]);

  const addMember = useCallback(async (m: Pick<Member, "name" | "emoji"> & { color?: string; avatarBg?: string }) => {
    const list = membersRef.current;
    const def = MEMBER_COLORS[list.length % MEMBER_COLORS.length];
    const full: Member = { id: newId("m"), ...def, ...m, workDays: [], workHours: {} };
    setMembers((p) => [...p, full]);
    const { error } = await supabase.from("members").insert(fromMember(full, uid(), list.length)); logErr("addMember", error);
  }, [uid, logErr]);

  const deleteMember = useCallback(async (id: string) => {
    const snapshot = membersRef.current.find((m) => m.id === id);
    const idx = membersRef.current.findIndex((m) => m.id === id);
    setMembers((p) => p.filter((m) => m.id !== id));
    if (snapshot) {
      setLastDeleted({
        label: snapshot.name,
        restore: async () => {
          setMembers((p) => p.some((x) => x.id === snapshot.id) ? p : [...p, snapshot]);
          const { error } = await supabase.from("members").insert(fromMember(snapshot, uid(), idx)); logErr("undoMember", error);
        },
      });
    }
    const { error } = await supabase.from("members").delete().eq("id", id); logErr("deleteMember", error);
  }, [uid, logErr]);

  const addRoom = useCallback(async (r: Omit<Room, "id">) => {
    const full: Room = { id: newId("rm"), ...r };
    const len = roomsRef.current.length;
    setRooms((p) => [...p, full]);
    const { error } = await supabase.from("rooms").insert(fromRoom(full, uid(), len)); logErr("addRoom", error);
  }, [uid, logErr]);

  const deleteRoom = useCallback(async (id: string) => {
    if (id === "r-general") return;
    const snapshot = roomsRef.current.find((r) => r.id === id);
    const idx = roomsRef.current.findIndex((r) => r.id === id);
    setRooms((p) => p.filter((r) => r.id !== id));
    setTasks((p) => p.map((t) => t.roomId === id ? { ...t, roomId: "r-general" } : t));
    if (snapshot) {
      setLastDeleted({
        label: snapshot.name,
        // Note : les tâches déplacées vers "Général" ne sont pas réaffectées.
        restore: async () => {
          setRooms((p) => p.some((x) => x.id === snapshot.id) ? p : [...p, snapshot]);
          const { error } = await supabase.from("rooms").insert(fromRoom(snapshot, uid(), idx)); logErr("undoRoom", error);
        },
      });
    }
    await supabase.from("tasks").update({ room_id: "r-general" }).eq("room_id", id).eq("user_id", uid());
    const { error } = await supabase.from("rooms").delete().eq("id", id); logErr("deleteRoom", error);
  }, [uid, logErr]);

  const finishSetup = useCallback(async (setupMembers: Member[]) => {
    const userId = uid();
    const { error } = await supabase.from("members").insert(setupMembers.map((m, i) => fromMember(m, userId, i)));
    if (error) { logErr("finishSetup", error); return; }
    setMembers(setupMembers);
    await supabase.from("rooms").insert(DEFAULT_ROOMS.map((r, i) => fromRoom(r, userId, i)));
    setRooms(DEFAULT_ROOMS);
    setNeedsSetup(false);
  }, [uid, logErr]);

  return {
    dataReady, dbError, setDbError, needsSetup,
    members, tasks, groceries, reminders, rooms,
    confetti, burst,
    addTask, deleteTask, updateTask, toggleTask,
    addGrocery, toggleGroc, deleteGroc, updateGrocCategory,
    addReminder, deleteRem,
    updateMember, addMember, deleteMember,
    addRoom, deleteRoom, finishSetup,
    lastDeleted, undoDelete, clearUndo,
  };
}
