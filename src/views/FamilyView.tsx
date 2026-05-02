import { useState } from "react";
import type { ViewProps, Task, DayIndex, Priority, Recurrence, IconName } from "../types";
import { Icon } from "../components/ui/Icon";
import { Empty } from "../components/ui/Empty";
import { SectionTitle } from "../components/ui/SectionTitle";
import { MemberToggleBar } from "../components/ui/MemberToggleBar";
import { WorkConflictAlert } from "../components/ui/WorkConflictAlert";
import { FullTaskCard } from "../components/tasks/FullTaskCard";
import { EditTaskModal } from "../components/tasks/EditTaskModal";
import { todayIdx, getWorkConflict } from "../lib/utils";
import { DAYS_F, DAYS_S2, MEMBER_COLORS, PRIORITY_CONFIG, RECURRENCE_CONFIG } from "../lib/constants";
import { inputStyle, primaryBtn, ghostBtn } from "../styles";

interface FamilyViewProps extends ViewProps {
  onSignOut: () => void;
  userEmail: string;
}

export function FamilyView({
  members, tasks, rooms, groceries, meals, reminders,
  addGrocery, toggleGroc, deleteGroc, updateMeals,
  addReminder, deleteRem, addTask, toggleTask, deleteTask, updateTask,
  addMember, deleteMember, addRoom, deleteRoom,
  onSignOut, userEmail,
}: FamilyViewProps) {
  const [section,        setSection]        = useState<"foyer" | "cuisine" | "rappels">("foyer");
  const [selRoom,        setSelRoom]        = useState<string | null>(null);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [newName,        setNewName]        = useState("");
  const [nEmoji,         setNEmoji]         = useState("");
  const [nColorIdx,      setNColorIdx]      = useState(0);
  const [showRoomAddForm, setShowRoomAddForm] = useState(false);
  const [roomName,       setRoomName]       = useState("");
  const [roomIcon,       setRoomIcon]       = useState<IconName>("home");
  const [roomColorIdx,   setRoomColorIdx]   = useState(0);

  // Formulaire tâche pièce
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [rfName,       setRfName]       = useState("");
  const [rfMs,         setRfMs]         = useState<string[]>([]);
  const [rfDay,        setRfDay]        = useState(String(todayIdx()));
  const [rfP,          setRfP]          = useState<Priority>("med");
  const [rfRec,        setRfRec]        = useState<Recurrence>("once");
  const [rfTime,       setRfTime]       = useState("");
  const [editingTask,  setEditingTask]  = useState<Task | null>(null);

  const roomConflict = getWorkConflict(rfMs.join(","), parseInt(rfDay) as DayIndex, rfTime, members);

  const submitRoomTask = () => {
    if (!rfName.trim() || !selRoom || roomConflict) return;
    addTask({ id: "t" + Date.now(), name: rfName.trim(), memberId: rfMs.join(","), roomId: selRoom, day: parseInt(rfDay) as DayIndex, priority: rfP, recurrence: rfRec, done: false, dueTime: rfTime || undefined });
    setRfName(""); setRfMs([]); setRfDay(String(todayIdx())); setRfP("med"); setRfRec("once"); setRfTime(""); setShowRoomForm(false);
  };

  // Courses
  const [gn,    setGn]    = useState("");
  const [gqVal, setGqVal] = useState("");

  // Repas
  const [ed,    setEd]    = useState<DayIndex | null>(null);
  const [miVal, setMiVal] = useState("");

  // Rappels
  const [rt,       setRt]       = useState("");
  const [reTime,   setReTime]   = useState("");
  const [reDayVal, setReDayVal] = useState(String(todayIdx()));
  const [reEmojiVal, setReEmojiVal] = useState("🔔");

  const room = selRoom ? rooms.find((r) => r.id === selRoom) : null;
  const roomTasks = selRoom ? tasks.filter((t) => t.roomId === selRoom) : [];

  return (
    <div style={{ animation: "fadeUp .35s ease" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: "1.3rem" }}>Notre Foyer</h1>
          <div style={{ fontSize: ".65rem", color: "var(--muted)", marginTop: 2 }}>{members.length} membre{members.length !== 1 ? "s" : ""}</div>
        </div>
        <button onClick={onSignOut} style={{ ...ghostBtn, padding: "6px 12px", fontSize: ".72rem", gap: 5 }}>
          <Icon name="lock" size={13} /> Déconnexion
        </button>
      </div>

      {/* Onglets section */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", padding: "0 16px" }}>
        {([["foyer", "🏠 Foyer"], ["cuisine", "🍽️ Cuisine"], ["rappels", "🔔 Rappels"]] as const).map(([s, l]) => (
          <button key={s} onClick={() => { setSection(s); setSelRoom(null); }} style={{ flex: 1, border: "none", background: "none", cursor: "pointer", padding: "10px 0", fontSize: ".78rem", fontWeight: 700, color: section === s ? "var(--text)" : "var(--muted2)", borderBottom: `2.5px solid ${section === s ? "var(--text)" : "transparent"}`, marginBottom: -1, transition: "all .2s" }}>{l}</button>
        ))}
      </div>

      <div style={{ padding: "16px" }}>

        {/* ── FOYER : liste pièces ── */}
        {section === "foyer" && !selRoom && (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 20 }}>
              {[
                { icon: "check" as IconName, val: tasks.filter((t) => t.done).length, label: "Faites", color: "var(--green)" },
                { icon: "alert" as IconName, val: tasks.filter((t) => t.priority === "high" && !t.done).length, label: "Urgentes", color: "var(--danger)" },
                { icon: "repeat" as IconName, val: tasks.filter((t) => t.recurrence !== "once").length, label: "Récurrentes", color: "var(--accent)" },
              ].map(({ icon, val, label, color }) => (
                <div key={label} style={{ background: "var(--soft)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px" }}>
                    <Icon name={icon} size={15} color={color} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "1.25rem", color, lineHeight: 1 }}>{val}</div>
                  <div style={{ fontSize: ".6rem", color: "var(--muted)", marginTop: 2, fontWeight: 600 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Membres */}
            <SectionTitle iconName="users" title="Les membres" />
            {members.map((m) => {
              const mt = tasks.filter((t) => t.memberId === m.id);
              const md = mt.filter((t) => t.done).length;
              const pct = mt.length ? Math.round(md / mt.length * 100) : 0;
              return (
                <div key={m.id} style={{ background: m.avatarBg, borderRadius: 14, padding: "12px 14px", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", border: `2px solid ${m.color}30` }}>{m.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: ".9rem", color: m.color }}>{m.name}</div>
                      <div style={{ fontSize: ".65rem", color: m.color, opacity: 0.7, marginTop: 1 }}>{m.isChild ? "Enfant 🌟" : m.workDays.length + " j/semaine travaillés"}</div>
                    </div>
                    <div style={{ fontSize: ".8rem", fontWeight: 700, color: m.color, opacity: 0.8 }}>{md}/{mt.length}</div>
                    {members.length > 1 && (
                      <button onClick={() => deleteMember(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: m.color, opacity: 0.4, padding: 4, display: "flex" }}>
                        <Icon name="trash" size={13} />
                      </button>
                    )}
                  </div>
                  <div style={{ height: 4, background: "rgba(255,255,255,.55)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: m.color, transition: "width .6s ease" }} />
                  </div>
                </div>
              );
            })}

            {showMemberForm ? (
              <div style={{ background: "var(--soft)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, marginTop: 8, animation: "fadeUp .2s ease" }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input value={nEmoji} onChange={(e) => setNEmoji(e.target.value)} placeholder="😊" style={{ ...inputStyle, width: 60, textAlign: "center", fontSize: "1.2rem", background: "white" }} />
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Prénom…"
                    style={{ ...inputStyle, flex: 1, background: "white" }}
                    onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) { addMember({ name: newName.trim(), emoji: nEmoji || "😊", color: MEMBER_COLORS[nColorIdx].color, avatarBg: MEMBER_COLORS[nColorIdx].avatarBg }); setNewName(""); setNEmoji(""); setNColorIdx(0); setShowMemberForm(false); } }}
                  />
                </div>
                <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
                  {MEMBER_COLORS.map((c, ci) => (
                    <div key={ci} onClick={() => setNColorIdx(ci)} style={{ width: 22, height: 22, borderRadius: "50%", background: c.color, cursor: "pointer", flexShrink: 0, boxShadow: nColorIdx === ci ? `0 0 0 2px white, 0 0 0 4px ${c.color}` : "none", transition: "box-shadow .15s" }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => { if (newName.trim()) { addMember({ name: newName.trim(), emoji: nEmoji || "😊", color: MEMBER_COLORS[nColorIdx].color, avatarBg: MEMBER_COLORS[nColorIdx].avatarBg }); setNewName(""); setNEmoji(""); setNColorIdx(0); setShowMemberForm(false); } }}
                    style={{ ...primaryBtn, flex: 1, fontSize: ".82rem" }}
                  >Ajouter</button>
                  <button onClick={() => setShowMemberForm(false)} style={{ ...ghostBtn, fontSize: ".82rem" }}>Annuler</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowMemberForm(true)} style={{ width: "100%", padding: "9px", background: "var(--soft)", border: "1.5px dashed var(--border)", borderRadius: 12, color: "var(--muted)", fontSize: ".78rem", fontWeight: 600, cursor: "pointer", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Icon name="plus" size={13} sw={2.5} /> Ajouter un membre
              </button>
            )}

            {/* Pièces */}
            <div style={{ marginTop: 20 }}>
              <SectionTitle iconName="home" title="Les pièces" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {rooms.map((r) => {
                  const rt = tasks.filter((t) => t.roomId === r.id);
                  const rd = rt.filter((t) => t.done).length;
                  const pct = rt.length ? Math.round(rd / rt.length * 100) : 0;
                  return (
                    <button key={r.id} onClick={() => setSelRoom(r.id)} style={{ background: "white", border: "1.5px solid var(--border)", borderRadius: 14, padding: "12px 12px 10px", textAlign: "left", cursor: "pointer", position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", inset: 0, background: r.color, opacity: 0.04 }} />
                      {r.id !== "r-general" && (
                        <button onClick={(e) => { e.stopPropagation(); deleteRoom(r.id); }} style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,.06)", border: "none", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 1, color: "var(--muted)" }}>
                          <Icon name="x" size={10} sw={2.5} />
                        </button>
                      )}
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: r.color + "18", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 6 }}>
                        <Icon name={r.icon} size={16} color={r.color} />
                      </div>
                      <div style={{ fontWeight: 700, fontSize: ".78rem", marginBottom: 2 }}>{r.name}</div>
                      <div style={{ fontSize: ".65rem", color: "var(--muted)", marginBottom: 6 }}>{rt.length - rd} à faire</div>
                      <div style={{ height: 3, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: r.color }} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {showRoomAddForm ? (
                <div style={{ background: "var(--soft)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, marginTop: 8, animation: "fadeUp .2s ease" }}>
                  <input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Nom de la pièce…" style={{ ...inputStyle, background: "white", marginBottom: 10 }} autoFocus />
                  <div style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".5px" }}>Icône</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    {(["sofa", "chef", "bath", "bed", "door", "dog", "child", "broom", "home", "sparkle", "briefcase", "star", "bell"] as IconName[]).map((ic) => (
                      <button key={ic} onClick={() => setRoomIcon(ic)} style={{ width: 34, height: 34, borderRadius: 8, border: `2px solid ${roomIcon === ic ? "var(--text)" : "var(--border)"}`, background: roomIcon === ic ? "var(--text)" : "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                        <Icon name={ic} size={15} color={roomIcon === ic ? "white" : "var(--muted)"} sw={1.8} />
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: ".72rem", fontWeight: 700, color: "var(--muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".5px" }}>Couleur</div>
                  <div style={{ display: "flex", gap: 7, marginBottom: 12 }}>
                    {MEMBER_COLORS.map((c, ci) => (
                      <div key={ci} onClick={() => setRoomColorIdx(ci)} style={{ width: 22, height: 22, borderRadius: "50%", background: c.color, cursor: "pointer", boxShadow: roomColorIdx === ci ? `0 0 0 2px white, 0 0 0 4px ${c.color}` : "none", transition: "box-shadow .15s" }} />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => { if (!roomName.trim()) return; addRoom({ name: roomName.trim(), icon: roomIcon, color: MEMBER_COLORS[roomColorIdx].color }); setRoomName(""); setRoomIcon("home"); setRoomColorIdx(0); setShowRoomAddForm(false); }}
                      style={{ ...primaryBtn, flex: 1, fontSize: ".82rem" }}
                    >Ajouter</button>
                    <button onClick={() => setShowRoomAddForm(false)} style={{ ...ghostBtn, fontSize: ".82rem" }}>Annuler</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowRoomAddForm(true)} style={{ width: "100%", padding: "9px", background: "var(--soft)", border: "1.5px dashed var(--border)", borderRadius: 12, color: "var(--muted)", fontSize: ".78rem", fontWeight: 600, cursor: "pointer", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Icon name="plus" size={13} sw={2.5} /> Ajouter une pièce
                </button>
              )}
            </div>

            {/* Compte */}
            <div style={{ marginTop: 20, background: "var(--soft)", border: "1px solid var(--border)", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: "#EEE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="mail" size={16} color="var(--muted)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: ".82rem" }}>Compte famille</div>
                <div style={{ fontSize: ".68rem", color: "var(--muted)", marginTop: 1 }}>{userEmail}</div>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", boxShadow: "0 0 6px var(--green)" }} />
            </div>
          </>
        )}

        {/* ── PIÈCE DÉTAIL ── */}
        {section === "foyer" && selRoom && room && (
          <div style={{ animation: "fadeUp .25s ease" }}>
            <button onClick={() => { setSelRoom(null); setShowRoomForm(false); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: ".8rem", fontWeight: 600, marginBottom: 12, padding: 0 }}>
              <Icon name="chevronLeft" size={14} /> Toutes les pièces
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: room.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={room.icon} size={18} color={room.color} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "1rem" }}>{room.name}</div>
                <div style={{ fontSize: ".68rem", color: "var(--muted)" }}>{roomTasks.filter((t) => !t.done).length} à faire · {roomTasks.filter((t) => t.done).length} faites</div>
              </div>
            </div>
            {roomTasks.length > 0 && (
              <div style={{ height: 4, background: "var(--soft)", borderRadius: 99, overflow: "hidden", marginBottom: 12 }}>
                <div style={{ height: "100%", width: `${Math.round(roomTasks.filter((t) => t.done).length / roomTasks.length * 100)}%`, background: room.color, transition: "width .5s" }} />
              </div>
            )}
            {roomTasks.length === 0 && !showRoomForm && (
              <div style={{ textAlign: "center", padding: "16px 0 8px", color: "var(--muted2)", fontSize: ".8rem", fontStyle: "italic" }}>Aucune tâche pour cette pièce 🧹</div>
            )}
            {roomTasks.map((t) => (
              <FullTaskCard key={t.id} task={t} members={members} rooms={rooms} onToggle={toggleTask} onDelete={deleteTask} onEdit={setEditingTask} />
            ))}

            {showRoomForm ? (
              <div style={{ background: "var(--soft)", border: "1.5px solid var(--border)", borderRadius: 14, padding: 14, marginTop: 8, animation: "fadeUp .2s ease" }}>
                <input autoFocus value={rfName} onChange={(e) => setRfName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !roomConflict && submitRoomTask()} placeholder={`Nouvelle tâche — ${room.name}…`} style={{ ...inputStyle, marginBottom: 8, background: "white" }} />
                <MemberToggleBar members={members} selected={rfMs} onChange={setRfMs} />
                <select value={rfDay} onChange={(e) => setRfDay(e.target.value)} style={{ ...inputStyle, marginBottom: 8, background: "white" }}>
                  {DAYS_F.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 5, flex: 2 }}>
                    {(["low", "med", "high"] as Priority[]).map((p) => {
                      const c = PRIORITY_CONFIG[p];
                      return <button key={p} onClick={() => setRfP(p)} style={{ flex: 1, padding: "7px 4px", border: `1.5px solid ${rfP === p ? c.color : "var(--border)"}`, borderRadius: 8, background: rfP === p ? c.bg : "white", color: rfP === p ? c.color : "var(--muted)", fontSize: ".68rem", fontWeight: 700, cursor: "pointer" }}>{c.label}</button>;
                    })}
                  </div>
                  <input type="time" value={rfTime} onChange={(e) => setRfTime(e.target.value)} style={{ ...inputStyle, flex: 1, background: "white" }} />
                </div>
                <WorkConflictAlert conflict={roomConflict} />
                <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
                  {(["once", "daily", "weekly", "monthly"] as Recurrence[]).map((rec) => {
                    const a = rfRec === rec;
                    return <button key={rec} onClick={() => setRfRec(rec)} style={{ flex: 1, padding: "6px 4px", border: `1.5px solid ${a ? "var(--text)" : "var(--border)"}`, borderRadius: 8, background: a ? "var(--text)" : "white", color: a ? "white" : "var(--muted)", fontSize: ".65rem", fontWeight: 700, cursor: "pointer" }}>{RECURRENCE_CONFIG[rec].short}</button>;
                  })}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={submitRoomTask} disabled={!!roomConflict} style={{ ...primaryBtn, flex: 1, padding: "9px 16px", fontSize: ".82rem", opacity: roomConflict ? 0.6 : 1, cursor: roomConflict ? "not-allowed" : "pointer" }}>
                    {roomConflict ? "⚠️ Conflit" : "Ajouter ✓"}
                  </button>
                  <button onClick={() => setShowRoomForm(false)} style={{ ...ghostBtn, padding: "9px 16px", fontSize: ".82rem" }}>Annuler</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowRoomForm(true)} style={{ width: "100%", padding: "10px", background: "var(--soft)", border: `1.5px dashed ${room.color}60`, borderRadius: 12, color: room.color, fontSize: ".8rem", fontWeight: 600, cursor: "pointer", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Icon name="plus" size={14} color={room.color} sw={2.5} /> Ajouter une tâche — {room.name}
              </button>
            )}
          </div>
        )}

        {/* ── CUISINE ── */}
        {section === "cuisine" && (
          <>
            <SectionTitle iconName="chef" title="Planning repas" />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              {DAYS_F.map((d, i) => {
                const di = i as DayIndex;
                return (
                  <div key={i} style={{ background: "var(--soft)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: di === todayIdx() ? "#FEF9C3" : "white", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, fontSize: ".8rem" }}>{DAYS_S2[i]}</div>
                    {ed === di ? (
                      <div style={{ display: "flex", flex: 1, gap: 8 }}>
                        <input value={miVal} onChange={(e) => setMiVal(e.target.value)} placeholder="Nom du repas…" style={{ ...inputStyle, flex: 1, padding: "6px 10px", fontSize: ".8rem", background: "white" }} onKeyDown={(e) => { if (e.key === "Enter") { updateMeals({ ...meals, [di]: miVal }); setEd(null); } }} autoFocus />
                        <button onClick={() => { updateMeals({ ...meals, [di]: miVal }); setEd(null); }} style={{ ...primaryBtn, padding: "6px 14px", fontSize: ".75rem" }}>OK</button>
                      </div>
                    ) : (
                      <div style={{ flex: 1, cursor: "pointer" }} onClick={() => { setEd(di); setMiVal(meals[di] || ""); }}>
                        {meals[di] ? <span style={{ fontWeight: 600, fontSize: ".875rem" }}>{meals[di]}</span> : <span style={{ color: "var(--muted2)", fontSize: ".8rem", fontStyle: "italic" }}>Cliquer pour ajouter…</span>}
                      </div>
                    )}
                    {meals[di] && ed !== di && (
                      <button onClick={() => updateMeals({ ...meals, [di]: "" })} style={{ background: "none", border: "none", color: "var(--muted2)", cursor: "pointer", padding: 5, display: "flex" }}>
                        <Icon name="x" size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <SectionTitle iconName="cart" title={`Courses${groceries.filter((g) => !g.done).length > 0 ? " · " + groceries.filter((g) => !g.done).length + " restant" + (groceries.filter((g) => !g.done).length > 1 ? "s" : "") : ""}`} />
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input value={gn} onChange={(e) => setGn(e.target.value)} placeholder="Article…" style={{ ...inputStyle, flex: 1, background: "white" }} onKeyDown={(e) => { if (e.key === "Enter" && gn.trim()) { addGrocery({ name: gn.trim(), qty: gqVal, done: false }); setGn(""); setGqVal(""); } }} />
              <input value={gqVal} onChange={(e) => setGqVal(e.target.value)} placeholder="Qté" style={{ ...inputStyle, width: 70, background: "white" }} />
              <button onClick={() => { if (gn.trim()) { addGrocery({ name: gn.trim(), qty: gqVal, done: false }); setGn(""); setGqVal(""); } }} style={{ ...primaryBtn, padding: "10px 14px" }}>
                <Icon name="plus" size={18} sw={2.4} />
              </button>
            </div>
            {groceries.length === 0 ? <Empty iconName="cart" text="Liste de courses vide" /> : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {groceries.map((g) => (
                  <div key={g.id} onClick={() => toggleGroc(g.id)} style={{ background: "var(--soft)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", opacity: g.done ? 0.5 : 1, transition: "opacity .2s" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${g.done ? "var(--green)" : "var(--border)"}`, background: g.done ? "var(--green)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: ".75rem", flexShrink: 0, transition: "all .2s" }}>{g.done ? "✓" : ""}</div>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: ".875rem", textDecoration: g.done ? "line-through" : "none" }}>{g.name}</span>
                    {g.qty && <span style={{ fontSize: ".75rem", color: "var(--muted2)", fontWeight: 600 }}>{g.qty}</span>}
                    <button onClick={(e) => { e.stopPropagation(); deleteGroc(g.id); }} style={{ background: "none", border: "none", color: "var(--muted2)", cursor: "pointer", padding: 5, display: "flex" }}>
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── RAPPELS ── */}
        {section === "rappels" && (
          <>
            <div style={{ background: "var(--soft)", border: "1px solid var(--border)", borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input value={reEmojiVal} onChange={(e) => setReEmojiVal(e.target.value)} style={{ ...inputStyle, width: 60, textAlign: "center", fontSize: "1.2rem", background: "white" }} />
                <input value={rt} onChange={(e) => setRt(e.target.value)} placeholder="Titre du rappel…" style={{ ...inputStyle, flex: 1, background: "white" }} onKeyDown={(e) => { if (e.key === "Enter" && rt.trim()) { addReminder({ title: rt.trim(), time: reTime, day: parseInt(reDayVal) as DayIndex, emoji: reEmojiVal || "🔔" }); setRt(""); setReTime(""); } }} />
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <select value={reDayVal} onChange={(e) => setReDayVal(e.target.value)} style={{ ...inputStyle, flex: 1, background: "white" }}>
                  {DAYS_F.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
                <input type="time" value={reTime} onChange={(e) => setReTime(e.target.value)} style={{ ...inputStyle, flex: 1, background: "white" }} />
              </div>
              <button
                onClick={() => { if (rt.trim()) { addReminder({ title: rt.trim(), time: reTime, day: parseInt(reDayVal) as DayIndex, emoji: reEmojiVal || "🔔" }); setRt(""); setReTime(""); } }}
                style={{ ...primaryBtn, width: "100%" }}
              >
                <Icon name="plus" size={16} sw={2.2} /> Ajouter le rappel
              </button>
            </div>
            {reminders.length === 0 ? <Empty iconName="bell" text="Aucun rappel configuré" /> :
              DAYS_F.map((d, i) => {
                const dr = reminders.filter((r) => r.day === i as DayIndex);
                if (dr.length === 0) return null;
                return (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: ".68rem", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 }}>{d}</div>
                    {dr.map((r) => (
                      <div key={r.id} style={{ background: "#EDE9FE", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                        <span style={{ fontSize: "1.3rem" }}>{r.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: ".875rem", color: "#4C3899" }}>{r.title}</div>
                          {r.time && <div style={{ fontSize: ".7rem", color: "#7C5CD9" }}>{r.time}</div>}
                        </div>
                        <button onClick={() => deleteRem(r.id)} style={{ background: "none", border: "none", color: "#7C5CD9", cursor: "pointer", padding: 5, display: "flex", opacity: 0.6 }}>
                          <Icon name="x" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })
            }
          </>
        )}
      </div>

      {editingTask && (
        <EditTaskModal task={editingTask} members={members} rooms={rooms} onSave={updateTask} onClose={() => setEditingTask(null)} />
      )}
    </div>
  );
}

