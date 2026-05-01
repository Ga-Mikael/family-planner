# 🔐 Guide de déploiement sécurisé — Family Planner

## Architecture de sécurité

```
┌─────────────────┐        ┌──────────────────┐        ┌────────────────┐
│                 │        │                  │        │                │
│  Navigateur     │──POST──▶  /api/chat        │──POST──▶  Anthropic    │
│  (React)        │        │  (Vercel/Netlify) │        │  API           │
│                 │◀──JSON─│                  │◀──JSON─│                │
│  ❌ Pas de clé  │        │  ✅ Clé secrète  │        │                │
└─────────────────┘        └──────────────────┘        └────────────────┘
```

---

## Étape 1 — Structure des fichiers

```
family-planner/
├── api/
│   └── chat.js          ← API Route (le proxy sécurisé)
├── src/
│   └── FamilyPlanner.jsx ← Votre app React (modifiée)
├── .env.local            ← Clé API locale (jamais sur Git)
├── .env.local.example    ← Exemple sans la vraie clé (ok sur Git)
└── .gitignore            ← Doit contenir .env.local
```

---

## Étape 2 — Déployer sur Vercel

### 2a. Pousser le code sur GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

### 2b. Importer sur Vercel
1. Allez sur https://vercel.com/new
2. Importez votre repo GitHub
3. Vercel détecte automatiquement le dossier `api/`

### 2c. Ajouter la variable d'environnement
1. Dans votre projet Vercel → **Settings** → **Environment Variables**
2. Ajoutez :
   - **Name** : `ANTHROPIC_API_KEY`
   - **Value** : `sk-ant-votre-clé-ici`
   - **Environment** : Production + Preview + Development
3. Cliquez **Save**
4. **Redéployez** le projet (obligatoire pour prendre en compte la variable)

---

## Étape 3 — Déployer sur Netlify (alternative)

### Renommez le fichier
```
api/chat.js  →  netlify/functions/chat.js
```

### Adaptez légèrement la syntaxe
```js
// netlify/functions/chat.js
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { messages, system } = JSON.parse(event.body);

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY, // ✅ Sécurisé
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      system,
      messages,
    }),
  });

  const data = await response.json();
  return {
    statusCode: 200,
    body: JSON.stringify({ content: data.content }),
  };
};
```

### Ajouter la variable dans Netlify
1. **Site settings** → **Environment variables**
2. Ajoutez `ANTHROPIC_API_KEY` avec votre clé
3. Redéployez

### Dans le front-end React, appelez :
```js
// Vercel
fetch("/api/chat", ...)

// Netlify
fetch("/.netlify/functions/chat", ...)
```

---

## Étape 4 — Vérifications de sécurité

### ✅ Checklist avant mise en ligne

- [ ] `ANTHROPIC_API_KEY` est dans les variables d'environnement Vercel/Netlify
- [ ] `.env.local` est dans `.gitignore` et n'est PAS sur GitHub
- [ ] Le front-end appelle `/api/chat`, pas `api.anthropic.com` directement
- [ ] La vérification d'origine est activée dans `api/chat.js`
- [ ] Votre domaine est dans la liste `allowedOrigins`

### 🔍 Comment vérifier que la clé est bien cachée
1. Ouvrez votre app déployée
2. DevTools → Network → cliquez sur une requête `/api/chat`
3. Regardez le **Request** : vous voyez `messages` et `system`, **pas de clé**
4. Regardez le **Response** : vous voyez la réponse de Claude, **pas la clé**

---

## Coûts estimés

| Usage | Tokens/mois | Coût estimé |
|-------|-------------|-------------|
| Famille légère (10 msgs/j) | ~90k tokens | ~0,27 € |
| Famille active (30 msgs/j) | ~270k tokens | ~0,81 € |

> Tarif Claude Sonnet : ~$3/million de tokens input + ~$15/million output

---

## En cas de fuite de clé

Si votre clé est exposée par erreur :
1. Allez sur https://console.anthropic.com
2. **API Keys** → Révoquez immédiatement la clé compromise
3. Créez une nouvelle clé
4. Mettez à jour la variable d'environnement sur Vercel/Netlify
