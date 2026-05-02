import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import type { TabId } from "./types";
import { supabase } from "./lib/supabase";
import { todayIdx, isWeekend } from "./lib/utils";
import { GLOBAL_CSS } from "./styles";
import { useAppData } from "./hooks/useAppData";
import { LoadingScreen }    from "./components/LoadingScreen";
import { LoginScreen }      from "./components/LoginScreen";
import { FamilySetupScreen } from "./components/FamilySetupScreen";
import { BottomNav }        from "./components/BottomNav";
import { HomeView }     from "./views/HomeView";
import { TasksView }    from "./views/TasksView";
import { AgendaView }   from "./views/AgendaView";
import { ScheduleView } from "./views/ScheduleView";
import { FamilyView }   from "./views/FamilyView";
import type { DayIndex } from "./types";

export default function App() {
  const [session,   setSession]   = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [tab,       setTab]       = useState<TabId>("home");
  const [selDay,    setSelDay]    = useState<DayIndex>(todayIdx());
  const [weekOff,   setWeekOff]   = useState(0);

  // Inject CSS
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => { setSession(s); setAuthReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => { setSession(s); });
    return () => subscription.unsubscribe();
  }, []);

  const data = useAppData(session);

  if (!authReady)       return <LoadingScreen message="Initialisation…" />;
  if (!session)         return <LoginScreen />;
  if (!data.dataReady)  return <LoadingScreen message="Chargement du foyer…" />;
  if (data.needsSetup)  return <FamilySetupScreen onFinish={data.finishSetup} />;

  const weekendWarn = data.tasks.filter((t) => isWeekend(t.day) && !t.done).length >= 8;

  const vp = {
    members: data.members, tasks: data.tasks, rooms: data.rooms,
    groceries: data.groceries, meals: data.meals, reminders: data.reminders,
    selDay, setSelDay, weekOff, setWeekOff,
    addTask: data.addTask, deleteTask: data.deleteTask,
    toggleTask: data.toggleTask, updateTask: data.updateTask,
    addGrocery: data.addGrocery, toggleGroc: data.toggleGroc, deleteGroc: data.deleteGroc,
    updateMeals: data.updateMeals, addReminder: data.addReminder, deleteRem: data.deleteRem,
    updateMember: data.updateMember, addMember: data.addMember, deleteMember: data.deleteMember,
    addRoom: data.addRoom, deleteRoom: data.deleteRoom,
    weekendWarn, burst: data.burst,
  };

  return (
    <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      {/* Confetti */}
      {data.confetti.map((c) => (
        <div key={c.id} style={{ position: "fixed", left: `${c.x}%`, top: "40%", width: 9, height: 9, borderRadius: 2, background: c.color, animationName: "confDrop", animationDuration: ".9s", animationDelay: `${c.delay}s`, animationFillMode: "forwards", pointerEvents: "none", zIndex: 9999 }} />
      ))}

      {/* Bandeau erreur Supabase */}
      {data.dbError && (
        <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, zIndex: 9998, padding: "10px 16px", background: "#FEF2F2", borderBottom: "2px solid #FCA5A5", display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: ".78rem", color: "#DC2626", marginBottom: 2 }}>Problème Supabase — les données ne sont pas sauvegardées</div>
            <div style={{ fontSize: ".72rem", color: "#7F1D1D", fontFamily: "monospace", wordBreak: "break-all" }}>{data.dbError}</div>
          </div>
          <button onClick={() => data.setDbError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#DC2626", fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 72 }}>
        {tab === "home"     && <HomeView     {...vp} />}
        {tab === "tasks"    && <TasksView    {...vp} />}
        {tab === "agenda"   && <AgendaView   {...vp} />}
        {tab === "schedule" && <ScheduleView {...vp} />}
        {tab === "family"   && <FamilyView   {...vp} onSignOut={() => supabase.auth.signOut()} userEmail={session.user.email ?? ""} />}
      </div>

      <BottomNav tab={tab} setTab={setTab} weekendWarn={weekendWarn} />
    </div>
  );
}
