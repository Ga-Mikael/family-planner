import { useState } from "react";
import type { ViewProps, Task, DayIndex, Priority } from "../types";
import { Icon } from "../components/ui/Icon";
import { MemberToggleBar } from "../components/ui/MemberToggleBar";
import { EditTaskModal } from "../components/tasks/EditTaskModal";
import { parseMemberIds, getFrenchHolidays, getVacation, dateKey } from "../lib/utils";
import { DAYS_F, MONTHS, PRIORITY_CONFIG } from "../lib/constants";
import { inputStyle, primaryBtn, navBtn } from "../styles";

export function AgendaView({ tasks, members, rooms, addTask, updateTask }: ViewProps) {
  const today = new Date();
  const [viewDate,    setViewDate]    = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [detailDay,   setDetailDay]   = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [aName,       setAName]       = useState("");
  const [aMembers,    setAMembers]    = useState<string[]>([]);
  const [aPrio,       setAPrio]       = useState<Priority>("med");
  const [aTime,       setATime]       = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstMon = (() => { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1; })();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const tasksByDom = (dom: number) => {
    const date = new Date(year, month, dom);
    const dow = (date.getDay() === 0 ? 6 : date.getDay() - 1) as DayIndex;
    return tasks.filter((t) => t.day === dow);
  };
  const selDow = detailDay ? ((new Date(year, month, detailDay).getDay() === 0 ? 6 : new Date(year, month, detailDay).getDay() - 1) as DayIndex) : null;
  const selTasks = selDow !== null ? tasks.filter((t) => t.day === selDow) : [];

  const addTaskForDay = () => {
    if (!aName.trim() || selDow === null) return;
    addTask({ id: "t" + Date.now(), name: aName.trim(), memberId: aMembers.join(","), roomId: "r-general", day: selDow, priority: aPrio, recurrence: "once", done: false, dueTime: aTime || undefined });
    setAName(""); setAMembers([]); setATime(""); setShowAddForm(false);
  };

  return (
    <div style={{ animation: "fadeUp .35s ease" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="calendar" size={18} color="white" sw={2} />
          </div>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: "1.2rem", lineHeight: 1 }}>{MONTHS[month]} {year}</h1>
            <div style={{ fontSize: ".65rem", color: "var(--muted)", marginTop: 2 }}>{daysInMonth} jours · {tasks.length} tâches</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={navBtn}><Icon name="chevronLeft" size={16} /></button>
          <button onClick={() => { setViewDate(new Date(today.getFullYear(), today.getMonth(), 1)); setDetailDay(today.getDate()); }} style={{ ...navBtn, fontSize: ".65rem", fontWeight: 700, padding: "0 8px", width: "auto" }}>Auj.</button>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={navBtn}><Icon name="chevronRight" size={16} /></button>
        </div>
      </div>

      <div style={{ padding: "12px 16px 0" }}>
        {/* En-têtes jours */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 2, marginBottom: 4 }}>
          {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
            <div key={i} style={{ textAlign: "center", fontSize: ".62rem", fontWeight: 700, color: i >= 5 ? "var(--warn)" : "var(--muted2)", padding: "2px 0" }}>{d}</div>
          ))}
        </div>

        {/* Grille calendrier */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 16 }}>
          {Array.from({ length: firstMon }).map((_, i) => <div key={"e" + i} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dom = i + 1;
            const date = new Date(year, month, dom);
            const dow = (date.getDay() === 0 ? 6 : date.getDay() - 1) as DayIndex;
            const isToday = isCurrentMonth && dom === today.getDate(), isSel = detailDay === dom, isWe = dow >= 5;
            const dtl = tasksByDom(dom);
            const doneAll = dtl.length > 0 && dtl.every((t) => t.done), hasHigh = dtl.some((t) => t.priority === "high" && !t.done);
            const dotColors = [...new Set(dtl.flatMap((t) => parseMemberIds(t.memberId).map((id) => members.find((m) => m.id === id)?.color).filter(Boolean) as string[]))].slice(0, 3) as string[];
            const holiday = getFrenchHolidays(year).get(dateKey(date));
            const vac = getVacation(date);
            return (
              <button
                key={dom}
                onClick={() => setDetailDay(isSel ? null : dom)}
                style={{ border: `1.5px solid ${isSel ? "var(--text)" : isToday ? "var(--accent)" : "transparent"}`, borderRadius: 10, padding: "5px 2px 4px", background: isSel ? "var(--text)" : isToday ? "var(--accent-bg)" : "transparent", cursor: "pointer", textAlign: "center", transition: "all .15s", position: "relative" }}
              >
                <div style={{ fontSize: ".88rem", fontWeight: isToday || isSel ? 800 : 500, color: isSel ? "white" : isToday ? "var(--accent)" : isWe ? "#D97706" : "var(--text)", lineHeight: 1.2 }}>{dom}</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 3, minHeight: 5 }}>
                  {dtl.length === 0 ? null : doneAll
                    ? <div style={{ width: 5, height: 5, borderRadius: "50%", background: isSel ? "white" : "var(--green)" }} />
                    : dotColors.length > 0
                      ? dotColors.map((c, ci) => <div key={ci} style={{ width: 4, height: 4, borderRadius: "50%", background: isSel ? "white" : c }} />)
                      : <div style={{ width: 4, height: 4, borderRadius: "50%", background: isSel ? "white" : "var(--accent)" }} />
                  }
                </div>
                {(holiday || vac) && <div style={{ width: 4, height: 4, borderRadius: "50%", background: holiday ? "#DC2626" : vac!.color, margin: "1px auto 0" }} />}
                {hasHigh && <div style={{ position: "absolute", top: 2, right: 3, width: 5, height: 5, borderRadius: "50%", background: "var(--danger)" }} />}
              </button>
            );
          })}
        </div>

        {/* Détail du jour sélectionné */}
        {detailDay && selDow !== null && (
          <div style={{ background: "var(--soft)", border: "1px solid var(--border)", borderRadius: 16, padding: 14, marginBottom: 16, animation: "fadeUp .2s ease" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: ".95rem" }}>{DAYS_F[selDow]} {detailDay} {MONTHS[month]}</div>
                <div style={{ fontSize: ".68rem", color: "var(--muted)", marginTop: 1 }}>{selTasks.filter((t) => t.done).length}/{selTasks.length} tâches</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => { setShowAddForm((f) => !f); setAName(""); setAMembers([]); setAPrio("med"); setATime(""); }}
                  style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: showAddForm ? "var(--text)" : "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: showAddForm ? "white" : "var(--muted)" }}
                >
                  <Icon name="plus" size={14} sw={2.5} />
                </button>
                <button
                  onClick={() => { setDetailDay(null); setShowAddForm(false); }}
                  style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid var(--border)", background: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted)" }}
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
            {showAddForm && (
              <div style={{ background: "white", borderRadius: 12, padding: "10px 12px", marginBottom: 10, display: "flex", flexDirection: "column", gap: 8, animation: "fadeUp .15s ease" }}>
                <input
                  autoFocus
                  value={aName}
                  onChange={(e) => setAName(e.target.value)}
                  placeholder="Nom de la tâche…"
                  style={{ ...inputStyle, background: "var(--soft)", fontSize: ".82rem" }}
                  onKeyDown={(e) => { if (e.key === "Enter" && aName.trim()) addTaskForDay(); }}
                />
                <MemberToggleBar members={members} selected={aMembers} onChange={setAMembers} />
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="time" value={aTime} onChange={(e) => setATime(e.target.value)} style={{ ...inputStyle, flex: 1, fontSize: ".78rem", background: "var(--soft)" }} />
                  <select value={aPrio} onChange={(e) => setAPrio(e.target.value as Priority)} style={{ ...inputStyle, width: 100, fontSize: ".78rem", background: "var(--soft)" }}>
                    {(Object.entries(PRIORITY_CONFIG) as [Priority, { label: string; color: string; bg: string }][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <button onClick={addTaskForDay} style={{ ...primaryBtn, fontSize: ".82rem", padding: "9px" }}>Ajouter la tâche</button>
              </div>
            )}

            {/* Liste des tâches du jour */}
            {selTasks.length === 0 && !showAddForm
              ? <div style={{ textAlign: "center", padding: "16px 0", color: "var(--muted2)", fontSize: ".8rem", fontStyle: "italic" }}>Aucune tâche ce jour 😌</div>
              : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {selTasks.map((t) => {
                    const tMids = parseMemberIds(t.memberId);
                    const tMs = tMids.map((id) => members.find((x) => x.id === id)).filter(Boolean) as typeof members;
                    const tM = tMs[0], r = rooms.find((x) => x.id === t.roomId);
                    const col = tM?.color || r?.color || "#6B7280", pc = PRIORITY_CONFIG[t.priority];
                    return (
                      <div key={t.id} style={{ background: "white", borderRadius: 10, padding: "9px 12px", display: "flex", alignItems: "center", gap: 9, borderLeft: `3px solid ${col}` }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${t.done ? col : col + "60"}`, background: t.done ? col : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {t.done && <Icon name="check" size={9} color="white" sw={3} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: ".8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: t.done ? "line-through" : "none", color: col }}>{t.name}</div>
                          <div style={{ display: "flex", gap: 5, alignItems: "center", marginTop: 1 }}>
                            <span style={{ fontSize: ".58rem", fontWeight: 700, padding: "1px 5px", borderRadius: 99, background: pc.bg, color: pc.color }}>{pc.label}</span>
                            {r && <span style={{ fontSize: ".58rem", color: "var(--muted2)" }}>{r.name}</span>}
                            {t.dueTime && <span style={{ fontSize: ".58rem", color: "var(--muted2)" }}>{t.dueTime}</span>}
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
                    );
                  })}
                </div>
              )
            }
          </div>
        )}

        {/* Stats du mois */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 20 }}>
          {[
            { label: "Ce mois", val: tasks.length, color: "var(--accent)" },
            { label: "Faites", val: tasks.filter((t) => t.done).length, color: "var(--green)" },
            { label: "Urgentes", val: tasks.filter((t) => t.priority === "high" && !t.done).length, color: "var(--danger)" },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ background: "var(--soft)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px", textAlign: "center" }}>
              <div style={{ fontWeight: 800, fontSize: "1.4rem", color, lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: ".62rem", color: "var(--muted)", marginTop: 3, fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {editingTask && (
        <EditTaskModal task={editingTask} members={members} rooms={rooms} onSave={updateTask} onClose={() => setEditingTask(null)} />
      )}
    </div>
  );
}
