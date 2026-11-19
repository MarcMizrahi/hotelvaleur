# Hôtel Valeur

Estimation en ligne de la valeur d'un hôtel (murs, fonds ou murs + fonds) et mise en
relation des propriétaires avec des agents spécialisés.

- **App en ligne** : https://hotelvaleur.lovable.app
- **Éditeur Lovable** : https://lovable.dev/projects/b1e1e8b9-fbfc-4f9a-ab3d-6b6bd4115971

Le projet est connecté à Lovable : chaque modification faite dans Lovable est commitée
dans ce dépôt, et chaque commit poussé sur la branche connectée revient dans Lovable.
Ne jamais réécrire l'historique publié (force push, rebase, amend…), voir `AGENTS.md`.

## Stack

- [TanStack Start](https://tanstack.com/start) (React 19, routage par fichiers, server functions)
- Tailwind CSS 4 + composants shadcn/ui (`src/components/ui`)
- Supabase (Lovable Cloud) : Postgres + RLS, Auth, Storage, `pg_cron`
- Déploiement : Cloudflare Workers via Nitro (géré par Lovable)
- Tests : Vitest

## Organisation du code

| Dossier | Contenu |
| --- | --- |
| `src/routes/` | Pages et endpoints (routage par fichiers, voir `src/routes/README.md`) |
| `src/routes/api/public/hooks/` | Webhooks appelés par `pg_cron` (veille transactions, calibrage) |
| `src/lib/valuation.ts` | Moteur de valorisation — fonction pure, testée |
| `src/lib/comparables.ts`, `calibration*.ts` | Comparables marché et recalibrage des coefficients |
| `src/lib/*.functions.ts` | Server functions appelées depuis le client |
| `src/lib/*.server.ts` | Code serveur uniquement (emails, PDF, HMAC, scraping…) — ne jamais importer côté client |
| `src/lib/admin-guard.ts` | Contrôle d'accès admin partagé par le back-office |
| `src/content/guides/` | Contenu éditorial des guides (ajoutés automatiquement au sitemap) |
| `src/config/site.ts` | Nom, URL publique, email de contact |
| `supabase/migrations/` | Schéma, RLS et jobs planifiés |

Toutes les valeurs monétaires sont stockées et manipulées en **centimes** (entiers).

### Parcours principaux

- `/estimation` → formulaire multi-étapes → `submitEstimation` recalcule la valeur côté
  serveur, enregistre l'estimation et envoie le rapport par email.
- `/mise-en-relation/$token` → lien signé (HMAC, 30 jours) → création d'un lead et
  attribution automatique d'un agent.
- `/espace-agent/*` → espace des agents (leads, rapports, zones).
- `/admin/*` → back-office (leads, agents, coefficients, transactions, calibrage).
- `/mes-donnees`, `/desabonnement` → droits RGPD via liens signés.

## Variables d'environnement (serveur)

À configurer dans Lovable Cloud (secrets). Les variables `SUPABASE_*` / `VITE_SUPABASE_*`
sont gérées automatiquement par Lovable.

| Variable | Rôle |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Accès serveur privilégié (géré par Lovable) |
| `HOTELVALEUR_HMAC_SECRET` | **Obligatoire** — signature des liens (désabonnement, données, mise en relation) |
| `SITE_URL` | URL publique utilisée dans les emails. Par défaut : `site.url` de `src/config/site.ts` |
| `ADMIN_EMAIL` | Destinataire des notifications de leads qualifiés |
| `TURNSTILE_SECRET_KEY` | Anti-spam Cloudflare Turnstile (désactivé si absent) |
| `CRON_SECRET` | Optionnel, recommandé — secret exigé par les webhooks `pg_cron` (voir ci-dessous) |

### Sécuriser les jobs planifiés

Les webhooks `/api/public/hooks/*` acceptent par défaut la clé *publishable* Supabase, qui
est publique. Pour les protéger :

1. Définir le secret `CRON_SECRET` dans Lovable Cloud.
2. Mettre à jour les deux jobs `pg_cron` (éditeur SQL Supabase, **pas** dans une migration
   commitée pour ne pas publier le secret) en ajoutant l'en-tête
   `"x-cron-secret": "<valeur>"` aux appels `net.http_post`.

Dès que `CRON_SECRET` est défini, la clé publishable n'est plus acceptée : faire l'étape 2
juste après l'étape 1.

## Développement local

Le projet utilise [bun](https://bun.sh) (`bun.lock`).

```sh
bun install
bun run dev        # serveur de développement
bun run test       # tests unitaires (Vitest)
bun run build      # build de production
bun run lint       # ESLint + Prettier
```

`src/routeTree.gen.ts` et `src/integrations/supabase/*` sont générés : ne pas les modifier à la main.

## À compléter

- `site.contactEmail` dans `src/config/site.ts` est encore une adresse d'exemple ; elle
  apparaît dans le pied de page et les pages légales.
- Si un nom de domaine personnalisé est branché, mettre à jour `site.url`, `SITE_URL`
  et la ligne `Sitemap:` de `public/robots.txt`.
