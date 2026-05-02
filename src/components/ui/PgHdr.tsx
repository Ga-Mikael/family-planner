interface PgHdrProps {
  title: string;
  sub?: string;
}

/** En-tête de page avec titre et sous-titre optionnel */
export function PgHdr({ title, sub }: PgHdrProps) {
  return (
    <div style={{ padding: "18px 20px 12px", borderBottom: "1px solid var(--border)" }}>
      <h1 style={{ fontWeight: 800, fontSize: "1.3rem" }}>{title}</h1>
      {sub && <p style={{ fontSize: ".72rem", color: "var(--muted)", marginTop: 2, fontWeight: 500 }}>{sub}</p>}
    </div>
  );
}
