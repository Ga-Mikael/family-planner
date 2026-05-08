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
      background: "var(--nav-bg)",
      borderTop: "1px solid var(--nav-border)",
      display: "flex", zIndex: 100,
      padding: "6px 4px 14px",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      transition: "background .4s, border-color .4s",
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
              gap: 3, padding: "2px 0",
              transition: "color .2s",
              position: "relative",
            }}
          >
            {/* Active bubble */}
            <div style={{
              width: 42, height: 32, borderRadius: 11,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: isActive ? "var(--accent-bg)" : "transparent",
              transition: "background .25s",
            }}>
              <Icon
                name={item.icon}
                size={20}
                sw={isActive ? 2.2 : 1.7}
                color={isActive ? "var(--accent)" : "var(--muted2)"}
              />
            </div>
            <span style={{
              fontSize: ".58rem",
              fontWeight: isActive ? 800 : 600,
              color: isActive ? "var(--accent)" : "var(--muted2)",
              transition: "color .2s",
            }}>
              {item.label}
            </span>

            {/* Weekend warning dot */}
            {item.id === "schedule" && weekendWarn && (
              <span style={{
                position: "absolute", top: 2, right: "18%",
                width: 7, height: 7, background: "var(--warn)",
                borderRadius: "50%", animation: "pulse 1.5s infinite",
              }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
