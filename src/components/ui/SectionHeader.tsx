import type { ReactNode } from "react";
import { Icon } from "./Icon";
import type { IconName } from "../../types";

interface SectionHeaderProps {
  iconName: IconName;
  title: string;
  /** Couleur du tile icône — token CSS (ex: "accent", "violet", "green"). */
  tint?: "accent" | "violet" | "green" | "warn";
  /** Contenu optionnel aligné à droite (compteur, chevron…). */
  right?: ReactNode;
  /** Rend l'en-tête cliquable (sections repliables). */
  onClick?: () => void;
  ariaExpanded?: boolean;
}

/**
 * En-tête de section unifié : tile icône colorée + titre gras.
 * Remplace l'ancien SectionTitle (texte uppercase gris).
 */
export function SectionHeader({ iconName, title, tint = "accent", right, onClick, ariaExpanded }: SectionHeaderProps) {
  const content = (
    <>
      <div style={{ width: 28, height: 28, borderRadius: 10, background: `var(--${tint}-bg)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={iconName} size={14} color={`var(--${tint})`} sw={2.2} />
      </div>
      <h2 style={{ fontWeight: 900, fontSize: "1rem", color: "var(--text)", letterSpacing: "-.2px", flex: 1, textAlign: "left" }}>{title}</h2>
      {right}
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        aria-expanded={ariaExpanded}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "0 0 10px", background: "none", border: "none", cursor: "pointer" }}
      >
        {content}
      </button>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      {content}
    </div>
  );
}
