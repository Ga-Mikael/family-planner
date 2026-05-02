import { useState, useEffect, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { Member, Task, Grocery, Meals, Reminder, Room, DayIndex, ConfettiPiece } from "../types";
import { toTask, toMember, toGrocery, toReminder, toRoom, fromTask, fromMember, fromGrocery, fromReminder, fromRoom } from "../lib/converters";
import { DEFAULT_ROOMS, MEMBER_COLORS, CONF_CLR } from "../lib/constants";

export function useAppData(session: Session | null) {
  const [dataReady,  setDataReady]  = useState(false);
  const [dbError,    setDbError]    = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [members,    setMembers]    = useState<Member[]>([]);
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [groceries,  setGroceries]  = useState<Grocery[]>([]);
  const [meals,      setMeals]      = useState<Meals>({ 0: "", 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" });
  const [reminders,  setReminders]  = useState<Reminder[]>([]);
  const [rooms,      setRooms]      = useState<Room[]>([]);
  const [confetti,   setConfetti]   = useState<ConfettiPiece[]>([]);

  const uid = () => session!.user.id;

  const logErr = (op: string, e: { message: string } | null) => {
    if (e) { console.error(`Supabase ${op}:`, e); setDbError(`Erreur (${op}) : ${e.message}`); }
  };

  const burst = () => {
    const p = Array.from({ length: 14 }, (_, i) => ({ id: Date.now() + i, color: CONF_CLR[i % CONF_CLR.length], x: 20 + Math.random() * 60, delay: Math.random() * 0.3 }));
    setConfetti(p);
    setTimeout(() => setConfetti([]), 1200);
  };

  const loadData = useCallback(async (userId: string) => {
    const [tR, mR, meR, gR, rR, roR] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("members").select("*").eq("user_id", userId).order("sort_order"),
      supabase.from("meals").select("*").eq("user_id", userId),
      supabase.from("groceries").select("*").eq("user_id", userId).order("created_at"),
      supabase.from("reminders").select("*").eq("user_id", userId),
      supabase.from("rooms").select("*").eq("user_id", userId).order("sort_order"),
    ]);

    const firstErr = [mR.error, tR.error, meR.error, gR.error, rR.error, roR.error].find(Boolean);
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
    if (meR.data) {
      const rec: Meals = { 0: "", 1: "", 2: "", 3: "", 4: "", 5: "", 6: "" };
      meR.data.forEach((r) => { rec[r.day as DayIndex] = r.meal; });
      setMeals(rec);
    }
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
    const ch = supabase.channel(`foyer-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks",     filter: `user_id=eq.${userId}` }, () => loadData(userId))
      .on("postgres_changes", { event: "*", schema: "public", table: "members",   filter: `user_id=eq.${userId}` }, () => loadData(userId))
      .on("postgres_changes", { event: "*", schema: "public", table: "meals",     filter: `user_id=eq.${userId}` }, () => loadData(userId))
      .on("postgres_changes", { event: "*", schema: "public", table: "groceries", filter: `user_id=eq.${userId}` }, () => loadData(userId))
      .on("postgres_changes", { event: "*", schema: "public", table: "reminders", filter: `user_id=eq.${userId}` }, () => loadData(userId))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session, loadData]);

  /* ── CRUD ── */
  const addTask = async (t: Task) => {
    setTasks((p) => [...p, t]); burst();
    const { error } = await supabase.from("tasks").insert(fromTask(t, uid())); logErr("addTask", error);
  };
  const deleteTask = async (id: string) => {
    setTasks((p) => p.filter((t) => t.id !== id));
    const { error } = await supabase.from("tasks").delete().eq("id", id); logErr("deleteTask", error);
  };
  const updateTask = async (t: Task) => {
    setTasks((p) => p.map((x) => x.id === t.id ? t : x));
    const { error } = await supabase.from("tasks").update(fromTask(t, uid())).eq("id", t.id); logErr("updateTask", error);
  };
  const toggleTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id); if (!task) return;
    const done = !task.done;
    setTasks((p) => p.map((t) => t.id === id ? { ...t, done } : t));
    if (done) burst();
    const { error } = await supabase.from("tasks").update({ done }).eq("id", id); logErr("toggleTask", error);
  };

  const addGrocery = async (g: Omit<Grocery, "id">) => {
    const row = fromGrocery(g, uid());
    setGroceries((p) => [...p, { ...g, id: row.id }]);
    const { error } = await supabase.from("groceries").insert(row); logErr("addGrocery", error);
  };
  const toggleGroc = async (id: string) => {
    const g = groceries.find((x) => x.id === id); if (!g) return;
    const done = !g.done;
    setGroceries((p) => p.map((x) => x.id === id ? { ...x, done } : x));
    const { error } = await supabase.from("groceries").update({ done }).eq("id", id); logErr("toggleGroc", error);
  };
  const deleteGroc = async (id: string) => {
    setGroceries((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from("groceries").delete().eq("id", id); logErr("deleteGroc", error);
  };

  const updateMeals = async (newMeals: Meals) => {
    setMeals(newMeals);
    const rows = Object.entries(newMeals).map(([d, m]) => ({ day: parseInt(d), meal: m || "", user_id: uid() }));
    const { error } = await supabase.from("meals").upsert(rows, { onConflict: "day,user_id" }); logErr("updateMeals", error);
  };

  const addReminder = async (r: Omit<Reminder, "id">) => {
    const row = fromReminder(r, uid());
    setReminders((p) => [...p, { ...r, id: row.id }]);
    const { error } = await supabase.from("reminders").insert(row); logErr("addReminder", error);
  };
  const deleteRem = async (id: string) => {
    setReminders((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from("reminders").delete().eq("id", id); logErr("deleteRem", error);
  };

  const updateMember = async (m: Member) => {
    setMembers((p) => p.map((x) => x.id === m.id ? m : x));
    const idx = members.findIndex((x) => x.id === m.id);
    const { error } = await supabase.from("members").update(fromMember(m, uid(), idx)).eq("id", m.id); logErr("updateMember", error);
  };
  const addMember = async (m: Pick<Member, "name" | "emoji"> & { color?: string; avatarBg?: string }) => {
    const def = MEMBER_COLORS[members.length % MEMBER_COLORS.length];
    const full: Member = { id: "m" + Date.now(), ...def, ...m, workDays: [], workHours: {} };
    setMembers((p) => [...p, full]);
    const { error } = await supabase.from("members").insert(fromMember(full, uid(), members.length)); logErr("addMember", error);
  };
  const deleteMember = async (id: string) => {
    setMembers((p) => p.filter((m) => m.id !== id));
    const { error } = await supabase.from("members").delete().eq("id", id); logErr("deleteMember", error);
  };

  const addRoom = async (r: Omit<Room, "id">) => {
    const full: Room = { id: "rm" + Date.now(), ...r };
    setRooms((p) => [...p, full]);
    const { error } = await supabase.from("rooms").insert(fromRoom(full, uid(), rooms.length)); logErr("addRoom", error);
  };
  const deleteRoom = async (id: string) => {
    if (id === "r-general") return;
    setRooms((p) => p.filter((r) => r.id !== id));
    setTasks((p) => p.map((t) => t.roomId === id ? { ...t, roomId: "r-general" } : t));
    await supabase.from("tasks").update({ room_id: "r-general" }).eq("room_id", id).eq("user_id", uid());
    const { error } = await supabase.from("rooms").delete().eq("id", id); logErr("deleteRoom", error);
  };

  const finishSetup = async (setupMembers: Member[]) => {
    const userId = uid();
    const { error } = await supabase.from("members").insert(setupMembers.map((m, i) => fromMember(m, userId, i)));
    if (error) { logErr("finishSetup", error); return; }
    setMembers(setupMembers);
    await supabase.from("rooms").insert(DEFAULT_ROOMS.map((r, i) => fromRoom(r, userId, i)));
    setRooms(DEFAULT_ROOMS);
    setNeedsSetup(false);
  };

  return {
    dataReady, dbError, setDbError, needsSetup,
    members, tasks, groceries, meals, reminders, rooms,
    confetti, burst,
    addTask, deleteTask, updateTask, toggleTask,
    addGrocery, toggleGroc, deleteGroc,
    updateMeals, addReminder, deleteRem,
    updateMember, addMember, deleteMember,
    addRoom, deleteRoom, finishSetup,
  };
}
