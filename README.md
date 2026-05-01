# 🏠 Notre Foyer — Family Planner

App de planning familial avec synchronisation en temps réel.

## Stack
- **React 18** + **TypeScript** + **Vite**
- **Supabase** — base de données + auth + realtime

---

## 🚀 Démarrage rapide (3 étapes)

### 1. Installer les dépendances
```bash
npm install
```

### 2. Configurer Supabase
```bash
# Copiez le fichier exemple
cp .env.local.example .env.local

# Editez .env.local et remplissez vos clés
# (trouvées dans Supabase → Settings → API)
```

Puis dans Supabase → **SQL Editor** → collez et exécutez `schema.sql`

### 3. Lancer l'app
```bash
npm run dev
```

→ Ouvrez **http://localhost:5173**

---

## 📦 Déploiement Vercel

```bash
# Build de vérification
npm run build

# Puis pousser sur GitHub et importer sur vercel.com
# N'oubliez pas d'ajouter les variables d'environnement sur Vercel !
```

---

## 📁 Structure
```
src/
└── App.tsx        ← Toute l'application
schema.sql         ← Tables Supabase à exécuter une seule fois
.env.local         ← Vos clés (jamais sur Git !)
```
