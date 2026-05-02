import { useState } from "react";
import type { ViewProps, Task, DayIndex, Priority } from "../types";
import { Icon } from "../components/ui/Icon";
import { MemberToggleBar } from "../components/ui/MemberToggleBar";
import { WorkConflictAlert } from "../components/ui/WorkConflictAlert";
import { HomeTaskCard } from "../components/tasks/HomeTaskCard";
import { EditTaskModal } from "../components/tasks/EditTaskModal";
import { todayIdx, isWeekend, getWorkConflict, getFrenchHolidays, getVacation, dateKey } from "../lib/utils";
import { DAYS_S, DAYS_F, MONTHS } from "../lib/constants";
import { inputStyle, primaryBtn, ghostBtn, navBtn } from "../styles";

export function HomeView({ members, tasks, rooms, selDay, setSelDay, weekOff, setWeekOff, toggleTask, deleteTask, addTask, updateTask, weekendWarn }: ViewProps) {
  const today = todayIdx();
  const start = new Date();
  start.setDate(start.getDate() - today + weekOff * 7);
  const dates = DAYS_S.map((_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d.getDate(); });
  const month = MONTHS[new Date(start).getMonth()];
  const baseMonday = (() => { const d = new Date(); d.setDate(d.getDate() - todayIdx() + weekOff * 7); d.setHours(0, 0, 0, 0); return d; })();
  const getWeekDate = (i: number) => { const d = new Date(baseMonday); d.setDate(baseMonday.getDate() + i); return d; };

  const [addFor,     setAddFor]     = useState<DayIndex | null>(null);
  const [inName,     setInName]     = useState("");
  const [inMembers,  setInMembers]  = useState<string[]>([]);
  const [inRoom,     setInRoom]     = useState("r-general");
  const [inPrio,     setInPrio]     = useState<Priority>("med");
  const [inTime,     setInTime]     = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const conflict = getWorkConflict(inMembers.join(","), addFor ?? 0, inTime, members);

  const submitInline = (day: DayIndex) => {
    if (!inName.trim() || conflict) return;
    addTask({ id: "t" + Date.now(), name: inName.trim(), memberId: inMembers.join(","), roomId: inRoom, day, priority: inPrio, recurrence: "once", done: false, dueTime: inTime || undefined });
    setInName(""); setInMembers([]); setInRoom("r-general"); setInPrio("med"); setInTime(""); setAddFor(null);
  };

  const dayItems = (d: DayIndex) => tasks.filter((t) => t.day === d);
  const seen = new Set<DayIndex>();
  const agenda: DayIndex[] = [];
  const push = (d: DayIndex) => { if (!seen.has(d)) { seen.add(d); agenda.push(d); } };
  push(selDay);
  if (selDay !== today && weekOff === 0) push(today);
  for (let i = 0; i < 7; i++) { const d = ((today + i) % 7) as DayIndex; if (dayItems(d).length) push(d); }

  const weTasks = tasks.filter((t) => isWeekend(t.day));
  const weDone = weTasks.filter((t) => t.done).length;

  return (
    <div style={{ animation: "fadeUp .35s ease" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="home" size={18} color="white" sw={2} />
          </div>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: "1.25rem", lineHeight: 1 }}>{month}</h1>
            <div style={{ fontSize: ".65rem", color: "var(--muted)", marginTop: 2 }}>
              Semaine {weekOff === 0 ? "courante" : weekOff > 0 ? "+" + weekOff : weekOff}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setWeekOff(weekOff - 1)} style={navBtn}><Icon name="chevronLeft" size={16} /></button>
          {weekOff !== 0 && (
            <button onClick={() => setWeekOff(0)} style={{ ...navBtn, fontSize: ".7rem", fontWeight: 700, padding: "0 10px", width: "auto" }}>Auj.</button>
          )}
          <button onClick={() => setWeekOff(weekOff + 1)} style={navBtn}><Icon name="chevronRight" size={16} /></button>
        </div>
      </div>

      {/* Alerte weekend */}
      {weekendWarn && weekOff === 0 && (
        <div style={{ margin: "0 16px 8px", background: "var(--warn-bg)", border: "1px solid #FDE68A", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="alert" size={18} color="#D97706" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: ".82rem", fontWeight: 700, color: "#92400E" }}>Weekend chargé !</div>
            <div style={{ fontSize: ".7rem", color: "#B45309" }}>{weTasks.length - weDone} tâches restantes Sam-Dim</div>
          </div>
        </div>
      )}

      {/* Bande semaine */}
      <div style={{ padding: "4px 10px 12px", display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2 }}>
        {DAYS_S.map((_, i) => {
          const d = i as DayIndex;
          const isTd = d === today && weekOff === 0, isSel = d === selDay, isWe = isWeekend(d);
          const cnt = dayItems(d).length, doneCnt = dayItems(d).filter((t) => t.done).length;
          const wd = getWeekDate(i);
          const wdHol = getFrenchHolidays(wd.getFullYear()).get(dateKey(wd));
          const wdVac = getVacation(wd);
          return (
            <button key={i} onClick={() => setSelDay(d)} style={{ border: "none", background: "none", cursor: "pointer", textAlign: "center", padding: "4px 2px" }}>
              <div style={{ fontSize: ".58rem", fontWeight: 700, color: isWe ? "var(--warn)" : "var(--muted2)", marginBottom: 3, textTransform: "uppercase" }}>{DAYS_S[i]}</div>
              <div style={{ width: 34, height: 34, borderRadius: "50%", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", background: isSel ? "var(--text)" : isTd ? "#F3F4F6" : "transparent", fontWeight: isSel || isTd ? 800 : 500, fontSize: ".95rem", color: isSel ? "white" : "var(--text)", transition: "all .2s" }}>
                {dates[i]}
              </div>
              {cnt > 0 && (
                <div style={{ marginTop: 3, display: "flex", justifyContent: "center" }}>
                  <div style={{ height: 3, borderRadius: 99, background: doneCnt === cnt ? "var(--green)" : "var(--accent)", width: Math.min(24, cnt * 6) + "%", minWidth: 6, opacity: isSel ? 0.9 : 0.5 }} />
                </div>
              )}
              {(wdHol || wdVac) && <div style={{ width: 4, height: 4, borderRadius: "50%", background: wdHol ? "#DC2626" : (wdVac?.color ?? "#888"), marginTop: 1, margin: "1px auto 0" }} />}
            </button>
          );
        })}
      </div>

      {/* Agenda */}
      <div style={{ padding: "0 16px" }}>
        {agenda.map((dayIdx) => {
          const items = dayItems(dayIdx);
          const isToday = dayIdx === today && weekOff === 0, isSel = dayIdx === selDay;
          const lc = isToday ? "var(--accent)" : isWeekend(dayIdx) ? "var(--warn)" : "var(--muted2)";
          return (
            <div key={dayIdx} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: ".68rem", fontWeight: 800, color: lc, letterSpacing: ".6px", textTransform: "uppercase" }}>
                  {isToday ? "AUJOURD'HUI · " : ""}{DAYS_F[dayIdx].toUpperCase()} {dates[dayIdx]}
                  {isWeekend(dayIdx) && <span style={{ marginLeft: 6 }}>🏡</span>}
                </span>
                <span style={{ fontSize: ".65rem", color: "var(--muted2)", fontWeight: 600 }}>{items.filter((t) => t.done).length}/{items.length} ✓</span>
              </div>

              {items.length === 0
                ? <div style={{ padding: "4px 0 8px", color: "var(--muted2)", fontSize: ".78rem", fontStyle: "italic" }}>Journée libre 😌</div>
                : items.map((t) => (
                  <HomeTaskCard key={t.id} task={t} members={members} rooms={rooms} onToggle={toggleTask} onDelete={deleteTask} onEdit={setEditingTask} />
                ))
              }

              {isSel && (
                addFor === dayIdx ? (
                  <div style={{ background: "var(--soft)", border: "1.5px solid var(--border)", borderRadius: 14, padding: 14, marginTop: 8, animation: "fadeUp .2s ease" }}>
                    <input
                      autoFocus
                      value={inName}
                      onChange={(e) => setInName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !conflict && submitInline(dayIdx)}
                      placeholder={`Tâche pour ${DAYS_F[dayIdx]}…`}
                      style={{ ...inputStyle, marginBottom: 8, background: "white" }}
                    />
                    <MemberToggleBar members={members} selected={inMembers} onChange={setInMembers} />
                    <div style={{ marginBottom: 8 }}>
                      <input type="time" value={inTime} onChange={(e) => setInTime(e.target.value)} style={{ ...inputStyle, background: "white" }} />
                    </div>
                    <WorkConflictAlert conflict={conflict} />
                    <select value={inRoom} onChange={(e) => setInRoom(e.target.value)} style={{ ...inputStyle, marginBottom: 8, background: "white" }}>
                      {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                      {(["low", "med", "high"] as Priority[]).map((p) => {
                        const c = { low: { label: "Faible", color: "#16A34A", bg: "#DCFCE7" }, med: { label: "Normal", color: "#CA8A04", bg: "#FEF9C3" }, high: { label: "Urgent", color: "#DC2626", bg: "#FEE2E2" } }[p];
                        return <button key={p} onClick={() => setInPrio(p)} style={{ flex: 1, padding: "7px 4px", border: `1.5px solid ${inPrio === p ? c.color : "var(--border)"}`, borderRadius: 8, background: inPrio === p ? c.bg : "white", color: inPrio === p ? c.color : "var(--muted)", fontSize: ".7rem", fontWeight: 700, cursor: "pointer" }}>{c.label}</button>;
                      })}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => submitInline(dayIdx)}
                        disabled={!!conflict}
                        style={{ ...primaryBtn, flex: 1, padding: "9px 16px", fontSize: ".82rem", opacity: conflict ? 0.6 : 1, cursor: conflict ? "not-allowed" : "pointer" }}
                      >
                        {conflict ? "⚠️ Conflit" : "Ajouter ✓"}
                      </button>
                      <button onClick={() => setAddFor(null)} style={{ ...ghostBtn, padding: "9px 16px", fontSize: ".82rem" }}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddFor(dayIdx)}
                    style={{ width: "100%", padding: "10px", background: "var(--soft)", border: "1.5px dashed var(--border)", borderRadius: 12, color: "var(--muted)", fontSize: ".8rem", fontWeight: 600, cursor: "pointer", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <Icon name="plus" size={14} sw={2.5} /> Ajouter à {DAYS_F[dayIdx]}
                  </button>
                )
              )}
            </div>
          );
        })}

        {/* Bilan weekend */}
        <div style={{ background: "var(--soft)", borderRadius: 14, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Icon name="sun" size={16} color="#D97706" />
            <span style={{ fontWeight: 700, fontSize: ".82rem", color: "#92400E" }}>Bilan week-end</span>
            <span style={{ marginLeft: "auto", fontSize: ".72rem", fontWeight: 700, color: "var(--muted2)" }}>{weDone}/{weTasks.length} faites</span>
          </div>
          <div style={{ height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: weTasks.length ? `${Math.round(weDone / weTasks.length * 100)}%` : "0%", background: weekendWarn ? "var(--warn)" : "var(--green)", transition: "width .6s ease", borderRadius: 99 }} />
          </div>
          {weekendWarn && <div style={{ fontSize: ".7rem", color: "var(--warn)", marginTop: 6, fontWeight: 600 }}>💡 Déplacez certaines tâches en semaine</div>}
        </div>
      </div>

      {editingTask && (
        <EditTaskModal task={editingTask} members={members} rooms={rooms} onSave={updateTask} onClose={() => setEditingTask(null)} />
      )}
    </div>
  );
}
