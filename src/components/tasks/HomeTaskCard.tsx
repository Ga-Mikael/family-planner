import { useRef, useState } from "react";
import type { Task, Member, Room } from "../../types";
import { Icon } from "../ui/Icon";
import { isTaskDoneOn, parseMemberIds } from "../../lib/utils";
import { PASTEL, RECURRENCE_CONFIG } from "../../lib/constants";

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
  const bg    = primaryMember?.avatarBg || PASTEL[2].bg;
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
        display: "flex", alignItems: "stretch", gap: 10,
        marginBottom: 8, cursor: "pointer",
        opacity: isDone ? .45 : 1,
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
          position: "absolute", left: 44, right: 0, top: 0, bottom: 8,
          borderRadius: 13, background: "var(--green-bg)",
          display: "flex", alignItems: "center", paddingLeft: 14,
          opacity: Math.min(swipeOffset / 60, 1),
          pointerEvents: "none",
        }}>
          <Icon name="check" size={18} color="var(--green)" sw={2.5} />
        </div>
      )}

      {/* Colonne heure */}
      <div style={{ width: 44, flexShrink: 0, paddingTop: 10 }}>
        {task.dueTime ? (
          <>
            <div style={{ fontSize: ".8rem", fontWeight: 700, lineHeight: 1 }}>{task.dueTime}</div>
            <div style={{ fontSize: ".65rem", color: "var(--muted2)", marginTop: 2 }}>1 tâche</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: ".75rem", fontWeight: 600, color: "var(--muted)", lineHeight: 1 }}>Journée</div>
            <div style={{ fontSize: ".65rem", color: "var(--muted2)", marginTop: 2 }}>1 tâche</div>
          </>
        )}
      </div>

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
          borderRadius: 13,
          padding: "10px 12px", display: "flex", alignItems: "center",
          gap: 10, position: "relative", minHeight: 52,
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 ? "transform .2s ease" : "none",
        }}
      >
        {/* Checkbox */}
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          border: `2.5px solid ${isDone ? "var(--green)" : "var(--border)"}`,
          background: isDone ? "var(--green)" : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, color: "white", fontSize: ".7rem", transition: "all .2s",
        }}>
          {isDone && <Icon name="check" size={11} color="white" sw={3} />}
        </div>

        {/* Nom + pièce */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: ".875rem", color,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            textDecoration: isDone ? "line-through" : "none",
          }}>
            {task.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
            {room && (
              <span style={{ fontSize: ".62rem", fontWeight: 600, color, opacity: .7, display: "flex", alignItems: "center", gap: 2 }}>
                <Icon name={room.icon} size={10} color={color} />{room.name}
              </span>
            )}
            {task.recurrence !== "once" && (
              <span style={{ fontSize: ".6rem", fontWeight: 700, color, opacity: .6 }}>{rec.short}</span>
            )}
          </div>
        </div>

        {/* Avatars membres */}
        {taskMembers.length > 0 && (
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            {taskMembers.map((m) => (
              <div key={m.id} style={{
                width: 28, height: 28, borderRadius: "50%", background: "var(--surface)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1rem", border: `2px solid ${color}25`,
              }}>
                {m.emoji}
              </div>
            ))}
          </div>
        )}

        {/* Point priorité haute */}
        {task.priority === "high" && !isDone && (
          <div style={{ position: "absolute", top: 6, right: 8, width: 6, height: 6, borderRadius: "50%", background: "var(--danger)" }} />
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
