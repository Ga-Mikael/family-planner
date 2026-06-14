import { useState } from "react";
import type { Task, Member, Room, DayIndex, Priority, Recurrence } from "../../types";
import { MemberToggleBar } from "../ui/MemberToggleBar";
import { WorkConflictAlert } from "../ui/WorkConflictAlert";
import { newId, todayIdx, getWorkConflict } from "../../lib/utils";
import { DAYS_F, PRIORITY_CONFIG, RECURRENCE_CONFIG } from "../../lib/constants";
import { inputStyle, primaryBtn, ghostBtn } from "../../styles";

interface TaskFormProps {
  members: Member[];
  /** Liste des pièces — affiche le sélecteur si fournie et pas de fixedRoomId. */
  rooms?: Room[];
  /** Pièce imposée (vue détail d'une pièce) — masque le sélecteur. */
  fixedRoomId?: string;
  /** Jour imposé (ajout depuis un jour précis) — masque le sélecteur de jour. */
  fixedDay?: DayIndex;
  /** dueDate (YYYY-MM-DD) appliquée aux tâches "une fois" créées pour un jour précis. */
  fixedDate?: string;
  /** Affiche les boutons de récurrence (défaut true). */
  showRecurrence?: boolean;
  /** Affiche le champ note (défaut false). */
  showNote?: boolean;
  placeholder?: string;
  initialName?: string;
  onSubmit: (t: Task) => void;
  onCancel: () => void;
}

/**
 * Formulaire d'ajout de tâche partagé entre Home, Tâches, Agenda et Foyer.
 * Gère son propre état + le contrôle de conflit horaires travail/école.
 */
export function TaskForm({
  members, rooms, fixedRoomId, fixedDay, fixedDate,
  showRecurrence = true, showNote = false,
  placeholder = "Nom de la tâche…", initialName = "",
  onSubmit, onCancel,
}: TaskFormProps) {
  const [name, setName] = useState(initialName);
  const [ms,   setMs]   = useState<string[]>([]);
  const [room, setRoom] = useState(fixedRoomId ?? "r-general");
  const [day,  setDay]  = useState<DayIndex>(fixedDay ?? todayIdx());
  const [prio, setPrio] = useState<Priority>("med");
  const [rec,  setRec]  = useState<Recurrence>("once");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");

  const conflict = getWorkConflict(ms.join(","), day, time, members);

  const submit = () => {
    if (!name.trim() || conflict) return;
    onSubmit({
      id: newId("t"),
      name: name.trim(),
      memberId: ms.join(","),
      roomId: fixedRoomId ?? room,
      day,
      priority: prio,
      recurrence: showRecurrence ? rec : "once",
      done: false,
      dueTime: time || undefined,
      note: showNote && note ? note : undefined,
      dueDate: (showRecurrence ? rec : "once") === "once" && fixedDate ? fixedDate : undefined,
    });
  };

  return (
    <div style={{ background: "var(--soft)", border: "1.5px solid var(--border)", borderRadius: 14, padding: 14, animation: "fadeUp .2s ease" }}>
      <input
        autoFocus
        aria-label="Nom de la tâche"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder={placeholder}
        style={{ ...inputStyle, marginBottom: 8, background: "var(--surface)" }}
      />
      <MemberToggleBar members={members} selected={ms} onChange={setMs} />

      {fixedDay === undefined && (
        <select aria-label="Jour" value={day} onChange={(e) => setDay(parseInt(e.target.value) as DayIndex)} style={{ ...inputStyle, marginBottom: 8, background: "var(--surface)" }}>
          {DAYS_F.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {rooms && !fixedRoomId && (
          <select aria-label="Pièce" value={room} onChange={(e) => setRoom(e.target.value)} style={{ ...inputStyle, flex: 1, background: "var(--surface)" }}>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        )}
        <input aria-label="Heure" type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...inputStyle, flex: 1, background: "var(--surface)" }} />
      </div>

      <div role="radiogroup" aria-label="Priorité" style={{ display: "flex", gap: 5, marginBottom: 8 }}>
        {(["low", "med", "high"] as Priority[]).map((p) => {
          const c = PRIORITY_CONFIG[p];
          const active = prio === p;
          return (
            <button
              key={p}
              role="radio"
              aria-checked={active}
              onClick={() => setPrio(p)}
              style={{ flex: 1, padding: "7px 4px", border: `1.5px solid ${active ? c.color : "var(--border)"}`, borderRadius: 8, background: active ? c.bg : "var(--surface)", color: active ? c.color : "var(--muted)", fontSize: ".7rem", fontWeight: 700, cursor: "pointer" }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {showRecurrence && (
        <div role="radiogroup" aria-label="Récurrence" style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
          {(["once", "daily", "weekly", "monthly", "annual"] as Recurrence[]).map((r) => {
            const active = rec === r;
            return (
              <button
                key={r}
                role="radio"
                aria-checked={active}
                onClick={() => setRec(r)}
                style={{ flex: "1 1 0", minWidth: 52, padding: "6px 4px", border: `1.5px solid ${active ? "var(--text)" : "var(--border)"}`, borderRadius: 8, background: active ? "var(--text)" : "var(--surface)", color: active ? "var(--bg)" : "var(--muted)", fontSize: ".65rem", fontWeight: 700, cursor: "pointer" }}
              >
                {RECURRENCE_CONFIG[r].short}
              </button>
            );
          })}
        </div>
      )}

      {showNote && (
        <input aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note optionnelle…" style={{ ...inputStyle, marginBottom: 8, background: "var(--surface)", fontSize: ".8rem" }} />
      )}

      <WorkConflictAlert conflict={conflict} />

      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={submit}
          disabled={!!conflict}
          style={{ ...primaryBtn, flex: 1, padding: "9px 16px", fontSize: ".82rem", opacity: conflict ? 0.6 : 1, cursor: conflict ? "not-allowed" : "pointer" }}
        >
          {conflict ? "⚠️ Conflit" : "Ajouter ✓"}
        </button>
        <button onClick={onCancel} style={{ ...ghostBtn, padding: "9px 16px", fontSize: ".82rem" }}>Annuler</button>
      </div>
    </div>
  );
}
