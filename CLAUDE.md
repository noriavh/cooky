# Cooky

App web React 18 + Vite + TypeScript + Tailwind/ShadCN + TanStack Query, backend Supabase (PostgreSQL + Auth + RLS, projet linké `leepmopiexgvrkjdrtnw`).

## Compte de test (pour Claude)

Un compte de test permanent existe pour vérifier les fonctionnalités dans le navigateur. **Toujours utiliser ce compte, ne pas en recréer un.**

- Email : `claude.test@cooky.dev`
- Mot de passe : `CookyTest2026!`
- Créé directement en base (`auth.users` + `auth.identities`), email confirmé, hors famille.

Règles :
- Après une session de vérification, supprimer les données de test créées (journal, recettes, produits perso...) mais **conserver le compte**.
- L'inscription via l'UI exige une confirmation email et le SMTP intégré est vite rate-limité — c'est pour ça qu'on passe par le compte permanent.

## Notes de dev

- **Node 22 requis** (cf. `.nvmrc`). Le node par défaut du shell est v16 : préfixer avec `export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"` pour `npm run lint` / `build`.
- **Supabase CLI** : le token est dans `.env.supabase` (non versionné). Usage : `set -a && source .env.supabase && set +a && supabase db push` (ou `gen types typescript --linked --schema public > src/integrations/supabase/types.ts`).
- **SQL direct sur la base distante** (seed/cleanup de test) : Management API `POST https://api.supabase.com/v1/projects/leepmopiexgvrkjdrtnw/database/query` avec le header `Authorization: Bearer $SUPABASE_ACCESS_TOKEN`.
- Serveur de dev : port 8080 (`.claude/launch.json`, config `cooky-dev`).
