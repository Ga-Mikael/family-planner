import { useMemo, useRef, useState } from "react";
import type { ViewProps, Task, DayIndex } from "../types";
import { Icon } from "../components/ui/Icon";
import { EditTaskModal } from "../components/tasks/EditTaskModal";
import { TaskForm } from "../components/tasks/TaskForm";
import { parseMemberIds, isTaskDoneOn, getFrenchHolidays, getVacation, dateKey, toDateStr } from "../lib/utils";
import { DAYS_F, MONTHS, PRIORITY_CONFIG, RECURRENCE_CONFIG } from "../lib/constants";
import { navBtn } from "../styles";

export function AgendaView({ tasks, members, rooms, addTask, updateTask, toggleTask }: ViewProps) {
  // Stable per-render `today` (keeps mount-time, avoids time-drift mid-session affecting layout).
  const today = useMemo(() => new Date(), []);
  const [viewDate,    setViewDate]    = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [detailDay,   setDetailDay]   = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Compteurs : section expandée en bas (null = fermé)
  const [expandedStat, setExpandedStat] = useState<"all" | "done" | "urgent" | null>(null);

  // Swipe pour changer de mois
  const monthSwipeStart = useRef<{ x: number; y: number } | null>(null);
  const onMonthTouchStart = (e: React.TouchEvent) => {
    monthSwipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onMonthTouchEnd = (e: React.TouchEvent) => {
    if (!monthSwipeStart.current) return;
    const dx = e.changedTouches[0].clientX - monthSwipeStart.current.x;
    const dy = e.changedTouches[0].clientY - monthSwipeStart.current.y;
    monthSwipeStart.current = null;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      setViewDate(new Date(year, dx < 0 ? month + 1 : month - 1, 1));
      setDetailDay(null);
    }
  };

  // Swipe par tâche dans le panneau détail
  const swipeStartX  = useRef<Record<string, number>>({});
  const [swipeMap, setSwipeMap] = useState<Record<string, number>>({});

  const onTaskTouchStart = (id: string, e: React.TouchEvent) => {
    swipeStartX.current[id] = e.touches[0].clientX;
  };
  const onTaskTouchMove = (id: string, e: React.TouchEvent) => {
    const start = swipeStartX.current[id];
    if (start === undefined) return;
    const delta = e.touches[0].clientX - start;
    if (delta > 0) setSwipeMap((p) => ({ ...p, [id]: Math.min(delta, 85) }));
  };
  const onTaskTouchEnd = (id: string) => {
    const offset = swipeMap[id] ?? 0;
    if (offset > 60) toggleTask(id, selDateStr);
    setSwipeMap((p) => ({ ...p, [id]: 0 }));
    delete swipeStartX.current[id];
  };

  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstMon = (() => { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1; })();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Pré-calcule la liste des tâches de chaque jour du mois en un seul passage.
  // Avant : tasksByDom(dom) refiltrait tout `tasks` pour chacune des ~30 cellules.
  const tasksPerDom = useMemo(() => {
    const map = new Map<number, Task[]>();
    for (let dom = 1; dom <= daysInMonth; dom++) {
      const date = new Date(year, month, dom);
      const dow = (date.getDay() === 0 ? 6 : date.getDay() - 1) as DayIndex;
      const dateStr = toDateStr(date);
      map.set(dom, tasks.filter((t) => {
        if (t.recurrence !== "once") return t.day === dow;
        if (t.dueDate) return t.dueDate === dateStr;
        return t.day === dow;
      }));
    }
    return map;
  }, [tasks, year, month, daysInMonth]);

  const tasksByDom = (dom: number) => tasksPerDom.get(dom) ?? [];

  const selDow     = detailDay ? ((new Date(year, month, detailDay).getDay() === 0 ? 6 : new Date(year, month, detailDay).getDay() - 1) as DayIndex) : null;
  const selTasks   = detailDay !== null && selDow !== null ? tasksByDom(detailDay) : [];
  const selDateStr = detailDay !== null ? toDateStr(new Date(year, month, detailDay)) : "";

  // Tâches du mois + compteurs, dérivés du même pré-calcul.
  const { statItems, monthTasks } = useMemo(() => {
    const ids = new Set<string>();
    tasksPerDom.forEach((list) => list.forEach((t) => ids.add(t.id)));
    const monthTasks = tasks.filter((t) => ids.has(t.id));

    const monthPrefix = `${year}-${String(month + 1).padStart(2, "0")}-`;
    const doneTasks = monthTasks.filter((t) =>
      t.recurrence === "once"
        ? t.done
        : (t.doneDates ?? []).some((d) => d.startsWith(monthPrefix))
    );
    const urgentTasks = monthTasks.filter(
      (t) => t.priority === "high" && !t.done && !(t.doneDates ?? []).some((d) => d.startsWith(monthPrefix))
    );
    return {
      monthTasks,
      statItems: { all: monthTasks, done: doneTasks, urgent: urgentTasks } as Record<string, Task[]>,
    };
  }, [tasksPerDom, tasks, year, month]);

  return (
    <div
      style={{ animation: "fadeUp .35s ease" }}
      onTouchStart={onMonthTouchStart}
      onTouchEnd={onMonthTouchEnd}
    >
      {/* Header gradient */}
      <div className="fp-agenda-header">
        {/* Row: nav + month title */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 14 }}>
          <button
            aria-label="Mois précédent"
            onClick={() => { setViewDate(new Date(year, month - 1, 1)); setDetailDay(null); }}
            style={{ ...navBtn, width: 36, height: 36, borderRadius: 99, background: "rgba(255,255,255,.6)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
          >
            <Icon name="chevronLeft" size={16} />
          </button>

          <div style={{ textAlign: "center", flex: 1 }}>
            {/* Today chip — clickable, jumps to today */}
            {isCurrentMonth ? (
              <button
                aria-label="Aller à aujourd'hui"
                onClick={() => { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)); setDetailDay(today.getDate()); }}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "var(--accent-bg)", border: "1px solid var(--accent)", borderRadius: 99, padding: "3px 10px", marginBottom: 7, cursor: "pointer" }}
              >
                <span aria-hidden="true" style={{ fontSize: ".7rem", lineHeight: 1 }}>✨</span>
                <span style={{ fontSize: ".62rem", fontWeight: 800, color: "var(--accent)", textTransform: "uppercase", letterSpacing: ".5px" }}>
                  Aujourd'hui · {DAYS_F[(today.getDay() === 0 ? 6 : today.getDay() - 1) as DayIndex].slice(0, 3)}. {today.getDate()}
                </span>
              </button>
            ) : (
              <button
                aria-label="Revenir au mois courant"
                onClick={() => { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)); setDetailDay(today.getDate()); }}
                style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.55)", border: "1px solid var(--border)", borderRadius: 99, padding: "3px 10px", marginBottom: 7, cursor: "pointer" }}
              >
                <Icon name="chevronLeft" size={11} color="var(--muted)" />
                <span style={{ fontSize: ".62rem", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px" }}>
                  Retour à aujourd'hui
                </span>
              </button>
            )}
            <h1 style={{ fontWeight: 900, fontSize: "1.65rem", lineHeight: 1, color: "var(--text)", letterSpacing: "-.5px" }}>
              {MONTHS[month]}{" "}
              <span style={{ color: "var(--muted2)", fontWeight: 400, fontSize: "1.3rem" }}>{year}</span>
            </h1>
          </div>

          <button
            aria-label="Mois suivant"
            onClick={() => { setViewDate(new Date(year, month + 1, 1)); setDetailDay(null); }}
            style={{ ...navBtn, width: 36, height: 36, borderRadius: 99, background: "rgba(255,255,255,.6)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
          >
            <Icon name="chevronRight" size={16} />
          </button>
        </div>

        {/* Barre progression du mois */}
        <div
          role="progressbar"
          aria-label="Progression du mois"
          aria-valuenow={Math.round((today.getDate() / daysInMonth) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ height: 3, borderRadius: 99, background: "rgba(0,0,0,.08)", overflow: "hidden" }}
        >
          <div
            className="fp-agenda-progress"
            style={{ height: "100%", borderRadius: 99, background: "linear-gradient(90deg, var(--violet), var(--accent))", width: `${Math.min(100, (today.getDate() / daysInMonth) * 100)}%`, transition: "width .4s ease" }}
          />
        </div>
      </div>

      {/* Calendrier card flottante — chevauchement avec le gradient */}
      <div style={{ padding: "0 16px", marginTop: -14 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--card-border)", boxShadow: "0 8px 28px rgba(0,0,0,.08)", borderRadius: 26, padding: "20px 16px 18px", backdropFilter: "var(--card-blur, none)", WebkitBackdropFilter: "var(--card-blur, none)" }}>
        {/* En-têtes jours */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 12 }}>
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d, i) => (
            <div key={i} style={{ textAlign: "center", fontSize: ".62rem", fontWeight: 800, color: i >= 5 ? "var(--warn)" : "var(--muted2)", padding: "4px 0", textTransform: "uppercase", letterSpacing: ".4px" }}>{d}</div>
          ))}
        </div>

        {/* Grille calendrier */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5, marginBottom: 0 }}>
          {Array.from({ length: firstMon }).map((_, i) => <div key={"e" + i} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dom = i + 1;
            const date = new Date(year, month, dom);
            const dow = (date.getDay() === 0 ? 6 : date.getDay() - 1) as DayIndex;
            const isToday = isCurrentMonth && dom === today.getDate(), isSel = detailDay === dom, isWe = dow >= 5;
            const dtl     = tasksByDom(dom);
            const domStr  = toDateStr(new Date(year, month, dom));
            const doneAll = dtl.length > 0 && dtl.every((t) => isTaskDoneOn(t, domStr));
            const hasHigh = dtl.some((t) => t.priority === "high" && !isTaskDoneOn(t, domStr));
            const dotColors = [...new Set(dtl.flatMap((t) => parseMemberIds(t.memberId).map((id) => members.find((m) => m.id === id)?.color).filter(Boolean) as string[]))].slice(0, 3) as string[];
            const holiday = getFrenchHolidays(year).get(dateKey(date));
            const vac = getVacation(date);
            return (
              <button
                key={dom}
                onClick={() => { setDetailDay(isSel ? null : dom); setExpandedStat(null); }}
                style={{ border: `1.5px solid ${isSel ? "var(--text)" : isToday ? "var(--accent)" : "transparent"}`, borderRadius: 12, padding: "10px 2px 9px", background: isSel ? "var(--text)" : isToday ? "var(--accent-bg)" : "transparent", cursor: "pointer", textAlign: "center", transition: "all .15s", position: "relative", minHeight: 44 }}
              >
                <div style={{ fontSize: "1rem", fontWeight: isToday || isSel ? 800 : 500, color: isSel ? "var(--bg)" : isToday ? "var(--accent)" : isWe ? "var(--warn)" : "var(--text)", lineHeight: 1.1 }}>{dom}</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 3, marginTop: 5, minHeight: 5 }}>
                  {dtl.length === 0 ? null : doneAll
                    ? <div style={{ width: 5, height: 5, borderRadius: "50%", background: isSel ? "var(--bg)" : "var(--green)" }} />
                    : dotColors.length > 0
                      ? dotColors.map((c, ci) => <div key={ci} style={{ width: 4, height: 4, borderRadius: "50%", background: isSel ? "var(--bg)" : c }} />)
                      : <div style={{ width: 4, height: 4, borderRadius: "50%", background: isSel ? "var(--bg)" : "var(--accent)" }} />
                  }
                </div>
                {(holiday || vac) && <div style={{ width: 4, height: 4, borderRadius: "50%", background: holiday ? "#DC2626" : vac!.color, margin: "1px auto 0" }} />}
                {hasHigh && <div style={{ position: "absolute", top: 2, right: 3, width: 5, height: 5, borderRadius: "50%", background: "var(--danger)" }} />}
              </button>
            );
          })}
        </div>
        </div>{/* /calendar card */}
      </div>

      <div style={{ padding: "0 16px" }}>
        {/* Détail du jour sélectionné */}
        {detailDay && selDow !== null && (
          <div style={{ background: "var(--soft)", border: "1px solid var(--border)", borderRadius: 16, padding: 14, marginBottom: 16, animation: "fadeUp .2s ease" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: ".95rem" }}>{DAYS_F[selDow]} {detailDay} {MONTHS[month]}</div>
                <div style={{ fontSize: ".68rem", color: "var(--muted)", marginTop: 1 }}>
                  {selTasks.filter((t) => isTaskDoneOn(t, selDateStr)).length}/{selTasks.length} tâches
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setShowAddForm((f) => !f)}
                  style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: showAddForm ? "var(--text)" : "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: showAddForm ? "var(--bg)" : "var(--muted)" }}
                >
                  <Icon name="plus" size={14} sw={2.5} />
                </button>
                <button
                  onClick={() => { setDetailDay(null); setShowAddForm(false); }}
                  style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted)" }}
                >
                  <Icon name="x" size={13} />
                </button>
              </div>
            </div>

            {/* Alerte fête / vacances */}
            {(() => {
              const dt = new Date(year, month, detailDay!);
              const hol = getFrenchHolidays(year).get(dateKey(dt));
              const vac2 = getVacation(dt);
              return (hol || vac2) && (
                <div style={{ background: hol ? "#FEF2F2" : vac2!.color + "20", border: `1px solid ${hol ? "#FCA5A5" : vac2!.color + "60"}`, borderRadius: 8, padding: "5px 10px", marginBottom: 10, fontSize: ".75rem", fontWeight: 700, color: hol ? "#DC2626" : vac2!.color }}>
                  {hol ? "🎉 " + hol : vac2 && "🏖️ Vacances " + vac2.name}
                </div>
              );
            })()}

            {/* Formulaire ajout rapide */}
            {showAddForm && selDow !== null && (
              <div style={{ marginBottom: 10 }}>
                <TaskForm
                  members={members}
                  fixedDay={selDow}
                  fixedDate={selDateStr}
                  onSubmit={(t) => { addTask(t); setShowAddForm(false); }}
                  onCancel={() => setShowAddForm(false)}
                />
              </div>
            )}

            {/* Liste des tâches du jour avec swipe */}
            {selTasks.length === 0 && !showAddForm
              ? <div style={{ textAlign: "center", padding: "16px 0", color: "var(--muted2)", fontSize: ".8rem", fontStyle: "italic" }}>Aucune tâche ce jour 😌</div>
              : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {selTasks.map((t) => {
                    const tMids = parseMemberIds(t.memberId);
                    const tMs   = tMids.map((id) => members.find((x) => x.id === id)).filter(Boolean) as typeof members;
                    const tM    = tMs[0], r = rooms.find((x) => x.id === t.roomId);
                    const col   = tM?.color || r?.color || "#6B7280", pc = PRIORITY_CONFIG[t.priority];
                    const taskDone = isTaskDoneOn(t, selDateStr);
                    const swipeOff = swipeMap[t.id] ?? 0;
                    return (
                      <div
                        key={t.id}
                        style={{ position: "relative", overflow: "hidden", borderRadius: 10 }}
                        onTouchStart={(e) => onTaskTouchStart(t.id, e)}
                        onTouchMove={(e)  => onTaskTouchMove(t.id, e)}
                        onTouchEnd={()    => onTaskTouchEnd(t.id)}
                      >
                        {swipeOff > 0 && (
                          <div style={{ position: "absolute", inset: 0, background: "var(--green-bg)", display: "flex", alignItems: "center", paddingLeft: 12, opacity: Math.min(swipeOff / 60, 1), pointerEvents: "none", borderRadius: 10 }}>
                            <Icon name="check" size={16} color="var(--green)" sw={2.5} />
                          </div>
                        )}
                        <div style={{ background: "var(--surface)", borderRadius: 10, padding: "9px 12px", display: "flex", alignItems: "center", gap: 9, borderLeft: `3px solid ${col}`, opacity: taskDone ? 0.55 : 1, transform: `translateX(${swipeOff}px)`, transition: swipeOff === 0 ? "transform .2s ease" : "none" }}>
                          <div onClick={() => toggleTask(t.id, selDateStr)} style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${taskDone ? col : col + "60"}`, background: taskDone ? col : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer", transition: "all .2s" }}>
                            {taskDone && <Icon name="check" size={9} color="white" sw={3} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: ".8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: taskDone ? "line-through" : "none", color: col, opacity: taskDone ? 0.6 : 1 }}>{t.name}</div>
                            <div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 1 }}>
                              <span style={{ fontSize: ".58rem", fontWeight: 700, padding: "1px 5px", borderRadius: 99, background: pc.bg, color: pc.color }}>{pc.label}</span>
                              {r && <span style={{ fontSize: ".58rem", color: "var(--muted2)" }}>{r.name}</span>}
                              {t.dueTime && <span style={{ fontSize: ".58rem", color: "var(--muted2)" }}>{t.dueTime}</span>}
                              {t.recurrence !== "once" && <span style={{ fontSize: ".58rem", color: col, opacity: .6, fontWeight: 700 }}>{RECURRENCE_CONFIG[t.recurrence].short}</span>}
                            </div>
                          </div>
                          {tMs.length > 0 && (
                            <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                              {tMs.map((mx) => <span key={mx.id} style={{ fontSize: ".95rem" }}>{mx.emoji}</span>)}
                            </div>
                          )}
                          <button onClick={() => setEditingTask(t)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted2)", padding: 3, display: "flex", flexShrink: 0 }}>
                            <Icon name="edit" size={12} sw={1.8} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>
        )}

        {/* Stats du mois — cliquables, s'expandent en bas */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 18, marginBottom: 0 }}>
          {([
            { key: "all",    label: "Ce mois",  val: monthTasks.length,            color: "var(--accent)" },
            { key: "done",   label: "Faites",   val: statItems.done.length,        color: "var(--green)"  },
            { key: "urgent", label: "Urgentes", val: statItems.urgent.length,      color: "var(--danger)" },
          ] as const).map(({ key, label, val, color }) => {
            const isOpen = expandedStat === key;
            return (
              <div
                key={key}
                onClick={() => setExpandedStat(isOpen ? null : key)}
                style={{ background: isOpen ? "var(--text)" : "var(--surface)", border: `1px solid ${isOpen ? "var(--text)" : "var(--border)"}`, borderRadius: isOpen ? "16px 16px 0 0" : 16, padding: "16px 10px", textAlign: "center", cursor: val > 0 ? "pointer" : "default", transition: "all .2s", userSelect: "none", boxShadow: isOpen ? "none" : "0 2px 8px rgba(0,0,0,.04)" }}
              >
                <div style={{ fontWeight: 900, fontSize: "1.7rem", color: isOpen ? "var(--bg)" : color, lineHeight: 1, letterSpacing: "-.5px" }}>{val}</div>
                <div style={{ fontSize: ".68rem", color: isOpen ? "var(--muted2)" : "var(--muted)", marginTop: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".3px" }}>{label}</div>
              </div>
            );
          })}
        </div>

        {/* Section expandée inline sous les compteurs */}
        {expandedStat && statItems[expandedStat].length > 0 && (
          <div style={{ background: "var(--soft)", border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 12px 12px", padding: "12px 12px 14px", marginBottom: 20, animation: "fadeUp .2s ease", maxHeight: 320, overflowY: "auto" }}>
            {statItems[expandedStat].map((t) => {
              const m   = members.find((x) => t.memberId.split(",").includes(x.id));
              const r   = rooms.find((x) => x.id === t.roomId);
              const col = m?.color || r?.color || "#6B7280";
              const pc  = PRIORITY_CONFIG[t.priority];
              const isDone = t.recurrence === "once" ? t.done : (t.doneDates?.length ?? 0) > 0;
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--surface)", borderRadius: 10, marginBottom: 6, borderLeft: `3px solid ${col}`, opacity: isDone ? 0.5 : 1 }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${isDone ? col : col + "50"}`, background: isDone ? col : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {isDone && <Icon name="check" size={9} color="white" sw={3} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: ".8rem", color: col, textDecoration: isDone ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                    <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
                      <span style={{ fontSize: ".58rem", fontWeight: 700, padding: "1px 4px", borderRadius: 99, background: pc.bg, color: pc.color }}>{pc.label}</span>
                      {r && <span style={{ fontSize: ".58rem", color: "var(--muted2)" }}>{r.name}</span>}
                      <span style={{ fontSize: ".58rem", color: col, opacity: .65, fontWeight: 600 }}>{RECURRENCE_CONFIG[t.recurrence].short}</span>
                    </div>
                  </div>
                  {m && <span style={{ fontSize: "1rem", flexShrink: 0 }}>{m.emoji}</span>}
                </div>
              );
            })}
          </div>
        )}
        {!expandedStat && <div style={{ marginBottom: 20 }} />}
      </div>

      {editingTask && (
        <EditTaskModal task={editingTask} members={members} rooms={rooms} onSave={updateTask} onClose={() => setEditingTask(null)} />
      )}
    </div>
  );
}
