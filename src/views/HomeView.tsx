import { useMemo, useRef, useState, useCallback } from "react";
import type { ViewProps, Task, DayIndex } from "../types";
import { Icon } from "../components/ui/Icon";
import { HomeTaskCard } from "../components/tasks/HomeTaskCard";
import { EditTaskModal } from "../components/tasks/EditTaskModal";
import { TaskForm } from "../components/tasks/TaskForm";
import { todayIdx, isWeekend, isTaskDoneOn, getFrenchHolidays, getVacation, dateKey, toDateStr } from "../lib/utils";
import { DAYS_S, DAYS_F, MONTHS } from "../lib/constants";
import { navBtn } from "../styles";

export function HomeView({ members, tasks, rooms, selDay, setSelDay, weekOff, setWeekOff, toggleTask, deleteTask, addTask, updateTask, weekendWarn }: ViewProps) {
  const today = todayIdx();

  // Recompute only when weekOff changes (avoids re-allocating Date objects every render).
  const { dates, month, baseMonday } = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - today + weekOff * 7);
    const dates = DAYS_S.map((_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d.getDate(); });
    const month = MONTHS[start.getMonth()];
    const bm = new Date();
    bm.setDate(bm.getDate() - today + weekOff * 7);
    bm.setHours(0, 0, 0, 0);
    return { dates, month, baseMonday: bm };
  }, [today, weekOff]);

  const getWeekDate = useCallback(
    (i: number) => { const d = new Date(baseMonday); d.setDate(baseMonday.getDate() + i); return d; },
    [baseMonday],
  );

  const [addFor,      setAddFor]      = useState<DayIndex | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  // Astuce swipe affichée tant que l'utilisateur ne l'a pas fermée (persisté).
  const [showSwipeHint, setShowSwipeHint] = useState(() => {
    try { return localStorage.getItem("fp-swipe-hint-seen") !== "1"; } catch { return false; }
  });
  const dismissSwipeHint = () => {
    setShowSwipeHint(false);
    try { localStorage.setItem("fp-swipe-hint-seen", "1"); } catch { /* private mode */ }
  };
  const [counterPopup, setCounterPopup] = useState<{ day: DayIndex; items: Task[]; dateStr: string } | null>(null);

  // ── Swipe pour changer de semaine ─────────────────────────────────────────
  const swipeTouchStart = useRef<{ x: number; y: number } | null>(null);
  const onSwipeTouchStart = (e: React.TouchEvent) => {
    swipeTouchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onSwipeTouchEnd = (e: React.TouchEvent) => {
    if (!swipeTouchStart.current) return;
    const dx = e.changedTouches[0].clientX - swipeTouchStart.current.x;
    const dy = e.changedTouches[0].clientY - swipeTouchStart.current.y;
    swipeTouchStart.current = null;
    // Ne déclencher que si horizontal > vertical (évite les conflits avec le scroll)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      setWeekOff(dx < 0 ? weekOff + 1 : weekOff - 1);
    }
  };

  // Filtre les tâches pour un jour donné (prend en compte la date précise pour les tâches "once")
  const dayItems = (d: DayIndex) => {
    const dateStr = toDateStr(getWeekDate(d));
    return tasks.filter((t) => {
      if (t.recurrence !== "once") return t.day === d;
      if (t.dueDate) return t.dueDate === dateStr;
      return t.day === d;
    });
  };

  // Nombre de tâches "faites" pour un jour (prend en compte doneDates)
  const doneCnt = (d: DayIndex) => {
    const dateStr = toDateStr(getWeekDate(d));
    return dayItems(d).filter((t) => isTaskDoneOn(t, dateStr)).length;
  };

  const seen = new Set<DayIndex>();
  const agenda: DayIndex[] = [];
  const push = (d: DayIndex) => { if (!seen.has(d)) { seen.add(d); agenda.push(d); } };
  push(selDay);
  if (selDay !== today && weekOff === 0) push(today);
  for (let i = 0; i < 7; i++) { const d = ((today + i) % 7) as DayIndex; if (dayItems(d).length) push(d); }

  const weTasks = [...dayItems(5), ...dayItems(6)];
  const weDate5 = toDateStr(getWeekDate(5));
  const weDate6 = toDateStr(getWeekDate(6));
  const weDone  = [
    ...dayItems(5).filter((t) => isTaskDoneOn(t, weDate5)),
    ...dayItems(6).filter((t) => isTaskDoneOn(t, weDate6)),
  ].length;

  return (
    <div
      style={{ animation: "fadeUp .35s ease" }}
      onTouchStart={onSwipeTouchStart}
      onTouchEnd={onSwipeTouchEnd}
    >
      {/* Gradient header with embedded week strip */}
      <div className="fp-home-header">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: ".7rem", fontWeight: 700, color: "var(--accent)", letterSpacing: ".5px", marginBottom: 3, textTransform: "uppercase" }}>
              {month} · Sem. {weekOff === 0 ? "courante" : weekOff > 0 ? "+" + weekOff : weekOff}
            </div>
            <h1 style={{ fontWeight: 900, fontSize: "1.35rem", lineHeight: 1, color: "var(--text)" }}>
              Bonjour ! 👋
            </h1>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button aria-label="Semaine précédente" onClick={() => setWeekOff(weekOff - 1)} style={navBtn}><Icon name="chevronLeft" size={16} /></button>
            {weekOff !== 0 && (
              <button onClick={() => setWeekOff(0)} style={{ ...navBtn, fontSize: ".7rem", fontWeight: 700, padding: "0 10px", width: "auto" }}>Auj.</button>
            )}
            <button aria-label="Semaine suivante" onClick={() => setWeekOff(weekOff + 1)} style={navBtn}><Icon name="chevronRight" size={16} /></button>
          </div>
        </div>

        {/* Week strip embedded in header */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3 }}>
          {DAYS_S.map((_, i) => {
            const d = i as DayIndex;
            const isTd = d === today && weekOff === 0, isSel = d === selDay, isWe = isWeekend(d);
            const cnt = dayItems(d).length, dc = doneCnt(d);
            const wd = getWeekDate(i);
            const wdHol = getFrenchHolidays(wd.getFullYear()).get(dateKey(wd));
            const wdVac = getVacation(wd);
            return (
              <button key={i} aria-label={`${DAYS_F[d]} ${dates[i]}`} aria-pressed={isSel} onClick={() => setSelDay(d)} style={{ border: "none", background: "none", cursor: "pointer", textAlign: "center", padding: "4px 1px" }}>
                <div style={{ fontSize: ".58rem", fontWeight: 800, color: isWe ? "var(--warn)" : "var(--muted2)", marginBottom: 3, textTransform: "uppercase" }}>{DAYS_S[i]}</div>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, margin: "0 auto",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isSel ? "var(--accent)" : isTd ? "var(--accent-bg)" : "transparent",
                  fontWeight: isSel || isTd ? 900 : 600,
                  fontSize: ".9rem",
                  color: isSel ? "white" : isTd ? "var(--accent)" : "var(--text)",
                  transition: "all .2s",
                }}>
                  {dates[i]}
                </div>
                {cnt > 0 && (
                  <div style={{ marginTop: 3, display: "flex", justifyContent: "center" }}>
                    <div style={{ height: 3, borderRadius: 99, background: dc === cnt ? "var(--green)" : "var(--accent)", width: Math.min(24, cnt * 6) + "%", minWidth: 6, opacity: isSel ? 0.9 : 0.5 }} />
                  </div>
                )}
                {(wdHol || wdVac) && <div style={{ width: 4, height: 4, borderRadius: "50%", background: wdHol ? "var(--danger)" : (wdVac?.color ?? "#888"), marginTop: 1, margin: "1px auto 0" }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats row */}
      {(() => {
        // Count tasks over the visible week
        const weekTasks: { task: Task; dateStr: string }[] = [];
        for (let i = 0; i < 7; i++) {
          const d = i as DayIndex;
          dayItems(d).forEach((t) => weekTasks.push({ task: t, dateStr: toDateStr(getWeekDate(i)) }));
        }
        const totalTodo   = weekTasks.filter(({ task: t, dateStr }) => !isTaskDoneOn(t, dateStr)).length;
        const totalDone   = weekTasks.filter(({ task: t, dateStr }) =>  isTaskDoneOn(t, dateStr)).length;
        const totalUrgent = weekTasks.filter(({ task: t, dateStr }) => t.priority === "high" && !isTaskDoneOn(t, dateStr)).length;
        const stats = [
          { value: totalTodo,   label: "À faire",  color: "var(--violet)"  },
          { value: totalDone,   label: "Faites",   color: "var(--green)"   },
          { value: totalUrgent, label: "Urgentes", color: "var(--accent)"  },
        ];
        return (
          <div style={{ display: "flex", gap: 8, padding: "14px 16px 20px" }}>
            {stats.map((s) => (
              <div key={s.label} style={{
                flex: 1, borderRadius: 20, padding: "13px 10px", textAlign: "center",
                background: "var(--surface)", border: "1px solid var(--card-border)", boxShadow: "var(--card-shadow)",
              }}>
                <div style={{ fontSize: "1.6rem", fontWeight: 900, letterSpacing: -1, color: s.color, lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: s.color, opacity: .7, marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Alerte weekend */}
      {weekendWarn && weekOff === 0 && (
        <div style={{ margin: "0 16px 8px", background: "var(--warn-bg)", border: "1px solid var(--warn)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="alert" size={18} color="var(--warn)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: ".82rem", fontWeight: 700, color: "var(--text)" }}>Weekend chargé !</div>
            <div style={{ fontSize: ".7rem", color: "var(--muted)" }}>{weTasks.length - weDone} tâches restantes Sam-Dim</div>
          </div>
        </div>
      )}

      {/* Agenda */}
      <div style={{ padding: "0 16px" }}>
        {showSwipeHint && tasks.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--accent-bg)", border: "1px dashed var(--accent)", borderRadius: 12, padding: "8px 12px", marginBottom: 12 }}>
            <Icon name="chevronRight" size={13} color="var(--accent)" sw={2.5} />
            <span style={{ flex: 1, fontSize: ".72rem", fontWeight: 600, color: "var(--text)" }}>
              Astuce : glissez une tâche vers la droite pour la valider
            </span>
            <button aria-label="Fermer l'astuce" onClick={dismissSwipeHint} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent)", padding: 2, display: "flex" }}>
              <Icon name="x" size={13} sw={2.5} />
            </button>
          </div>
        )}
        {agenda.map((dayIdx) => {
          const items   = dayItems(dayIdx);
          const dateStr = toDateStr(getWeekDate(dayIdx));
          const doneItems = items.filter((t) => isTaskDoneOn(t, dateStr));
          const isToday = dayIdx === today && weekOff === 0, isSel = dayIdx === selDay;
          const lc = isToday ? "var(--accent)" : isWeekend(dayIdx) ? "var(--warn)" : "var(--muted2)";
          return (
            <div key={dayIdx} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: ".68rem", fontWeight: 800, color: lc, letterSpacing: ".6px", textTransform: "uppercase" }}>
                  {isToday ? "AUJOURD'HUI · " : ""}{DAYS_F[dayIdx].toUpperCase()} {dates[dayIdx]}
                  {isWeekend(dayIdx) && <span style={{ marginLeft: 6 }}>🏡</span>}
                </span>
                {/* Compteur cliquable → popup */}
                <span
                  onClick={() => items.length > 0 && setCounterPopup({ day: dayIdx, items, dateStr })}
                  style={{ fontSize: ".65rem", color: "var(--muted2)", fontWeight: 600, cursor: items.length > 0 ? "pointer" : "default", padding: "2px 6px", borderRadius: 99, background: items.length > 0 ? "var(--soft)" : "transparent" }}
                >
                  {doneItems.length}/{items.length} ✓
                </span>
              </div>

              {items.length === 0
                ? <div style={{ padding: "4px 0 8px", color: "var(--muted2)", fontSize: ".78rem", fontStyle: "italic" }}>Journée libre 😌</div>
                : items.map((t) => (
                  <HomeTaskCard
                    key={t.id}
                    task={t}
                    members={members}
                    rooms={rooms}
                    dateStr={dateStr}
                    onToggle={toggleTask}
                    onDelete={deleteTask}
                    onEdit={setEditingTask}
                  />
                ))
              }

              {isSel && (
                addFor === dayIdx ? (
                  <div style={{ marginTop: 8 }}>
                    <TaskForm
                      members={members}
                      rooms={rooms}
                      fixedDay={dayIdx}
                      fixedDate={dateStr}
                      showRecurrence={false}
                      placeholder={`Tâche pour ${DAYS_F[dayIdx]}…`}
                      onSubmit={(t) => { addTask(t); setAddFor(null); }}
                      onCancel={() => setAddFor(null)}
                    />
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
            <Icon name="sun" size={16} color="var(--warn)" />
            <span style={{ fontWeight: 700, fontSize: ".82rem", color: "var(--text)" }}>Bilan week-end</span>
            <span style={{ marginLeft: "auto", fontSize: ".72rem", fontWeight: 700, color: "var(--muted2)" }}>{weDone}/{weTasks.length} faites</span>
          </div>
          <div style={{ height: 6, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", width: weTasks.length ? `${Math.round(weDone / weTasks.length * 100)}%` : "0%", background: weekendWarn ? "var(--warn)" : "var(--green)", transition: "width .6s ease", borderRadius: 99 }} />
          </div>
          {weekendWarn && <div style={{ fontSize: ".7rem", color: "var(--warn)", marginTop: 6, fontWeight: 600 }}>💡 Déplacez certaines tâches en semaine</div>}
        </div>
      </div>

      {/* Popup compteur de tâches */}
      {counterPopup && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "flex-end" }}
          onClick={() => setCounterPopup(null)}
        >
          <div
            style={{ width: "100%", background: "var(--bg)", borderRadius: "20px 20px 0 0", padding: "20px 16px 40px", maxHeight: "70vh", overflowY: "auto", animation: "fadeUp .2s ease" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ fontWeight: 800, fontSize: ".95rem" }}>
                {DAYS_F[counterPopup.day]} — {counterPopup.items.filter((t) => isTaskDoneOn(t, counterPopup.dateStr)).length}/{counterPopup.items.length} faites
              </h3>
              <button onClick={() => setCounterPopup(null)} style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="x" size={13} />
              </button>
            </div>
            {counterPopup.items.map((t) => {
              const isDone = isTaskDoneOn(t, counterPopup.dateStr);
              const m = members.find((x) => t.memberId.split(",").includes(x.id));
              const col = m?.color || "#6B7280";
              return (
                <div
                  key={t.id}
                  onClick={() => {
                    toggleTask(t.id, counterPopup.dateStr);
                    // Mettre à jour le popup localement pour feedback immédiat
                    setCounterPopup((p) => p ? { ...p } : null);
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--soft)", borderRadius: 12, marginBottom: 8, cursor: "pointer", opacity: isDone ? 0.5 : 1, borderLeft: `3px solid ${col}` }}
                >
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${isDone ? col : col + "50"}`, background: isDone ? col : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {isDone && <Icon name="check" size={10} color="white" sw={3} />}
                  </div>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: ".85rem", textDecoration: isDone ? "line-through" : "none", color: col }}>{t.name}</span>
                  {m && <span style={{ fontSize: "1rem" }}>{m.emoji}</span>}
                  {t.dueTime && <span style={{ fontSize: ".7rem", color: "var(--muted2)" }}>{t.dueTime}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {editingTask && (
        <EditTaskModal task={editingTask} members={members} rooms={rooms} onSave={updateTask} onClose={() => setEditingTask(null)} />
      )}
    </div>
  );
}
