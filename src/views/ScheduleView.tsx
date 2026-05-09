import { useMemo, useState } from "react";
import type { ViewProps, Member, DayIndex } from "../types";
import { Icon } from "../components/ui/Icon";
import { isWeekend } from "../lib/utils";
import { DAYS_F, DAYS_S2 } from "../lib/constants";


export function ScheduleView({ members, tasks, updateMember }: ViewProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  // Recompute only when relevant inputs change (tasks/members), not on
  // unrelated state like the `expanded` member panel.
  const { dayLoad, maxLoad, totalLoad } = useMemo(() => {
    const dl = DAYS_F.map((_, i) => tasks.filter((t) => t.day === i && !t.done).length);
    return { dayLoad: dl, maxLoad: Math.max(...dl, 1), totalLoad: dl.reduce((a, b) => a + b, 0) };
  }, [tasks]);
  const totalActive = useMemo(
    () => members.filter((m) => m.workDays.length > 0).length,
    [members],
  );

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
    const dayLabel = m.isChild ? "École" : "Travail";
    const freeLabel = m.isChild ? "Libre" : "Repos";

    return (
      <div
        key={m.id}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--card-border)",
          borderRadius: 18,
          marginBottom: 12,
          overflow: "hidden",
          boxShadow: isExp ? "0 6px 20px rgba(0,0,0,.08)" : "0 2px 8px rgba(0,0,0,.04)",
          transition: "box-shadow .2s",
          backdropFilter: "var(--card-blur, none)",
          WebkitBackdropFilter: "var(--card-blur, none)",
        }}
      >
        <button
          aria-expanded={isExp}
          aria-label={`Horaires de ${m.name}`}
          onClick={() => setExpanded(isExp ? null : m.id)}
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, textAlign: "left", minHeight: 60 }}
        >
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: m.avatarBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.25rem", border: `2px solid ${m.color}40`, flexShrink: 0 }}>
            {m.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{ fontWeight: 800, fontSize: ".95rem", color: "var(--text)" }}>{m.name}</span>
              {m.isChild && (
                <span style={{ fontSize: ".58rem", fontWeight: 800, color: "var(--violet)", background: "var(--violet-bg)", padding: "2px 7px", borderRadius: 99, textTransform: "uppercase", letterSpacing: ".3px" }}>Enfant</span>
              )}
            </div>
            <div style={{ fontSize: ".7rem", color: "var(--muted)", fontWeight: 600 }}>
              {m.workDays.length === 0
                ? "Aucun jour planifié"
                : `${m.workDays.length} jour${m.workDays.length !== 1 ? "s" : ""} · ${m.workDays.map((d) => DAYS_S2[d]).join(" ")}`}
            </div>
          </div>
          <div style={{ width: 32, height: 32, borderRadius: 99, background: "var(--soft)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transform: isExp ? "rotate(90deg)" : "rotate(0)", transition: "transform .25s ease" }}>
            <Icon name="chevronRight" size={14} color="var(--muted)" sw={2.5} />
          </div>
        </button>

        {isExp && (
          <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 8, animation: "fadeUp .25s ease" }}>
            {DAYS_F.map((_, i) => {
              const d = i as DayIndex, isWork = m.workDays.includes(d), isWe = isWeekend(d), wh = m.workHours[d];
              return (
                <div
                  key={i}
                  style={{
                    background: isWork ? m.color + "10" : "var(--soft)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    border: `1.5px solid ${isWork ? m.color + "55" : "var(--border)"}`,
                    transition: "all .2s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: isWork ? 12 : 0 }}>
                    <div style={{ width: 38, fontWeight: 800, fontSize: ".82rem", color: isWe ? "var(--warn)" : "var(--text)", letterSpacing: ".2px" }}>{DAYS_S2[i]}</div>
                    <button
                      role="switch"
                      aria-checked={isWork}
                      aria-label={`${isWork ? "Désactiver" : "Activer"} ${DAYS_F[i]} pour ${m.name}`}
                      onClick={() => toggleWorkDay(m, d)}
                      style={{ width: 48, height: 28, borderRadius: 14, background: isWork ? m.color : "var(--border)", border: "none", cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0, padding: 0 }}
                    >
                      <div style={{ position: "absolute", top: 3, left: isWork ? 23 : 3, width: 22, height: 22, borderRadius: "50%", background: "white", transition: "left .2s ease", boxShadow: "0 2px 4px rgba(0,0,0,.2)" }} />
                    </button>
                    <span style={{ fontSize: ".78rem", fontWeight: 700, color: isWork ? m.color : "var(--muted2)" }}>
                      {isWork ? dayLabel : freeLabel}
                    </span>
                    {isWe && (
                      <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 3, fontSize: ".62rem", fontWeight: 800, color: "var(--warn)", background: "var(--warn-bg)", padding: "2px 7px", borderRadius: 99, textTransform: "uppercase", letterSpacing: ".3px" }}>
                        <Icon name="home" size={9} sw={2.5} /> WE
                      </span>
                    )}
                  </div>

                  {isWork && wh && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, background: "var(--surface)", borderRadius: 10, padding: "8px 12px", border: "1px solid var(--border)" }}>
                        <Icon name="sun" size={14} color={m.color} sw={2.2} />
                        <span style={{ fontSize: ".68rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".3px" }}>{m.isChild ? "Entrée" : "Début"}</span>
                        <input
                          type="time"
                          aria-label={`Heure de début ${DAYS_F[i]}`}
                          value={wh.start}
                          onChange={(e) => updateHours(m, d, "start", e.target.value)}
                          style={{ border: "none", background: "transparent", fontSize: ".85rem", fontWeight: 800, color: m.color, outline: "none", width: 64, cursor: "pointer", marginLeft: "auto" }}
                        />
                      </div>
                      <Icon name="chevronRight" size={14} color="var(--muted2)" sw={2} />
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, background: "var(--surface)", borderRadius: 10, padding: "8px 12px", border: "1px solid var(--border)" }}>
                        <Icon name="moon" size={14} color={m.color} sw={2.2} />
                        <span style={{ fontSize: ".68rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".3px" }}>{m.isChild ? "Sortie" : "Fin"}</span>
                        <input
                          type="time"
                          aria-label={`Heure de fin ${DAYS_F[i]}`}
                          value={wh.end}
                          onChange={(e) => updateHours(m, d, "end", e.target.value)}
                          style={{ border: "none", background: "transparent", fontSize: ".85rem", fontWeight: 800, color: m.color, outline: "none", width: 64, cursor: "pointer", marginLeft: "auto" }}
                        />
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
      {/* Gradient header — kawaii style consistent with other views */}
      <div className="fp-planning-header">
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: ".68rem", fontWeight: 800, color: "var(--green)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>
            {totalActive} actif{totalActive !== 1 ? "s" : ""} · {totalLoad} tâche{totalLoad !== 1 ? "s" : ""} cette semaine
          </div>
          <h1 style={{ fontWeight: 900, fontSize: "1.65rem", lineHeight: 1, color: "var(--text)", letterSpacing: "-.5px" }}>
            Planning
          </h1>
        </div>

        {/* Mini quick-stats inline */}
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, background: "rgba(255,255,255,.55)", border: "1px solid rgba(255,255,255,.4)", borderRadius: 14, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
            <div style={{ width: 28, height: 28, borderRadius: 10, background: "var(--green-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="briefcase" size={14} color="var(--green)" sw={2.2} />
            </div>
            <div>
              <div style={{ fontSize: ".62rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".3px" }}>Membres</div>
              <div style={{ fontSize: ".95rem", fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>{members.length}</div>
            </div>
          </div>
          <div style={{ flex: 1, background: "rgba(255,255,255,.55)", border: "1px solid rgba(255,255,255,.4)", borderRadius: 14, padding: "8px 10px", display: "flex", alignItems: "center", gap: 8, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
            <div style={{ width: 28, height: 28, borderRadius: 10, background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="clock" size={14} color="var(--accent)" sw={2.2} />
            </div>
            <div>
              <div style={{ fontSize: ".62rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".3px" }}>Tâches</div>
              <div style={{ fontSize: ".95rem", fontWeight: 900, color: "var(--text)", lineHeight: 1 }}>{totalLoad}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charge hebdo — floating card overlapping gradient */}
      <div style={{ padding: "0 16px", marginTop: -14 }}>
        <div style={{ background: "var(--surface)", border: "1px solid var(--card-border)", boxShadow: "0 8px 28px rgba(0,0,0,.08)", borderRadius: 22, padding: "18px 18px 16px", backdropFilter: "var(--card-blur, none)", WebkitBackdropFilter: "var(--card-blur, none)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 10, background: "var(--accent-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="flag" size={14} color="var(--accent)" sw={2.2} />
              </div>
              <h2 style={{ fontWeight: 900, fontSize: "1rem", color: "var(--text)", letterSpacing: "-.2px" }}>Charge hebdomadaire</h2>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {DAYS_F.map((_, i) => {
              const load = dayLoad[i], isWe = isWeekend(i as DayIndex), bar = Math.round(load / maxLoad * 100);
              const overload = (isWe && load > 4) || (!isWe && load > 6);
              const color = overload ? "var(--danger)" : isWe ? "var(--warn)" : "var(--accent)";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 32, fontSize: ".78rem", fontWeight: 800, color: isWe ? "var(--warn)" : "var(--muted)", flexShrink: 0, textTransform: "uppercase", letterSpacing: ".3px" }}>{DAYS_S2[i]}</div>
                  <div style={{ flex: 1, height: 10, background: "var(--soft)", borderRadius: 99, overflow: "hidden", position: "relative" }}>
                    <div
                      role="progressbar"
                      aria-label={`Charge ${DAYS_F[i]}: ${load} tâches`}
                      aria-valuenow={load}
                      aria-valuemin={0}
                      aria-valuemax={maxLoad}
                      style={{ height: "100%", width: `${bar}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)`, borderRadius: 99, transition: "width .5s ease" }}
                    />
                  </div>
                  <div style={{ minWidth: 28, fontSize: ".82rem", fontWeight: 900, color: load === 0 ? "var(--muted2)" : "var(--text)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{load}</div>
                  {overload && <Icon name="alert" size={14} color="var(--danger)" sw={2.2} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conseil card if weekend overloaded */}
      {dayLoad[5] + dayLoad[6] > 8 && (
        <div style={{ padding: "16px 16px 0" }}>
          <div style={{ background: "var(--warn-bg)", border: "1px solid var(--warn)", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 10, background: "var(--warn)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="sparkle" size={14} color="white" sw={2.2} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: ".82rem", color: "var(--text)", marginBottom: 2 }}>Weekend chargé</div>
              <div style={{ fontSize: ".75rem", color: "var(--muted)", lineHeight: 1.5 }}>
                {dayLoad[5] + dayLoad[6]} tâches · pensez à redistribuer en semaine.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Horaires des membres */}
      <div style={{ padding: "20px 16px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ width: 28, height: 28, borderRadius: 10, background: "var(--violet-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="briefcase" size={14} color="var(--violet)" sw={2.2} />
          </div>
          <h2 style={{ fontWeight: 900, fontSize: "1rem", color: "var(--text)", letterSpacing: "-.2px" }}>Horaires</h2>
        </div>
        {members.map(renderMemberCard)}
      </div>
    </div>
  );
}
