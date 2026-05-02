import type { CSSProperties } from "react";

// ─── CSS global injecté dans <head> ───────────────────────────────────────
export const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #FFFFFF;
  --soft: #F7F8FA;
  --soft2: #F0F2F5;
  --border: #E5E7EB;
  --text: #111827;
  --muted: #6B7280;
  --muted2: #9CA3AF;
  --accent: #3B82F6;
  --accent-bg: #EFF6FF;
  --warn: #F59E0B;
  --warn-bg: #FFFBEB;
  --danger: #EF4444;
  --danger-bg: #FEF2F2;
  --green: #10B981;
  --green-bg: #ECFDF5;
}

body {
  font-family: 'Inter', sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

input, select, textarea, button { font-family: 'Inter', sans-serif; }

::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 99px; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes confDrop {
  0%   { transform: translateY(-10px) rotate(0);      opacity: 1; }
  100% { transform: translateY(90px)  rotate(720deg); opacity: 0; }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: .4; }
}
@keyframes spin { to { transform: rotate(360deg); } }
`;

// ─── Styles partagés entre les composants ─────────────────────────────────

/** Style de base pour les <input> et <select> */
export const inputStyle: CSSProperties = {
  background:   "var(--soft)",
  border:       "1.5px solid var(--border)",
  borderRadius: 10,
  padding:      "10px 14px",
  color:        "var(--text)",
  fontSize:     ".875rem",
  fontWeight:   500,
  outline:      "none",
  width:        "100%",
};

/** Bouton principal (fond sombre) */
export const primaryBtn: CSSProperties = {
  background:     "var(--text)",
  border:         "none",
  borderRadius:   12,
  padding:        "11px 20px",
  color:          "white",
  fontSize:       ".875rem",
  fontWeight:     700,
  cursor:         "pointer",
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  gap:            6,
};

/** Bouton secondaire (fond clair) */
export const ghostBtn: CSSProperties = {
  ...primaryBtn,
  background: "var(--soft)",
  border:     "1.5px solid var(--border)",
  color:      "var(--muted)",
};

/** Bouton de navigation (petite flèche) */
export const navBtn: CSSProperties = {
  width:          32,
  height:         32,
  borderRadius:   8,
  border:         "1px solid var(--border)",
  background:     "var(--soft)",
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  cursor:         "pointer",
  color:          "var(--muted)",
};
