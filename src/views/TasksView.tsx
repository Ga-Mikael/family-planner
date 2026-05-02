import { useState } from "react";
import type { ViewProps, Task, DayIndex, Priority, Recurrence } from "../types";
import { Icon } from "../components/ui/Icon";
import { Chip } from "../components/ui/Chip";
import { Empty } from "../components/ui/Empty";
import { PgHdr } from "../components/ui/PgHdr";
import { MemberToggleBar } from "../components/ui/MemberToggleBar";
import { WorkConflictAlert } from "../components/ui/WorkConflictAlert";
import { FullTaskCard } from "../components/tasks/FullTaskCard";
import { EditTaskModal } from "../components/tasks/EditTaskModal";
import { todayIdx, isWeekend, getWorkConflict } from "../lib/utils";
import { DAYS_F, PRIORITY_CONFIG, RECURRENCE_CONFIG } from "../lib/constants";
import { inputStyle, primaryBtn, ghostBtn } from "../styles";

export function TasksView({ members, tasks, rooms, addTask, toggleTask, deleteTask, updateTask }: ViewProps) {
  const [show,       setShow]       = useState(false);
  const [fname,      setFname]      = useState("");
  const [fms,        setFms]        = useState<string[]>([]);
  const [fr,         setFr]         = useState("r-general");
  const [fd,         setFd]         = useState<string>(String(todayIdx()));
  const [fp,         setFp]         = useState<Priority>("med");
  const [frec,       setFrec]       = useState<Recurrence>("once");
  const [ftime,      setFtime]      = useState("");
  const [fnote,      setFnote]      = useState("");
  const [filt,       setFilt]       = useState<"all" | "todo" | "done" | "high" | "weekend">("all");
  const [search,     setSearch]     = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const conflict = getWorkConflict(fms.join(","), parseInt(fd) as DayIndex, ftime, members);

  const submit = () => {
    if (!fname.trim() || conflict) return;
    addTask({ id: "t" + Date.now(), name: fname.trim(), memberId: fms.join(","), roomId: fr, day: parseInt(fd) as DayIndex, priority: fp, recurrence: frec, done: false, note: fnote || undefined, dueTime: ftime || undefined });
    setFname(""); setFms([]); setFr("r-general"); setFp("med"); setFrec("once"); setFtime(""); setFnote(""); setShow(false);
  };

  const filtered = [...tasks]
    .filter((t) => {
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filt === "todo") return !t.done;
      if (filt === "done") return t.done;
      if (filt === "high") return t.priority === "high" && !t.done;
      if (filt === "weekend") return isWeekend(t.day) && !t.done;
      return true;
    })
    .sort((a, b) => ({ high: 0, med: 1, low: 2 }[a.priority] - { high: 0, med: 1, low: 2 }[b.priority] || a.day - b.day));

  const urgentCount = tasks.filter((t) => t.priority === "high" && !t.done).length;

  return (
    <div style={{ animation: "fadeUp .35s ease" }}>
      <PgHdr title="Tâches" sub={`${tasks.filter((t) => !t.done).length} à faire · ${tasks.filter((t) => t.done).length} faites`} />
      <div style={{ padding: "14px 16px" }}>
        {/* Recherche */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted2)" }}>
            <Icon name="search" size={15} />
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" style={{ ...inputStyle, paddingLeft: 36 }} />
        </div>

        {/* Filtres */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", scrollbarWidth: "none" }}>
          {([["all", "Toutes"], ["todo", "À faire"], ["done", "Faites"], ["high", `🔴 Urgentes${urgentCount > 0 ? " (" + urgentCount + ")" : ""}`], ["weekend", "🏡 Week-end"]] as const).map(([v, l]) => (
            <Chip key={v} label={l} active={filt === v} onClick={() => setFilt(v)} />
          ))}
        </div>

        {/* Formulaire d'ajout */}
        {show ? (
          <div style={{ background: "var(--soft)", border: "1px solid var(--border)", borderRadius: 16, padding: 16, marginBottom: 14, animation: "fadeUp .2s ease" }}>
            <input value={fname} onChange={(e) => setFname(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Nom de la tâche…" style={{ ...inputStyle, marginBottom: 8, background: "white" }} />
            <MemberToggleBar members={members} selected={fms} onChange={setFms} />
            <select value={fd} onChange={(e) => setFd(e.target.value)} style={{ ...inputStyle, marginBottom: 8, background: "white" }}>
              {DAYS_F.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <select value={fr} onChange={(e) => setFr(e.target.value)} style={{ ...inputStyle, flex: 1, background: "white" }}>
                {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <input type="time" value={ftime} onChange={(e) => setFtime(e.target.value)} style={{ ...inputStyle, flex: 1, background: "white" }} />
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
              {(["low", "med", "high"] as Priority[]).map((p) => {
                const c = PRIORITY_CONFIG[p];
                return <button key={p} onClick={() => setFp(p)} style={{ flex: 1, padding: "7px 4px", border: `1.5px solid ${fp === p ? c.color : "var(--border)"}`, borderRadius: 8, background: fp === p ? c.bg : "white", color: fp === p ? c.color : "var(--muted)", fontSize: ".7rem", fontWeight: 700, cursor: "pointer" }}>{c.label}</button>;
              })}
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
              {(["once", "daily", "weekly", "monthly"] as Recurrence[]).map((rec) => {
                const a = frec === rec;
                return <button key={rec} onClick={() => setFrec(rec)} style={{ flex: 1, padding: "6px 4px", border: `1.5px solid ${a ? "var(--text)" : "var(--border)"}`, borderRadius: 8, background: a ? "var(--text)" : "white", color: a ? "white" : "var(--muted)", fontSize: ".65rem", fontWeight: 700, cursor: "pointer" }}>{RECURRENCE_CONFIG[rec].short}</button>;
              })}
            </div>
            <input value={fnote} onChange={(e) => setFnote(e.target.value)} placeholder="Note optionnelle…" style={{ ...inputStyle, marginBottom: 8, background: "white", fontSize: ".8rem" }} />
            <WorkConflictAlert conflict={conflict} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={submit} disabled={!!conflict} style={{ ...primaryBtn, flex: 1, opacity: conflict ? 0.6 : 1, cursor: conflict ? "not-allowed" : "pointer" }}>{conflict ? "⚠️ Conflit" : "Ajouter ✓"}</button>
              <button onClick={() => setShow(false)} style={{ ...ghostBtn, flex: 1 }}>Annuler</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShow(true)} style={{ ...primaryBtn, width: "100%", marginBottom: 12 }}>
            <Icon name="plus" size={16} sw={2.5} /> Nouvelle tâche
          </button>
        )}

        {/* Suggestions rapides */}
        {!show && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: ".68rem", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>Suggestions rapides</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Faire la vaisselle", "Passer l'aspirateur", "Sortir les poubelles", "Faire la lessive", "Préparer les repas", "Nettoyer la cuisine"].map((s) => (
                <button key={s} onClick={() => { setFname(s); setShow(true); }} style={{ background: "var(--soft)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 10px", fontSize: ".72rem", fontWeight: 600, color: "var(--muted)", cursor: "pointer" }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {/* Liste des tâches */}
        {filtered.length === 0
          ? <Empty iconName="checkCircle" text="Aucune tâche ici !" />
          : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((t) => (
                <FullTaskCard key={t.id} task={t} members={members} rooms={rooms} onToggle={toggleTask} onDelete={deleteTask} onEdit={setEditingTask} />
              ))}
            </div>
          )
        }
      </div>

      {editingTask && (
        <EditTaskModal task={editingTask} members={members} rooms={rooms} onSave={updateTask} onClose={() => setEditingTask(null)} />
      )}
    </div>
  );
}
