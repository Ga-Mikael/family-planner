import type { CSSProperties } from "react";

export const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ── Day tokens (Pastel Kawaii) ── */
:root {
  --bg:          #FEF9F5;
  --surface:     #FFFFFF;
  --soft:        #FAF6F2;
  --soft2:       #F5F0EA;
  --border:      #F0E8E0;
  --text:        #3D2B1F;
  --muted:       #9B7F73;
  --muted2:      #C4A89E;
  --accent:      #FF7BB5;
  --accent-bg:   #FFF0F6;
  --warn:        #FFB347;
  --warn-bg:     #FFF7ED;
  --danger:      #FF5C5C;
  --danger-bg:   #FFF0F0;
  --green:       #4ECDC4;
  --green-bg:    #EDFAF9;
  --violet:      #A78BFA;
  --violet-bg:   #F3F0FF;
  --card-shadow: 0 3px 12px rgba(0,0,0,.05);
  --card-border: transparent;
  --nav-bg:      #FFFFFF;
  --nav-border:  #F0E8E0;
  --font-body:   'Nunito', system-ui, sans-serif;
}

/* ── Night tokens (Glass / iOS) ── */
[data-theme="dark"] {
  --bg:          #0C1020;
  --surface:     rgba(255,255,255,.1);
  --soft:        rgba(255,255,255,.07);
  --soft2:       rgba(255,255,255,.04);
  --border:      rgba(255,255,255,.15);
  --text:        #FFFFFF;
  --muted:       rgba(255,255,255,.55);
  --muted2:      rgba(255,255,255,.3);
  --accent:      #A5B4FC;
  --accent-bg:   rgba(165,180,252,.15);
  --warn:        #FCD34D;
  --warn-bg:     rgba(252,211,77,.1);
  --danger:      #FCA5A5;
  --danger-bg:   rgba(252,165,165,.1);
  --green:       #6EE7B7;
  --green-bg:    rgba(110,231,183,.12);
  --violet:      #C4B5FD;
  --violet-bg:   rgba(196,181,253,.12);
  --card-shadow: none;
  --card-border: rgba(255,255,255,.14);
  --nav-bg:      rgba(8,12,26,.82);
  --nav-border:  rgba(255,255,255,.1);
  --font-body:   'Plus Jakarta Sans', system-ui, sans-serif;
}

body {
  font-family: var(--font-body);
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  transition: background .4s ease, color .4s ease;
}

/* Night mode gradient background */
[data-theme="dark"] body {
  background:
    radial-gradient(ellipse 380px 280px at 85% 5%,  rgba(79,70,229,.55)  0%, transparent 65%),
    radial-gradient(ellipse 300px 340px at -5% 68%, rgba(14,165,233,.45) 0%, transparent 65%),
    radial-gradient(ellipse 240px 180px at 102% 88%,rgba(109,40,217,.45) 0%, transparent 65%),
    #0C1020;
  background-attachment: fixed;
}

input, select, textarea, button { font-family: var(--font-body); }

::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

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

/* Card base style usable via className */
.fp-card {
  background: var(--surface);
  border: 1px solid var(--card-border);
  box-shadow: var(--card-shadow);
  border-radius: 18px;
  backdrop-filter: var(--card-blur, none);
}
[data-theme="dark"] .fp-card {
  --card-blur: blur(20px);
}

[data-theme="dark"] .fp-app-root {
  background: transparent;
}

.fp-home-header {
  padding: 52px 18px 18px;
  transition: background .5s;
}
:root .fp-home-header {
  background: linear-gradient(155deg, #FFDDE9 0%, #FFE8CC 100%);
}
[data-theme="dark"] .fp-home-header {
  background: transparent;
}

.fp-tasks-header {
  padding: 52px 18px 0;
  transition: background .5s;
}
:root .fp-tasks-header {
  background: linear-gradient(155deg, #FFDDE9 0%, #EDE8FF 100%);
}
[data-theme="dark"] .fp-tasks-header {
  background: transparent;
}

.fp-agenda-header {
  padding: 52px 18px 18px;
  transition: background .5s;
}
:root .fp-agenda-header {
  background: linear-gradient(155deg, #EDE8FF 0%, #FFE8CC 100%);
}
[data-theme="dark"] .fp-agenda-header {
  background: transparent;
}

.fp-tab-bar {
  transition: background .4s;
}
[data-theme="dark"] .fp-tab-bar {
  background: rgba(255,255,255,.07) !important;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 14px;
}
`;

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
