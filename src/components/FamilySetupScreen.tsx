import { useState } from "react";
import type { Member, IconName } from "../types";
import { MEMBER_COLORS, PRESET_EMOJIS } from "../lib/constants";
import { Icon } from "./ui/Icon";
import { inputStyle, primaryBtn } from "../styles";

interface SetupMember {
  name: string;
  emoji: string;
  isChild: boolean;
  colorIdx: number;
}

interface FamilySetupScreenProps {
  onFinish: (members: Member[]) => Promise<void>;
}

export function FamilySetupScreen({ onFinish }: FamilySetupScreenProps) {
  const [step,    setStep]    = useState<"welcome" | "members">("welcome");
  const [members, setMembers] = useState<SetupMember[]>([
    { name: "", emoji: "👨", isChild: false, colorIdx: 0 },
    { name: "", emoji: "👩", isChild: false, colorIdx: 1 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const addMember = () => {
    if (members.length >= 6) return;
    setMembers((p) => [...p, { name: "", emoji: "🧑", isChild: false, colorIdx: p.length % MEMBER_COLORS.length }]);
  };

  const removeMember = (i: number) => {
    if (members.length <= 1) return;
    setMembers((p) => p.filter((_, j) => j !== i));
  };

  const update = (i: number, field: keyof SetupMember, val: string | boolean | number) => {
    setMembers((p) => p.map((m, j) => (j === i ? { ...m, [field]: val } : m)));
  };

  const handleFinish = async () => {
    const valid = members.filter((m) => m.name.trim());
    if (valid.length === 0) { setError("Ajoutez au moins un membre."); return; }
    setError(null);
    setLoading(true);
    const built: Member[] = valid.map((m, i) => ({
      id:        "m" + Date.now() + i,
      name:      m.name.trim(),
      emoji:     m.emoji,
      isChild:   m.isChild,
      color:     MEMBER_COLORS[m.colorIdx].color,
      avatarBg:  MEMBER_COLORS[m.colorIdx].avatarBg,
      workDays:  [],
      workHours: {},
    }));
    await onFinish(built);
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      {/* Logo */}
      <div style={{
        width: 64, height: 64, borderRadius: 20, background: "var(--text)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20, boxShadow: "0 8px 32px rgba(0,0,0,.12)",
      }}>
        <Icon name="home" size={30} color="white" sw={1.8} />
      </div>

      {/* ── Étape 1 : Bienvenue ── */}
      {step === "welcome" && (
        <div style={{ width: "100%", maxWidth: 360, textAlign: "center", animation: "fadeUp .4s ease" }}>
          <h1 style={{ fontWeight: 900, fontSize: "1.6rem", marginBottom: 8 }}>Bienvenue !</h1>
          <p style={{ fontSize: ".9rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: 32 }}>
            Configurons votre foyer en 1 minute.<br />
            Vos informations seront stockées dans<br />
            votre base de données privée Supabase.
          </p>

          <div style={{ background: "var(--soft)", borderRadius: 14, padding: "14px 16px", marginBottom: 28, textAlign: "left" }}>
            {([
              { icon: "lock"  as IconName, text: "Données chiffrées — jamais dans le code" },
              { icon: "users" as IconName, text: "Visible uniquement par votre famille" },
              { icon: "wifi"  as IconName, text: "Synchronisé sur tous vos appareils" },
            ]).map(({ icon, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: "var(--accent-bg)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Icon name={icon} size={14} color="var(--accent)" />
                </div>
                <span style={{ fontSize: ".8rem", fontWeight: 600, color: "var(--text)" }}>{text}</span>
              </div>
            ))}
          </div>

          <button onClick={() => setStep("members")} style={{ ...primaryBtn, width: "100%", padding: "13px" }}>
            Configurer notre foyer →
          </button>
        </div>
      )}

      {/* ── Étape 2 : Membres ── */}
      {step === "members" && (
        <div style={{ width: "100%", maxWidth: 360, animation: "fadeUp .35s ease" }}>
          <h1 style={{ fontWeight: 900, fontSize: "1.4rem", marginBottom: 4, textAlign: "center" }}>Les membres</h1>
          <p style={{ fontSize: ".8rem", color: "var(--muted)", textAlign: "center", marginBottom: 20 }}>
            Qui fait partie de votre foyer ?
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {members.map((m, i) => (
              <div key={i} style={{
                background: "var(--soft)", border: "1.5px solid var(--border)",
                borderRadius: 14, padding: "12px 14px", animation: "fadeUp .2s ease",
              }}>
                {/* Emoji + Prénom */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <select
                    value={m.emoji}
                    onChange={(e) => update(i, "emoji", e.target.value)}
                    style={{ ...inputStyle, width: 60, textAlign: "center", fontSize: "1.3rem", padding: "6px", background: "white", appearance: "none", cursor: "pointer" }}
                  >
                    {PRESET_EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                  <input
                    value={m.name}
                    onChange={(e) => update(i, "name", e.target.value)}
                    placeholder="Prénom…"
                    style={{ ...inputStyle, flex: 1, background: "white" }}
                    autoFocus={i === 0}
                  />
                  {members.length > 1 && (
                    <button onClick={() => removeMember(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted2)", padding: 4, display: "flex", flexShrink: 0 }}>
                      <Icon name="x" size={16} />
                    </button>
                  )}
                </div>

                {/* Couleur */}
                <div style={{ display: "flex", gap: 7, marginBottom: 8 }}>
                  {MEMBER_COLORS.map((c, ci) => (
                    <div
                      key={ci}
                      onClick={() => update(i, "colorIdx", ci)}
                      style={{
                        width: 22, height: 22, borderRadius: "50%", background: c.color,
                        cursor: "pointer", flexShrink: 0,
                        boxShadow: m.colorIdx === ci ? `0 0 0 2px white, 0 0 0 4px ${c.color}` : "none",
                        transition: "box-shadow .15s",
                      }}
                    />
                  ))}
                </div>

                {/* Toggle adulte / enfant */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    onClick={() => update(i, "isChild", !m.isChild)}
                    style={{
                      width: 36, height: 20, borderRadius: 10,
                      background: m.isChild ? MEMBER_COLORS[m.colorIdx].color : "var(--border)",
                      cursor: "pointer", position: "relative", transition: "background .2s", flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: "absolute", top: 2, left: m.isChild ? 18 : 2,
                      width: 16, height: 16, borderRadius: "50%", background: "white",
                      transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                    }} />
                  </div>
                  <span style={{ fontSize: ".78rem", fontWeight: 600, color: m.isChild ? MEMBER_COLORS[m.colorIdx].color : "var(--muted)" }}>
                    {m.isChild ? "Enfant 👧" : "Adulte 🧑"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {members.length < 6 && (
            <button onClick={addMember} style={{
              width: "100%", padding: "10px", background: "var(--soft)",
              border: "1.5px dashed var(--border)", borderRadius: 12,
              color: "var(--muted)", fontSize: ".8rem", fontWeight: 600,
              cursor: "pointer", marginBottom: 16,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <Icon name="plus" size={14} sw={2.5} /> Ajouter un membre
            </button>
          )}

          {error && (
            <div style={{ fontSize: ".78rem", color: "#DC2626", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
              {error}
            </div>
          )}

          <button onClick={handleFinish} disabled={loading} style={{ ...primaryBtn, width: "100%", padding: "13px", opacity: loading ? .7 : 1 }}>
            {loading
              ? <><div style={{ width: 16, height: 16, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} /> Création…</>
              : "Créer notre foyer 🏠"
            }
          </button>

          <p style={{ fontSize: ".72rem", color: "var(--muted2)", textAlign: "center", marginTop: 12 }}>
            Vous pourrez modifier tout ça dans l'app ensuite
          </p>
        </div>
      )}
    </div>
  );
}
