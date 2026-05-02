import { useState } from "react";
import type { Task, Member, Room, Priority, Recurrence, DayIndex } from "../../types";
import { Icon } from "../ui/Icon";
import { MemberToggleBar } from "../ui/MemberToggleBar";
import { WorkConflictAlert } from "../ui/WorkConflictAlert";
import { parseMemberIds, getWorkConflict } from "../../lib/utils";
import { DAYS_F, PRIORITY_CONFIG, RECURRENCE_CONFIG } from "../../lib/constants";
import { inputStyle, primaryBtn } from "../../styles";

interface EditTaskModalProps {
  task: Task;
  members: Member[];
  rooms: Room[];
  onSave: (t: Task) => void;
  onClose: () => void;
}

export function EditTaskModal({ task, members, rooms, onSave, onClose }: EditTaskModalProps) {
  const [name,       setName]       = useState(task.name);
  const [memberIds,  setMemberIds]  = useState<string[]>(parseMemberIds(task.memberId));
  const [roomId,     setRoomId]     = useState(task.roomId);
  const [day,        setDay]        = useState<DayIndex>(task.day);
  const [priority,   setPriority]   = useState<Priority>(task.priority);
  const [recurrence, setRecurrence] = useState<Recurrence>(task.recurrence);
  const [time,       setTime]       = useState(task.dueTime || "");
  const [note,       setNote]       = useState(task.note || "");

  const conflict = getWorkConflict(memberIds.join(","), day, time, members);

  const save = () => {
    if (!name.trim() || conflict) return;
    onSave({
      ...task,
      name: name.trim(),
      memberId: memberIds.join(","),
      roomId,
      day,
      priority,
      recurrence,
      dueTime: time || undefined,
      note: note || undefined,
    });
    onClose();
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "flex-end" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        width: "100%", background: "var(--bg)", borderRadius: "20px 20px 0 0",
        padding: "20px 16px 40px", maxHeight: "85vh", overflowY: "auto",
        animation: "fadeUp .25s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <h2 style={{ fontWeight: 800, fontSize: "1rem" }}>Modifier la tâche</h2>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 8, border: "1px solid var(--border)", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <Icon name="x" size={14} />
          </button>
        </div>

        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Nom de la tâche…"
          style={{ ...inputStyle, marginBottom: 8, fontWeight: 600 }}
        />

        <div style={{ fontSize: ".65rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>
          Membres
        </div>
        <MemberToggleBar members={members} selected={memberIds} onChange={setMemberIds} />
        <WorkConflictAlert conflict={conflict} />

        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <select
            value={day}
            onChange={(e) => setDay(parseInt(e.target.value) as DayIndex)}
            style={{ ...inputStyle, flex: 1 }}
          >
            {DAYS_F.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>

        <select value={roomId} onChange={(e) => setRoomId(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }}>
          {rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>

        <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
          {(["low", "med", "high"] as Priority[]).map((p) => {
            const c = PRIORITY_CONFIG[p];
            return (
              <button
                key={p}
                onClick={() => setPriority(p)}
                style={{ flex: 1, padding: "7px 4px", border: `1.5px solid ${priority === p ? c.color : "var(--border)"}`, borderRadius: 8, background: priority === p ? c.bg : "white", color: priority === p ? c.color : "var(--muted)", fontSize: ".7rem", fontWeight: 700, cursor: "pointer" }}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
          {(["once", "daily", "weekly", "monthly"] as Recurrence[]).map((rec) => {
            const active = recurrence === rec;
            return (
              <button
                key={rec}
                onClick={() => setRecurrence(rec)}
                style={{ flex: 1, padding: "6px 4px", border: `1.5px solid ${active ? "var(--text)" : "var(--border)"}`, borderRadius: 8, background: active ? "var(--text)" : "white", color: active ? "white" : "var(--muted)", fontSize: ".65rem", fontWeight: 700, cursor: "pointer" }}
              >
                {RECURRENCE_CONFIG[rec].short}
              </button>
            );
          })}
        </div>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note optionnelle…"
          style={{ ...inputStyle, marginBottom: 12, fontSize: ".8rem" }}
        />

        <button
          onClick={save}
          disabled={!!conflict}
          style={{ ...primaryBtn, width: "100%", opacity: conflict ? 0.6 : 1, cursor: conflict ? "not-allowed" : "pointer" }}
        >
          {conflict ? "⚠️ Conflit" : "Enregistrer ✓"}
        </button>
      </div>
    </div>
  );
}
