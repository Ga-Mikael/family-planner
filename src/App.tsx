import { useState, useEffect, useMemo, useCallback, Suspense, lazy } from "react";
import type { Session } from "@supabase/supabase-js";
import type { TabId } from "./types";
import { supabase } from "./lib/supabase";
import { todayIdx, isWeekend } from "./lib/utils";
import { useAppData } from "./hooks/useAppData";
import { useTheme } from "./hooks/useTheme";
import { LoadingScreen }    from "./components/LoadingScreen";
import { LoginScreen }      from "./components/LoginScreen";
import { FamilySetupScreen } from "./components/FamilySetupScreen";
import { BottomNav }        from "./components/BottomNav";
import type { DayIndex } from "./types";

// Lazy load views — each tab is its own chunk, downloaded on first visit only.
const HomeView     = lazy(() => import("./views/HomeView").then((m) => ({ default: m.HomeView })));
const TasksView    = lazy(() => import("./views/TasksView").then((m) => ({ default: m.TasksView })));
const AgendaView   = lazy(() => import("./views/AgendaView").then((m) => ({ default: m.AgendaView })));
const ScheduleView = lazy(() => import("./views/ScheduleView").then((m) => ({ default: m.ScheduleView })));
const FamilyView   = lazy(() => import("./views/FamilyView").then((m) => ({ default: m.FamilyView })));

export default function App() {
  const [session,   setSession]   = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [tab,       setTab]       = useState<TabId>("home");
  const [selDay,    setSelDay]    = useState<DayIndex>(todayIdx());
  const [weekOff,   setWeekOff]   = useState(0);

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => { setSession(s); setAuthReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => { setSession(s); });
    return () => subscription.unsubscribe();
  }, []);

  const data = useAppData(session);
  const { isDark, toggleTheme } = useTheme();

  // Toast undo : disparaît seul après 5 s.
  useEffect(() => {
    if (!data.lastDeleted) return;
    const t = setTimeout(() => data.clearUndo(), 5000);
    return () => clearTimeout(t);
  }, [data.lastDeleted, data.clearUndo, data]);

  // Memoize derived state to avoid recomputing on every render.
  const weekendWarn = useMemo(
    () => data.tasks.filter((t) => isWeekend(t.day) && !t.done).length >= 8,
    [data.tasks],
  );

  // Memoize the props bundle so child views with React.memo (future) don't
  // re-render when only an unrelated piece of App state changes.
  const vp = useMemo(() => ({
    members: data.members, tasks: data.tasks, rooms: data.rooms,
    groceries: data.groceries, reminders: data.reminders,
    selDay, setSelDay, weekOff, setWeekOff,
    addTask: data.addTask, deleteTask: data.deleteTask,
    toggleTask: data.toggleTask, updateTask: data.updateTask,
    addGrocery: data.addGrocery, toggleGroc: data.toggleGroc, deleteGroc: data.deleteGroc,
    updateGrocCategory: data.updateGrocCategory,
    addReminder: data.addReminder, deleteRem: data.deleteRem,
    updateMember: data.updateMember, addMember: data.addMember, deleteMember: data.deleteMember,
    addRoom: data.addRoom, deleteRoom: data.deleteRoom,
    weekendWarn, burst: data.burst,
    isDark, toggleTheme,
  }), [
    data.members, data.tasks, data.rooms, data.groceries, data.reminders,
    selDay, weekOff,
    data.addTask, data.deleteTask, data.toggleTask, data.updateTask,
    data.addGrocery, data.toggleGroc, data.deleteGroc, data.updateGrocCategory,
    data.addReminder, data.deleteRem,
    data.updateMember, data.addMember, data.deleteMember,
    data.addRoom, data.deleteRoom,
    weekendWarn, data.burst, isDark, toggleTheme,
  ]);

  const signOut = useCallback(() => supabase.auth.signOut(), []);
  const dismissDbError = useCallback(() => data.setDbError(null), [data]);

  if (!authReady)       return <LoadingScreen message="Initialisation…" />;
  if (!session)         return <LoginScreen />;
  if (!data.dataReady)  return <LoadingScreen message="Chargement du foyer…" />;
  if (data.needsSetup)  return <FamilySetupScreen onFinish={data.finishSetup} />;

  return (
    <div className="fp-app-root" style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      {/* Confetti */}
      {data.confetti.map((c) => (
        <div key={c.id} style={{ position: "fixed", left: `${c.x}%`, top: "40%", width: 9, height: 9, borderRadius: 2, background: c.color, animationName: "confDrop", animationDuration: ".9s", animationDelay: `${c.delay}s`, animationFillMode: "forwards", pointerEvents: "none", zIndex: 9999 }} />
      ))}

      {/* Bandeau erreur Supabase */}
      {data.dbError && (
        <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, zIndex: 9998, padding: "10px 16px", background: "var(--danger-bg)", borderBottom: "2px solid var(--danger)", display: "flex", alignItems: "flex-start", gap: 8 }}>
          <span style={{ fontSize: "1rem", flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: ".78rem", color: "var(--danger)", marginBottom: 2 }}>Problème Supabase — les données ne sont pas sauvegardées</div>
            <div style={{ fontSize: ".72rem", color: "var(--muted)", fontFamily: "monospace", wordBreak: "break-all" }}>{data.dbError}</div>
          </div>
          <button onClick={dismissDbError} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 72 }}>
        <Suspense fallback={<LoadingScreen message="Chargement…" />}>
          {tab === "home"     && <HomeView     {...vp} />}
          {tab === "tasks"    && <TasksView    {...vp} />}
          {tab === "agenda"   && <AgendaView   {...vp} />}
          {tab === "schedule" && <ScheduleView {...vp} />}
          {tab === "family"   && <FamilyView   {...vp} onSignOut={signOut} userEmail={session.user.email ?? ""} />}
        </Suspense>
      </div>

      {/* Toast undo suppression */}
      {data.lastDeleted && (
        <div
          role="status"
          aria-live="polite"
          style={{ position: "fixed", bottom: 84, left: "50%", transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: 398, zIndex: 1100, background: "var(--text)", color: "var(--bg)", borderRadius: 14, padding: "11px 14px", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 8px 28px rgba(0,0,0,.25)", animation: "fadeUp .2s ease" }}
        >
          <span style={{ flex: 1, fontSize: ".82rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            « {data.lastDeleted.label} » supprimé
          </span>
          <button
            onClick={() => data.undoDelete()}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", fontSize: ".82rem", fontWeight: 800, padding: "2px 6px", flexShrink: 0 }}
          >
            Annuler
          </button>
          <button
            aria-label="Fermer"
            onClick={() => data.clearUndo()}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--bg)", opacity: .6, padding: 2, display: "flex", flexShrink: 0, fontSize: ".9rem", lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      )}

      <BottomNav tab={tab} setTab={setTab} weekendWarn={weekendWarn} />
    </div>
  );
}
