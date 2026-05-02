import { useState } from "react";
import type { ViewProps, Member, DayIndex } from "../types";
import { Icon } from "../components/ui/Icon";
import { PgHdr } from "../components/ui/PgHdr";
import { SectionTitle } from "../components/ui/SectionTitle";
import { isWeekend } from "../lib/utils";
import { DAYS_F, DAYS_S2 } from "../lib/constants";


export function ScheduleView({ members, tasks, updateMember }: ViewProps) {
  const [expanded, setExpanded] = useState<string | null>(members[0]?.id || null);

  const dayLoad = DAYS_F.map((_, i) => tasks.filter((t) => t.day === i && !t.done).length);
  const maxLoad = Math.max(...dayLoad, 1);

  const toggleWorkDay = (m: Member, d: DayIndex) => {
    const isWork = m.workDays.includes(d);
    const newWorkDays = isWork ? m.workDays.filter((x) => x !== d) : [...m.workDays, d] as DayIndex[];
    const newWorkHours = { ...m.workHours };
    if (isWork) delete newWorkHours[d];
    else if (!newWorkHours[d]) newWorkHours[d] = { start: "09:00", end: "18:00" };
    updateMember({ ...m, workDays: newWorkDays, workHours: newWorkHours });
  };

  const updateHours = (m: Member, d: DayIndex, field: "start" | "end", val: string) => {
    updateMember({ ...m, workHours: { ...m.workHours, [d]: { ...(m.workHours[d] || { start: "09:00", end: "18:00" }), [field]: val } } });
  };

  const renderMemberCard = (m: Member) => {
    const isExp = expanded === m.id;
    const dayLabel = m.isChild ? "Jour d'école" : "Jour travaillé";
    const freeLabel = m.isChild ? "Pas d'école" : "Jour libre";
    const startLabel = m.isChild ? "🎒 Entrée" : "🌅 Début";
    const endLabel = m.isChild ? "🏠 Sortie" : "🌙 Fin";

    return (
      <div key={m.id} style={{ background: "var(--soft)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 10, overflow: "hidden" }}>
        <button
          onClick={() => setExpanded(isExp ? null : m.id)}
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}
        >
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: m.avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", border: `2px solid ${m.color}30` }}>
            {m.emoji}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: ".9rem", color: m.color }}>
              {m.name}
              {m.isChild && <span style={{ fontSize: ".7rem", fontWeight: 500, color: "var(--muted)" }}> · Enfant 🎒</span>}
            </div>
            <div style={{ fontSize: ".65rem", color: "var(--muted)", marginTop: 1 }}>
              {m.workDays.length} jour{m.workDays.length !== 1 ? "s" : ""} {m.isChild ? "d'école" : "travaillé"}
              {m.workDays.length > 0 && " · " + m.workDays.map((d) => { const wh = m.workHours[d]; return wh ? `${DAYS_S2[d]} ${wh.start}–${wh.end}` : DAYS_S2[d]; }).join(", ")}
            </div>
          </div>
          <Icon name={isExp ? "chevronLeft" : "chevronRight"} size={16} color="var(--muted)" sw={2} />
        </button>

        {isExp && (
          <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
            {DAYS_F.map((dayName, i) => {
              const d = i as DayIndex, isWork = m.workDays.includes(d), isWe = isWeekend(d), wh = m.workHours[d];
              return (
                <div key={i} style={{ background: "white", borderRadius: 10, padding: "10px 12px", border: `1.5px solid ${isWork ? m.color + "50" : "var(--border)"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: isWork ? 10 : 0 }}>
                    <div style={{ width: 36, fontWeight: 700, fontSize: ".78rem", color: isWe ? "#D97706" : "var(--muted)" }}>{DAYS_S2[i]}</div>
                    <div
                      onClick={() => toggleWorkDay(m, d)}
                      style={{ width: 40, height: 22, borderRadius: 11, background: isWork ? m.color : "var(--border)", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0 }}
                    >
                      <div style={{ position: "absolute", top: 3, left: isWork ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "white", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
                    </div>
                    <span style={{ fontSize: ".75rem", fontWeight: isWork ? 700 : 500, color: isWork ? m.color : "var(--muted2)" }}>
                      {isWork ? dayLabel : freeLabel}
                    </span>
                    {isWe && <span style={{ fontSize: ".65rem", color: "#D97706", marginLeft: "auto" }}>🏡</span>}
                  </div>

                  {isWork && wh && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, background: "var(--soft)", borderRadius: 8, padding: "6px 10px" }}>
                        <span style={{ fontSize: ".8rem" }}>{startLabel.split(" ")[0]}</span>
                        <span style={{ fontSize: ".68rem", fontWeight: 600, color: "var(--muted)" }}>{startLabel.split(" ").slice(1).join(" ")}</span>
                        <input type="time" value={wh.start} onChange={(e) => updateHours(m, d, "start", e.target.value)} style={{ border: "none", background: "transparent", fontSize: ".82rem", fontWeight: 700, color: m.color, outline: "none", width: 70, cursor: "pointer" }} />
                      </div>
                      <Icon name="chevronRight" size={14} color="var(--muted2)" />
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, background: "var(--soft)", borderRadius: 8, padding: "6px 10px" }}>
                        <span style={{ fontSize: ".8rem" }}>{endLabel.split(" ")[0]}</span>
                        <span style={{ fontSize: ".68rem", fontWeight: 600, color: "var(--muted)" }}>{endLabel.split(" ").slice(1).join(" ")}</span>
                        <input type="time" value={wh.end} onChange={(e) => updateHours(m, d, "end", e.target.value)} style={{ border: "none", background: "transparent", fontSize: ".82rem", fontWeight: 700, color: m.color, outline: "none", width: 70, cursor: "pointer" }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ animation: "fadeUp .35s ease" }}>
      <PgHdr title="Planning" sub="Horaires & charge hebdomadaire" />
      <div style={{ padding: "16px" }}>
        {/* Charge hebdomadaire */}
        <SectionTitle iconName="flag" title="Charge hebdomadaire" />
        <div style={{ background: "var(--soft)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px", marginBottom: 16 }}>
          {DAYS_F.map((d, i) => {
            const load = dayLoad[i], isWe = isWeekend(i as DayIndex), bar = Math.round(load / maxLoad * 100);
            const color = isWe ? load > 4 ? "var(--danger)" : "var(--warn)" : load > 6 ? "var(--danger)" : "var(--accent)";
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: i < 6 ? 10 : 0 }}>
                <div style={{ width: 28, fontSize: ".72rem", fontWeight: 700, color: isWe ? "#D97706" : "var(--muted)", flexShrink: 0 }}>{DAYS_S2[i]}</div>
                <div style={{ flex: 1, height: 8, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${bar}%`, background: color, borderRadius: 99, transition: "width .5s ease" }} />
                </div>
                <div style={{ width: 20, fontSize: ".72rem", fontWeight: 700, color: "var(--muted)", textAlign: "right" }}>{load}</div>
                {isWe && load > 4 && <Icon name="alert" size={14} color="#D97706" />}
              </div>
            );
          })}
        </div>

        {dayLoad[5] + dayLoad[6] > 8 && (
          <div style={{ marginBottom: 16, background: "var(--warn-bg)", border: "1px solid #FDE68A", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontWeight: 700, fontSize: ".82rem", color: "#92400E", marginBottom: 4 }}>💡 Conseil</div>
            <div style={{ fontSize: ".78rem", color: "#B45309", lineHeight: 1.5 }}>Weekend chargé ({dayLoad[5] + dayLoad[6]} tâches). Pensez à redistribuer en semaine !</div>
          </div>
        )}

        {/* Horaires des membres */}
        <SectionTitle iconName="briefcase" title="Horaires" />
        {members.map(renderMemberCard)}
      </div>
    </div>
  );
}
