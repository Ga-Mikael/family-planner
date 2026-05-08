import { useRef, useState } from "react";
import type { Task, Member, Room } from "../../types";
import { Icon } from "../ui/Icon";
import { isTaskDoneOn, parseMemberIds } from "../../lib/utils";
import { RECURRENCE_CONFIG } from "../../lib/constants";

interface HomeTaskCardProps {
  task: Task;
  members: Member[];
  rooms: Room[];
  onToggle: (id: string, dateStr?: string) => void;
  onDelete: (id: string) => void;
  onEdit: (t: Task) => void;
  /** Date de l'occurrence affichée — pour valider uniquement ce jour-là */
  dateStr?: string;
}

export function HomeTaskCard({ task, members, rooms, onToggle, onDelete, onEdit, dateStr }: HomeTaskCardProps) {
  const memberIds   = parseMemberIds(task.memberId);
  const taskMembers = memberIds.map((id) => members.find((x) => x.id === id)).filter(Boolean) as Member[];
  const primaryMember = taskMembers[0];
  const room = rooms.find((x) => x.id === task.roomId);

  const color = primaryMember?.color || room?.color || "#6B7280";
  const rec   = RECURRENCE_CONFIG[task.recurrence];

  // "fait" pour cette occurrence précise
  const isDone = dateStr ? isTaskDoneOn(task, dateStr) : task.done;

  // ── Swipe pour valider ───────────────────────────────────────────────────
  const touchStartX = useRef<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.touches[0].clientX - touchStartX.current;
    if (delta > 0) setSwipeOffset(Math.min(delta, 90));
  };
  const onTouchEnd = () => {
    if (swipeOffset > 60) onToggle(task.id, dateStr);
    setSwipeOffset(0);
    touchStartX.current = null;
  };

  return (
    <div
      style={{
        marginBottom: 8, cursor: "pointer",
        animation: "fadeUp .2s ease",
        position: "relative",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Fond vert visible pendant le swipe */}
      {swipeOffset > 0 && (
        <div style={{
          position: "absolute", inset: 0,
          borderRadius: 20, background: "var(--green-bg)",
          display: "flex", alignItems: "center", paddingLeft: 14,
          opacity: Math.min(swipeOffset / 60, 1),
          pointerEvents: "none",
        }}>
          <Icon name="check" size={18} color="var(--green)" sw={2.5} />
        </div>
      )}

      {/* Carte principale */}
      <div
        onClick={() => onToggle(task.id, dateStr)}
        style={{
          flex: 1,
          background: "var(--surface)",
          border: "1px solid var(--card-border)",
          boxShadow: "var(--card-shadow)",
          backdropFilter: "var(--card-blur, none)",
          WebkitBackdropFilter: "var(--card-blur, none)",
          borderRadius: 20,
          padding: "12px 12px", display: "flex", alignItems: "center",
          gap: 10, position: "relative", minHeight: 56,
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 ? "transform .2s ease" : "none",
        }}
      >
        {/* Checkbox — rounded square like mockup */}
        <div style={{
          width: 24, height: 24, borderRadius: 8,
          border: isDone ? `2px solid var(--green)` : `2px solid var(--border)`,
          background: isDone ? "var(--green)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, transition: "all .2s",
        }}>
          {isDone && <Icon name="check" size={11} color="white" sw={3} />}
        </div>

        {/* Nom + badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 800, fontSize: ".875rem", color: "var(--text)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            textDecoration: isDone ? "line-through" : "none",
            opacity: isDone ? 0.5 : 1,
          }}>
            {task.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 5, flexWrap: "wrap" }}>
            {/* Member badge */}
            {taskMembers[0] && (
              <span style={{ fontSize: ".65rem", fontWeight: 800, padding: "2px 7px", borderRadius: 20, background: "var(--accent-bg)", color: "var(--accent)" }}>
                {taskMembers[0].emoji} {taskMembers[0].name}
              </span>
            )}
            {/* Room badge */}
            {room && (
              <span style={{ fontSize: ".65rem", fontWeight: 800, padding: "2px 7px", borderRadius: 20, background: "var(--warn-bg)", color: "var(--warn)", display: "flex", alignItems: "center", gap: 2 }}>
                <Icon name={room.icon} size={9} color="var(--warn)" />{room.name}
              </span>
            )}
            {/* Time badge */}
            {task.dueTime && (
              <span style={{ fontSize: ".65rem", fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "var(--soft)", color: "var(--muted)", display: "flex", alignItems: "center", gap: 2 }}>
                ⏰ {task.dueTime}
              </span>
            )}
            {/* Recurrence badge */}
            {task.recurrence !== "once" && (
              <span style={{ fontSize: ".65rem", fontWeight: 800, padding: "2px 7px", borderRadius: 20, background: "var(--green-bg)", color: "var(--green)" }}>
                {rec.short}
              </span>
            )}
          </div>
        </div>

        {/* Point priorité haute (udot) */}
        {task.priority === "high" && !isDone && (
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} />
        )}

        {/* Bouton modifier */}
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          style={{ position: "absolute", bottom: 5, right: 30, background: "none", border: "none", cursor: "pointer", color, opacity: .35, padding: 2, display: "flex" }}
        >
          <Icon name="edit" size={12} sw={2} />
        </button>

        {/* Bouton supprimer */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          style={{ position: "absolute", bottom: 5, right: 8, background: "none", border: "none", cursor: "pointer", color, opacity: .35, padding: 2, display: "flex" }}
        >
          <Icon name="x" size={12} sw={2.5} />
        </button>
      </div>
    </div>
  );
}
