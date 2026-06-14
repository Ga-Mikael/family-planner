import { useMemo, useState } from "react";
import type { ViewProps, Task, DayIndex } from "../types";
import { Icon } from "../components/ui/Icon";
import { Chip } from "../components/ui/Chip";
import { Empty } from "../components/ui/Empty";
import { FullTaskCard } from "../components/tasks/FullTaskCard";
import { EditTaskModal } from "../components/tasks/EditTaskModal";
import { TaskForm } from "../components/tasks/TaskForm";
import { todayIdx, isWeekend } from "../lib/utils";
import { DAYS_F } from "../lib/constants";
import { inputStyle, primaryBtn } from "../styles";

export function TasksView({ members, tasks, rooms, reminders, addTask, toggleTask, deleteTask, updateTask, addReminder, deleteRem }: ViewProps) {
  // ── Onglets ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"tasks" | "reminders">("tasks");

  // ── Tâches ────────────────────────────────────────────────────────────────
  const [show,       setShow]       = useState(false);
  const [prefillName, setPrefillName] = useState("");
  const [filt,       setFilt]       = useState<"all" | "todo" | "done" | "high" | "weekend">("all");
  const [search,     setSearch]     = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Recompute only when tasks/search/filt change. Skip on unrelated state.
  const filtered = useMemo(() => {
    const prio = { high: 0, med: 1, low: 2 } as const;
    const s = search.toLowerCase();
    return [...tasks]
      .filter((t) => {
        if (s && !t.name.toLowerCase().includes(s)) return false;
        if (filt === "todo")    return !t.done;
        if (filt === "done")    return t.done;
        if (filt === "high")    return t.priority === "high" && !t.done;
        if (filt === "weekend") return isWeekend(t.day) && !t.done;
        return true;
      })
      .sort((a, b) => prio[a.priority] - prio[b.priority] || a.day - b.day);
  }, [tasks, search, filt]);

  const urgentCount = useMemo(
    () => tasks.filter((t) => t.priority === "high" && !t.done).length,
    [tasks],
  );

  // ── Rappels ───────────────────────────────────────────────────────────────
  const [rt,         setRt]         = useState("");
  const [reTime,     setReTime]     = useState("");
  const [reDayVal,   setReDayVal]   = useState(String(todayIdx()));
  const [reEmojiVal, setReEmojiVal] = useState("🔔");
  const [reDate,     setReDate]     = useState("");

  const submitReminder = () => {
    if (!rt.trim()) return;
    addReminder({ title: rt.trim(), time: reTime, day: parseInt(reDayVal) as DayIndex, emoji: reEmojiVal || "🔔", date: reDate || undefined });
    setRt(""); setReTime(""); setReDate("");
  };

  return (
    <div style={{ animation: "fadeUp .35s ease" }}>
      {/* Header gradient + tab bar pills */}
      <div className="fp-tasks-header">
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: ".68rem", fontWeight: 700, color: "var(--accent)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 3 }}>
            {activeTab === "tasks"
              ? `${tasks.filter((t) => !t.done).length} à faire · ${tasks.filter((t) => t.done).length} faites`
              : `${reminders.length} rappel${reminders.length !== 1 ? "s" : ""}`}
          </div>
          <h1 style={{ fontWeight: 900, fontSize: "1.35rem", lineHeight: 1, color: "var(--text)" }}>Tâches 📋</h1>
        </div>
        {/* Tab bar — pill style */}
        <div style={{ display: "flex", gap: 6, padding: 4, borderRadius: 14, background: "rgba(0,0,0,.05)", marginBottom: 0 }}
             className="fp-tab-bar">
          {([["tasks", "Tâches"], ["reminders", "Rappels"]] as const).map(([id, label]) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                style={{
                  flex: 1, border: active ? "1px solid rgba(255,123,181,.25)" : "none",
                  borderRadius: 10, padding: "8px 0",
                  background: active ? "var(--accent)" : "transparent",
                  fontSize: ".82rem", fontWeight: active ? 800 : 700,
                  color: active ? "white" : "var(--muted2)",
                  cursor: "pointer", transition: "all .2s",
                  boxShadow: active ? "0 3px 10px rgba(255,123,181,.3)" : "none",
                  fontFamily: "inherit",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── ONGLET TÂCHES ── */}
      {activeTab === "tasks" && (
        <div style={{ padding: "14px 16px" }}>
          {/* Recherche */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted2)" }}>
              <Icon name="search" size={15} />
            </div>
            <input aria-label="Rechercher une tâche" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" style={{ ...inputStyle, paddingLeft: 36 }} />
          </div>

          {/* Filtres */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto", scrollbarWidth: "none" }}>
            {([["all", "Toutes"], ["todo", "À faire"], ["done", "Faites"], ["high", `🔴 Urgentes${urgentCount > 0 ? " (" + urgentCount + ")" : ""}`], ["weekend", "🏡 Week-end"]] as const).map(([v, l]) => (
              <Chip key={v} label={l} active={filt === v} onClick={() => setFilt(v)} />
            ))}
          </div>

          {/* Formulaire d'ajout */}
          {show ? (
            <div style={{ marginBottom: 14 }}>
              <TaskForm
                key={prefillName}
                members={members}
                rooms={rooms}
                showNote
                initialName={prefillName}
                onSubmit={(t) => { addTask(t); setShow(false); setPrefillName(""); }}
                onCancel={() => { setShow(false); setPrefillName(""); }}
              />
            </div>
          ) : (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "var(--surface)", border: "1px solid var(--card-border)",
                boxShadow: "var(--card-shadow)", borderRadius: 18,
                padding: "11px 14px", marginBottom: 12, cursor: "text",
              }}
              onClick={() => setShow(true)}
            >
              <Icon name="plus" size={15} sw={2.2} color="var(--muted2)" />
              <span style={{ flex: 1, fontSize: ".875rem", fontWeight: 600, color: "var(--muted2)" }}>
                Nouvelle tâche…
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setShow(true); }}
                style={{
                  width: 32, height: 32, borderRadius: 10, border: "none",
                  background: "var(--accent)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 3px 10px rgba(255,123,181,.4)", flexShrink: 0,
                }}
              >
                <Icon name="plus" size={15} sw={2.5} color="white" />
              </button>
            </div>
          )}

          {/* Suggestions rapides */}
          {!show && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: ".68rem", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>Suggestions rapides</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["Faire la vaisselle", "Passer l'aspirateur", "Sortir les poubelles", "Faire la lessive", "Préparer les repas", "Nettoyer la cuisine"].map((s) => (
                  <button key={s} onClick={() => { setPrefillName(s); setShow(true); }} style={{ background: "var(--soft)", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 10px", fontSize: ".72rem", fontWeight: 600, color: "var(--muted)", cursor: "pointer" }}>{s}</button>
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
      )}

      {/* ── ONGLET RAPPELS ── */}
      {activeTab === "reminders" && (
        <div style={{ padding: "16px" }}>
          {/* Formulaire nouveau rappel */}
          <div style={{ background: "var(--soft)", border: "1px solid var(--border)", borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: ".8rem", marginBottom: 10, color: "var(--muted)" }}>Nouveau rappel</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input value={reEmojiVal} onChange={(e) => setReEmojiVal(e.target.value)} style={{ ...inputStyle, width: 56, textAlign: "center", fontSize: "1.2rem", background: "var(--surface)" }} />
              <input
                value={rt}
                onChange={(e) => setRt(e.target.value)}
                placeholder="Titre du rappel…"
                style={{ ...inputStyle, flex: 1, background: "var(--surface)" }}
                onKeyDown={(e) => { if (e.key === "Enter" && rt.trim()) submitReminder(); }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <select value={reDayVal} onChange={(e) => setReDayVal(e.target.value)} style={{ ...inputStyle, flex: 1, background: "var(--surface)" }}>
                {DAYS_F.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
              <input type="time" value={reTime} onChange={(e) => setReTime(e.target.value)} style={{ ...inputStyle, flex: 1, background: "var(--surface)" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <input type="date" value={reDate} onChange={(e) => setReDate(e.target.value)} style={{ ...inputStyle, flex: 1, background: "var(--surface)", fontSize: ".78rem" }} />
              <span style={{ fontSize: ".68rem", color: "var(--muted2)", whiteSpace: "nowrap" }}>Date précise</span>
            </div>
            <button onClick={submitReminder} style={{ ...primaryBtn, width: "100%" }}>
              <Icon name="plus" size={16} sw={2.2} /> Ajouter le rappel
            </button>
          </div>

          {/* Liste des rappels groupés par jour */}
          {reminders.length === 0 ? <Empty iconName="bell" text="Aucun rappel configuré" /> :
            DAYS_F.map((d, i) => {
              const dr = reminders.filter((r) => r.day === i as DayIndex);
              if (dr.length === 0) return null;
              return (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: ".68rem", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>{d}</div>
                  {dr.map((r) => (
                    <div key={r.id} style={{ background: "var(--violet-bg)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                      <span style={{ fontSize: "1.3rem" }}>{r.emoji}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: ".875rem", color: "var(--text)" }}>{r.title}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
                          {r.time && <span style={{ fontSize: ".7rem", color: "var(--violet)" }}>{r.time}</span>}
                          {r.date && <span style={{ fontSize: ".7rem", color: "var(--violet)", fontWeight: 600 }}>📅 {r.date}</span>}
                        </div>
                      </div>
                      <button onClick={() => deleteRem(r.id)} style={{ background: "none", border: "none", color: "var(--violet)", cursor: "pointer", padding: 5, display: "flex", opacity: 0.6 }}>
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })
          }
        </div>
      )}

      {editingTask && (
        <EditTaskModal task={editingTask} members={members} rooms={rooms} onSave={updateTask} onClose={() => setEditingTask(null)} />
      )}
    </div>
  );
}
