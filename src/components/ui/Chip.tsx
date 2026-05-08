interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      style={{
        background:    active ? "var(--accent)" : "var(--soft)",
        border:        `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
        borderRadius:  50,
        padding:       "5px 13px",
        fontSize:      ".72rem",
        fontWeight:    800,
        color:         active ? "white" : "var(--muted)",
        boxShadow:     active ? "0 3px 10px rgba(255,123,181,.3)" : "none",
        cursor:        "pointer",
        whiteSpace:    "nowrap",
        flexShrink:    0,
        transition:    "all .2s",
      }}
    >
      {label}
    </button>
  );
}
