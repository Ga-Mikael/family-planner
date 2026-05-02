import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Icon } from "./ui/Icon";
import { inputStyle, primaryBtn } from "../styles";

export function LoginScreen() {
  const [mode,     setMode]     = useState<"login" | "signup">("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (mode === "signup") {
      const { error: e } = await supabase.auth.signUp({ email: email.trim(), password });
      if (e) setError(e.message);
      else setSuccess("Compte créé ! Vous pouvez maintenant vous connecter.");
    } else {
      const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (e) setError("Email ou mot de passe incorrect.");
    }

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
        width: 72, height: 72, borderRadius: 22, background: "var(--text)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20, boxShadow: "0 8px 32px rgba(0,0,0,.15)",
      }}>
        <Icon name="home" size={34} color="white" sw={1.8} />
      </div>

      <h1 style={{ fontWeight: 900, fontSize: "1.6rem", marginBottom: 4 }}>Notre Foyer</h1>
      <p style={{ fontSize: ".85rem", color: "var(--muted)", marginBottom: 32, textAlign: "center" }}>
        {mode === "login"
          ? "Connectez-vous pour accéder à votre planning familial"
          : "Créez le compte de votre foyer"}
      </p>

      <div style={{ width: "100%", maxWidth: 360 }}>
        {/* Onglets login / inscription */}
        <div style={{ display: "flex", background: "var(--soft)", borderRadius: 12, padding: 4, marginBottom: 20 }}>
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); setSuccess(null); }}
              style={{
                flex: 1, padding: "8px 0", border: "none",
                borderRadius: 10,
                background:  mode === m ? "white" : "transparent",
                fontWeight:  700, fontSize: ".82rem", cursor: "pointer",
                color:       mode === m ? "var(--text)" : "var(--muted)",
                boxShadow:   mode === m ? "0 2px 8px rgba(0,0,0,.08)" : "none",
                transition:  "all .2s",
              }}
            >
              {m === "login" ? "Se connecter" : "Créer un compte"}
            </button>
          ))}
        </div>

        {/* Email */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted2)" }}>
            <Icon name="mail" size={16} />
          </div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email du foyer"
            style={{ ...inputStyle, paddingLeft: 38, background: "white" }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
        </div>

        {/* Mot de passe */}
        <div style={{ position: "relative", marginBottom: 8 }}>
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted2)" }}>
            <Icon name="lock" size={16} />
          </div>
          <input
            type={showPwd ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            style={{ ...inputStyle, paddingLeft: 38, paddingRight: 40, background: "white" }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <button
            onClick={() => setShowPwd(!showPwd)}
            style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer",
              color: "var(--muted2)", padding: 2, display: "flex",
            }}
          >
            <Icon name={showPwd ? "eyeOff" : "eye"} size={16} />
          </button>
        </div>

        {/* Messages d'erreur / succès */}
        {error   && <div style={{ fontSize: ".78rem", color: "#DC2626", background: "#FEF2F2", border: "1px solid #FCA5A5", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>{error}</div>}
        {success && <div style={{ fontSize: ".78rem", color: "#16A34A", background: "#DCFCE7", border: "1px solid #86EFAC", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>{success}</div>}

        {/* Bouton de connexion */}
        <button onClick={handleSubmit} disabled={loading} style={{ ...primaryBtn, width: "100%", marginTop: 8, opacity: loading ? .7 : 1 }}>
          {loading
            ? <><div style={{ width: 16, height: 16, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} /> Chargement…</>
            : mode === "login" ? "Se connecter" : "Créer le compte famille"
          }
        </button>

        {/* Info compte partagé */}
        <div style={{ marginTop: 20, background: "var(--soft)", borderRadius: 12, padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Icon name="wifi" size={15} color="var(--accent)" />
            <div style={{ fontSize: ".75rem", color: "var(--muted)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--text)" }}>Compte famille partagé</strong><br />
              Créez un compte, partagez l'email et le mot de passe avec votre famille.
              Tout le monde voit les mêmes données en temps réel.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
