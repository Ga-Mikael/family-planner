import type { CSSProperties } from "react";

// Global stylesheet (tokens, animations, fp-* classes) lives in `./global.css`
// and is imported once from `main.tsx`. Bundled by Vite into a separate .css
// file loaded in parallel with the JS, instead of being injected at runtime.

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

export const primaryBtn: CSSProperties = {
  background:     "var(--accent)",
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

export const ghostBtn: CSSProperties = {
  background: "var(--soft)",
  border:     "1.5px solid var(--border)",
  borderRadius: 12,
  padding:    "11px 20px",
  color:      "var(--muted)",
  fontSize:   ".875rem",
  fontWeight: 700,
  cursor:     "pointer",
  display:    "flex",
  alignItems: "center",
  justifyContent: "center",
  gap:        6,
};

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
