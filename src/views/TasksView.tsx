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

export function TasksView({ members, tasks, rooms, reminders, addTask, toggleTask, deleteTask, updateTask, addReminder, deleteRem }: ViewProps) {
  // ── Onglets ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"tasks" | "reminders">("tasks");

  // ── Tâches ────────────────────────────────────────────────────────────────
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
      if (filt === "todo")    return !t.done;
      if (filt === "done")    return t.done;
      if (filt === "high")    return t.priority === "high" && !t.done;
      if (filt === "weekend") return isWeekend(t.day) && !t.done;
      return true;
    })
    .sort((a, b) => ({ high: 0, med: 1, low: 2 }[a.priority] - { high: 0, med: 1, low: 2 }[b.priority] || a.day - b.day));

  const urgentCount = tasks.filter((t) => t.priority === "high" && !t.done).length;

  // ── Rappels ───────────────────────────────────────────────────────────────
  const [rt,         setRt]         = useState("");
  const [reTime,     setReTime]     = useState("");
  const [reDayVal,   setReDayVal]   = useState(String(todayIdx()));
  const [reEmojiVal, setReEmojiVal] = useState("🔔");
  const [reDate,     setReDate]     = useState("");

  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const requestNotifPerm = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === "granted") {
      const opts = { body: "Notifications activées pour tâches et rappels !", icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" };
      try {
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.ready;
          if (reg) { reg.showNotification("Notre Foyer 🏠", opts); return; }
        }
        new Notification("Notre Foyer 🏠", opts);
      } catch { /* fail silently */ }
    }
  };

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
          {/* Bannière notifications */}
          {notifPerm !== "granted" && notifPerm !== "denied" && (
            <div style={{ background: "var(--soft)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="bell" size={15} color="var(--accent)" />
              <div style={{ flex: 1, fontSize: ".72rem", color: "var(--muted)" }}>
                Activez les notifications pour recevoir une alerte sur les tâches avec une heure.
              </div>
              <button onClick={requestNotifPerm} style={{ padding: "5px 10px", border: "none", borderRadius: 8, background: "var(--accent)", color: "var(--bg)", fontSize: ".72rem", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                Activer
              </button>
            </div>
          )}
          {notifPerm === "granted" && tasks.some((t) => t.dueTime) && (
            <div style={{ background: "var(--green-bg)", border: "1px solid var(--green)", borderRadius: 12, padding: "8px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="bell" size={14} color="var(--green)" />
              <span style={{ fontSize: ".72rem", color: "var(--text)", fontWeight: 600 }}>
                Notifications actives — tâches avec heure notifient 5 min avant
              </span>
            </div>
          )}
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
              <input value={fname} onChange={(e) => setFname(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Nom de la tâche…" style={{ ...inputStyle, marginBottom: 8, background: "var(--surface)" }} />
              <MemberToggleBar members={members} selected={fms} onChange={setFms} />
              <select value={fd} onChange={(e) => setFd(e.target.value)} style={{ ...inputStyle, marginBottom: 8, background: "var(--surface)" }}>
                {DAYS_F.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <select value={fr} onChange={(e) => setFr(e.target.value)} style={{ ...inputStyle, flex: 1, background: "var(--surface)" }}>
                  {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <input type="time" value={ftime} onChange={(e) => setFtime(e.target.value)} style={{ ...inputStyle, flex: 1, background: "var(--surface)" }} />
              </div>
              <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
                {(["low", "med", "high"] as Priority[]).map((p) => {
                  const c = PRIORITY_CONFIG[p];
                  return <button key={p} onClick={() => setFp(p)} style={{ flex: 1, padding: "7px 4px", border: `1.5px solid ${fp === p ? c.color : "var(--border)"}`, borderRadius: 8, background: fp === p ? c.bg : "var(--surface)", color: fp === p ? c.color : "var(--muted)", fontSize: ".7rem", fontWeight: 700, cursor: "pointer" }}>{c.label}</button>;
                })}
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
                {(["once", "daily", "weekly", "monthly", "annual"] as Recurrence[]).map((rec) => {
                  const a = frec === rec;
                  return <button key={rec} onClick={() => setFrec(rec)} style={{ flex: "1 1 0", minWidth: 52, padding: "6px 4px", border: `1.5px solid ${a ? "var(--text)" : "var(--border)"}`, borderRadius: 8, background: a ? "var(--text)" : "var(--surface)", color: a ? "var(--bg)" : "var(--muted)", fontSize: ".65rem", fontWeight: 700, cursor: "pointer" }}>{RECURRENCE_CONFIG[rec].short}</button>;
                })}
              </div>
              <input value={fnote} onChange={(e) => setFnote(e.target.value)} placeholder="Note optionnelle…" style={{ ...inputStyle, marginBottom: 8, background: "var(--surface)", fontSize: ".8rem" }} />
              <WorkConflictAlert conflict={conflict} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={submit} disabled={!!conflict} style={{ ...primaryBtn, flex: 1, opacity: conflict ? 0.6 : 1, cursor: conflict ? "not-allowed" : "pointer" }}>{conflict ? "⚠️ Conflit" : "Ajouter ✓"}</button>
                <button onClick={() => setShow(false)} style={{ ...ghostBtn, flex: 1 }}>Annuler</button>
              </div>
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
      )}

      {/* ── ONGLET RAPPELS ── */}
      {activeTab === "reminders" && (
        <div style={{ padding: "16px" }}>
          {/* Bannière notifications */}
          <div style={{ background: notifPerm === "granted" ? "var(--green-bg)" : "var(--soft)", border: `1px solid ${notifPerm === "granted" ? "var(--green)" : "var(--border)"}`, borderRadius: 14, padding: "12px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: notifPerm === "granted" ? "var(--green-bg)" : "var(--violet-bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="bell" size={17} color={notifPerm === "granted" ? "var(--green)" : "var(--violet)"} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: ".85rem" }}>
                {notifPerm === "granted" ? "Notifications actives ✓" : "Notifications push"}
              </div>
              <div style={{ fontSize: ".68rem", color: "var(--muted)", marginTop: 1 }}>
                {notifPerm === "granted"
                  ? "Tâches avec heure et rappels vous notifieront"
                  : notifPerm === "denied"
                    ? "Bloquées — autorisez dans les réglages du navigateur"
                    : "Activez pour être alerté des tâches et rappels"}
              </div>
            </div>
            {notifPerm !== "granted" && notifPerm !== "denied" && (
              <button onClick={requestNotifPerm} style={{ padding: "7px 14px", border: "none", borderRadius: 9, background: "var(--violet)", color: "var(--bg)", fontSize: ".75rem", fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                Activer
              </button>
            )}
          </div>

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
