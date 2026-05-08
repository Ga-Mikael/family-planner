import type { Task, Member, Room } from "../../types";
import { Icon } from "../ui/Icon";
import { parseMemberIds, exportToCalendar } from "../../lib/utils";
import { PRIORITY_CONFIG, RECURRENCE_CONFIG, DAYS_S2 } from "../../lib/constants";

interface FullTaskCardProps {
  task: Task;
  members: Member[];
  rooms: Room[];
  onToggle: (id: string, dateStr?: string) => void;
  onDelete: (id: string) => void;
  onEdit: (t: Task) => void;
}

export function FullTaskCard({ task, members, rooms, onToggle, onDelete, onEdit }: FullTaskCardProps) {
  const memberIds = parseMemberIds(task.memberId);
  const taskMembers = memberIds.map((id) => members.find((x) => x.id === id)).filter(Boolean) as Member[];
  const primaryMember = taskMembers[0];
  const room = rooms.find((x) => x.id === task.roomId);

  const pc = PRIORITY_CONFIG[task.priority];
  const rc = RECURRENCE_CONFIG[task.recurrence];
  const color = primaryMember?.color || room?.color || "#6B7280";

  return (
    <div style={{
      background: "var(--surface)", borderRadius: 20, padding: "12px 14px",
      marginBottom: 8, animation: "fadeUp .2s ease",
      border: `1px solid var(--card-border)`, boxShadow: "var(--card-shadow)",
      borderLeft: `3px solid ${color}`,
      opacity: task.done ? 0.45 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Checkbox */}
        <div
          onClick={() => onToggle(task.id)}
          style={{
            width: 24, height: 24, borderRadius: 8,
            border: `2px solid ${task.done ? color : "var(--border)"}`,
            background: task.done ? color : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, cursor: "pointer", transition: "all .2s",
          }}
        >
          {task.done && <Icon name="check" size={12} color="white" sw={3} />}
        </div>

        {/* Infos tâche */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: ".875rem", color,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            textDecoration: task.done ? "line-through" : "none",
          }}>
            {task.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", marginTop: 2 }}>
            <span style={{ fontSize: ".6rem", fontWeight: 700, padding: "1px 6px", borderRadius: 99, background: pc.bg, color: pc.color }}>
              {pc.label}
            </span>
            {room && (
              <span style={{ fontSize: ".6rem", color, opacity: 0.65, display: "flex", alignItems: "center", gap: 2 }}>
                <Icon name={room.icon} size={10} color={color} />{room.name}
              </span>
            )}
            <span style={{ fontSize: ".6rem", color: "var(--muted2)" }}>{DAYS_S2[task.day]}</span>
            {task.recurrence !== "once" && (
              <span style={{ fontSize: ".6rem", color, opacity: 0.65, display: "flex", alignItems: "center", gap: 2 }}>
                <Icon name="repeat" size={9} color={color} />{rc.short}
              </span>
            )}
            {task.dueTime && (
              <span style={{ fontSize: ".6rem", color: "var(--accent)", display: "flex", alignItems: "center", gap: 2 }}>
                <Icon name="clock" size={9} color="var(--accent)" />{task.dueTime}
                <Icon name="bell" size={8} color="var(--accent)" />
              </span>
            )}
          </div>
          {task.note && (
            <div style={{ fontSize: ".7rem", color: "var(--muted)", marginTop: 3, fontStyle: "italic" }}>{task.note}</div>
          )}
        </div>

        {/* Avatars membres */}
        {taskMembers.length > 0 && (
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            {taskMembers.map((m) => (
              <div key={m.id} style={{
                width: 28, height: 28, borderRadius: "50%", background: "var(--surface)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: ".95rem",
              }}>
                {m.emoji}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => exportToCalendar(task, taskMembers.map((m) => m.name))}
          title="Ajouter au calendrier Apple"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted2)", padding: 4, display: "flex" }}
        >
          <Icon name="calendar" size={13} sw={1.8} />
        </button>
        <button
          onClick={() => onEdit(task)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted2)", padding: 4, display: "flex" }}
        >
          <Icon name="edit" size={13} sw={1.8} />
        </button>
        <button
          onClick={() => onDelete(task.id)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted2)", padding: 4, display: "flex" }}
        >
          <Icon name="trash" size={13} sw={1.8} />
        </button>
      </div>
    </div>
  );
}
