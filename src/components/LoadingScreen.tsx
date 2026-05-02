import { Icon } from "./ui/Icon";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = "Chargement…" }: LoadingScreenProps) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 16, color: "var(--muted)",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "var(--text)", display: "flex",
        alignItems: "center", justifyContent: "center",
      }}>
        <Icon name="home" size={28} color="white" sw={1.8} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: ".9rem", fontWeight: 600 }}>
        <div style={{
          width: 18, height: 18,
          border: "2.5px solid var(--border)", borderTopColor: "var(--text)",
          borderRadius: "50%", animation: "spin 1s linear infinite",
        }} />
        {message}
      </div>
    </div>
  );
}
