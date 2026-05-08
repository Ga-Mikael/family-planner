import { Icon } from "./Icon";

interface WorkConflictAlertProps {
  conflict: string | null;
}

/** Affiche un bandeau d'avertissement si l'heure choisie chevauche les heures de travail */
export function WorkConflictAlert({ conflict }: WorkConflictAlertProps) {
  if (!conflict) return null;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: "var(--warn-bg)", border: "1px solid var(--warn)",
      borderRadius: 10, padding: "8px 12px", marginBottom: 8,
      animation: "fadeUp .2s ease",
    }}>
      <Icon name="briefcase" size={14} color="var(--warn)" />
      <span style={{ fontSize: ".75rem", fontWeight: 600, color: "var(--text)" }}>
        {conflict} — choisissez une heure en dehors
      </span>
    </div>
  );
}
