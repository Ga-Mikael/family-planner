import { Icon } from "./Icon";
import type { IconName } from "../../types";

interface SectionTitleProps {
  iconName: IconName;
  title: string;
}

export function SectionTitle({ iconName, title }: SectionTitleProps) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7, marginBottom: 10,
      color: "var(--muted)", fontSize: ".68rem", fontWeight: 700,
      textTransform: "uppercase", letterSpacing: ".8px",
    }}>
      <Icon name={iconName} size={13} sw={2.2} />
      {title}
    </div>
  );
}
