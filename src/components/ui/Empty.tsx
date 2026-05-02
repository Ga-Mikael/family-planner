import { Icon } from "./Icon";
import type { IconName } from "../../types";

interface EmptyProps {
  iconName: IconName;
  text: string;
}

export function Empty({ iconName, text }: EmptyProps) {
  return (
    <div style={{ textAlign: "center", padding: "32px 20px", color: "var(--muted2)" }}>
      <div style={{
        width: 52, height: 52, margin: "0 auto 10px",
        borderRadius: 14, background: "var(--soft)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon name={iconName} size={24} sw={1.5} />
      </div>
      <p style={{ fontWeight: 600, fontSize: ".82rem" }}>{text}</p>
    </div>
  );
}
