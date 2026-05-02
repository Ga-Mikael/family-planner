import type { Member } from "../../types";

interface MemberToggleBarProps {
  members: Member[];
  selected: string[]; // liste d'IDs de membres sélectionnés
  onChange: (ids: string[]) => void;
}

/**
 * Barre de boutons pour sélectionner un ou plusieurs membres.
 * Cliquer sur un membre l'ajoute ou le retire de la sélection.
 * Le bouton "Famille" remet la sélection à vide (= toute la famille).
 */
export function MemberToggleBar({ members, selected, onChange }: MemberToggleBarProps) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
      {/* Bouton "Famille" */}
      <button
        onClick={() => onChange([])}
        style={{
          padding:      "5px 8px",
          borderRadius: 99,
          border:       `1.5px solid ${selected.length === 0 ? "var(--text)" : "var(--border)"}`,
          background:   selected.length === 0 ? "var(--soft)" : "white",
          cursor:       "pointer",
          fontSize:     ".72rem",
          fontWeight:   selected.length === 0 ? 700 : 500,
          color:        selected.length === 0 ? "var(--text)" : "var(--muted)",
        }}
      >
        👨‍👩‍👧 Famille
      </button>

      {/* Un bouton par membre */}
      {members.map((m) => {
        const isSelected = selected.includes(m.id);
        return (
          <button
            key={m.id}
            onClick={() => toggle(m.id)}
            style={{
              display:      "flex",
              alignItems:   "center",
              gap:          4,
              padding:      "5px 8px",
              borderRadius: 99,
              border:       `1.5px solid ${isSelected ? m.color : "var(--border)"}`,
              background:   isSelected ? m.avatarBg : "white",
              cursor:       "pointer",
              fontSize:     ".72rem",
              fontWeight:   isSelected ? 700 : 500,
              color:        isSelected ? m.color : "var(--muted)",
            }}
          >
            <span>{m.emoji}</span>
            <span style={{ fontSize: ".68rem" }}>{m.name}</span>
          </button>
        );
      })}
    </div>
  );
}
