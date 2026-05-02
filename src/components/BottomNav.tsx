import { Icon } from "./ui/Icon";
import type { TabId, IconName } from "../types";

interface BottomNavProps {
  tab: TabId;
  setTab: (t: TabId) => void;
  weekendWarn: boolean;
}

const NAV_ITEMS: { id: TabId; icon: IconName; label: string }[] = [
  { id: "home",     icon: "home",      label: "Accueil"  },
  { id: "tasks",    icon: "check",     label: "Tâches"   },
  { id: "agenda",   icon: "calendar",  label: "Agenda"   },
  { id: "schedule", icon: "briefcase", label: "Planning" },
  { id: "family",   icon: "users",     label: "Foyer"    },
];

export function BottomNav({ tab, setTab, weekendWarn }: BottomNavProps) {
  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 430,
      background: "white", borderTop: "1px solid var(--border)",
      display: "flex", zIndex: 100, padding: "7px 0 10px",
    }}>
      {NAV_ITEMS.map((item) => {
        const isActive = tab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{
              flex: 1, border: "none", background: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, padding: "3px 0",
              color:      isActive ? "var(--text)" : "var(--muted2)",
              transition: "color .2s",
              position:   "relative",
            }}
          >
            <Icon name={item.icon} size={21} sw={isActive ? 2.2 : 1.7} />
            <span style={{ fontSize: ".58rem", fontWeight: isActive ? 700 : 500 }}>{item.label}</span>

            {/* Point d'alerte weekend */}
            {item.id === "schedule" && weekendWarn && (
              <span style={{
                position: "absolute", top: 2, right: "18%",
                width: 7, height: 7, background: "#F59E0B",
                borderRadius: "50%", animation: "pulse 1.5s infinite",
              }} />
            )}

            {/* Indicateur onglet actif */}
            {isActive && (
              <div style={{
                position: "absolute", top: 0, left: "25%", right: "25%",
                height: 2, background: "var(--text)", borderRadius: 99,
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
