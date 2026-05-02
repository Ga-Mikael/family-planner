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
        background:    active ? "var(--text)" : "var(--soft)",
        border:        `1.5px solid ${active ? "var(--text)" : "var(--border)"}`,
        borderRadius:  50,
        padding:       "6px 12px",
        fontSize:      ".7rem",
        fontWeight:    700,
        color:         active ? "white" : "var(--muted)",
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
