# Admin Access — Audit Big Tech (Task #946)

> **Date** : avril 2026
> **Périmètre** : 7 URLs admin signalées comme inaccessibles + System
> Dashboard / Super Dashboard.
> **Objectif** : isoler la cause racine de chaque blocage, la corriger, et
> garantir qu'aucun refus n'est plus *silencieux*.

---

## 1. Synthèse exécutive

| # | URL signalée                       | Route après redirect                | Garde(s)                                     | Statut avant fix       | Cause racine                                                                                          | Sévérité |
|---|------------------------------------|-------------------------------------|----------------------------------------------|------------------------|--------------------------------------------------------------------------------------------------------|----------|
| 1 | `/admin/agents` (Cockpit)          | `/admin/control/agents`             | `ProtectedRoute` → `SuperAdminGate` → shell  | **Inaccessible**       | `useIsAdmin` exige email dans `ADMIN_EMAIL_ALLOWLIST` codé en dur **ET** rôle DB. Refus → écran Access Denied **générique** (pas de raison). | **High** |
| 2 | `/admin/command-center`            | `/admin/control/command`            | `ProtectedRoute` → `SuperAdminGate` → shell  | Placeholder vide       | Section non implémentée → rendu `SectionPlaceholder` libellé "Slot reserved for Agent 8" → confondu avec un bug. | Medium |
| 3 | `/admin/approvals`                 | `/admin/control/approvals`          | `ProtectedRoute` → `SuperAdminGate` → shell  | Inaccessible / vide    | Identique #1 + #2 (placeholder pour les comptes admin sans `super_admin`). | High   |
| 4 | `/admin/autonomy`                  | `/admin/control/autonomy`           | `ProtectedRoute` → shell (`:section`)        | Section opérationnelle | Bloqué uniquement par allowlist (`ProtectedRoute > AdminGate`). Aucune redirection silencieuse — mais écran Access Denied générique. | Medium |
| 5 | `/admin/control-room`              | `/admin/control/engines`            | `ProtectedRoute` → shell (`:section`)        | Section opérationnelle | Identique #4. | Medium |
| 6 | `/admin/engine-control-room`       | `/admin/control/engines`            | `ProtectedRoute` → shell (`:section`)        | Section opérationnelle | Identique #4 / #5. | Medium |
| 7 | `/admin/master-control`            | `/admin/control/master`             | `ProtectedRoute` → `SuperAdminGate` → shell  | Placeholder ("legacy") | Identique #1 + section délibérément placeholder. | High   |
| – | `/admin/super-dashboard`           | (pas de redirect)                   | `SuperAdminGate`                             | **Redirect silencieux vers `/dashboard`** | RPC `has_role(super_admin)` renvoie `false` (rôle absent dans l'enum `app_role` ou pas en DB) → `SuperAdminGate` faisait `<Navigate to="/dashboard" />` sans message. | **Critical** |
| – | `/admin/system-health`             | (pas de redirect)                   | `ProtectedRoute > AdminGate`                 | Inaccessible           | Identique #1. | High   |

---

## 2. Cartographie des gardes

```
                ┌────────────────────────┐
                │ ProtectedRoute         │
                │  (auth + email vérifié │
                │   + subscription)      │
                └──────────┬─────────────┘
                           │ path startsWith("/admin")
                           ▼
                ┌────────────────────────┐
                │ AdminGate (inline)     │
                │  useIsAdmin :          │
                │   1. email allowlist   │ ← codé en dur (cause #1)
                │   2. RPC has_role      │
                └──────────┬─────────────┘
                           │ admin OK
                           ▼
                ┌────────────────────────┐
                │ SuperAdminGate (opt)   │ ← uniquement /super-dashboard
                │  RPC has_role(         │   et /admin/control/{agents,
                │     super_admin)       │   runs, command, approvals,
                │                        │   master}
                └──────────┬─────────────┘
                           │ super_admin OK
                           ▼
                  AdminControlShellPage
                (lazy chunk, FeatureErrorBoundary)
                           │
                           ▼
                AdminControlLayout → SECTION_COMPONENTS[id]
                  (overview/agents/runs/command/...)
```

### 2.1 Causes racines détaillées

| # | Cause racine                                                                                          | Fichier:Ligne                                        | Sévérité  |
|---|--------------------------------------------------------------------------------------------------------|------------------------------------------------------|-----------|
| C1| Allowlist email codée en dur (`ADMIN_EMAIL_ALLOWLIST = ["habboujabir@gmail.com"]`)                     | `src/hooks/useIsAdmin.ts:24`                          | High      |
| C2| Double exigence `email allowlist` **AND** `has_role(admin\|owner)` sans message expliquant lequel manque | `src/hooks/useIsAdmin.ts:46-74` + `ProtectedRoute.tsx:72-77` | High |
| C3| `SuperAdminGate` faisait `<Navigate to="/dashboard" />` quand le RPC `has_role(super_admin)` échouait ou que le rôle manquait → refus invisible | `src/components/auth/SuperAdminGate.tsx:97-109` (avant fix) | **Critical** |
| C4| Enum `app_role` ne contenait que `('owner','admin','member')` au moment de la création du schéma → `super_admin` jamais ajouté côté base, donc `has_role(super_admin)` retourne toujours `false` (et plante si la valeur est inconnue dans le client typé). | `supabase/migrations/20260225233034_*.sql:3`         | **Critical** |
| C5| `SectionPlaceholder` affichait *"Slot reserved for Agent X"* → l'utilisateur croit à un bug.            | `src/pages/admin/control/sections/SectionPlaceholder.tsx:36-46` (avant fix) | Medium |
| C6| `safeLazy()` (chunk loading) loggue uniquement en console en cas de timeout 20 s, sans message clair pour l'utilisateur. | `src/app/app-route-registry.tsx:22-42`               | Low (déjà acceptable, fallback existe) |
| C7| Redirections legacy (`/admin/agents → /admin/control/agents`, etc.) pointent toutes vers le shell unifié — si la cible est encore en placeholder, l'utilisateur retombe sur la cause #C5. | `src/routes/admin.routes.tsx:142-149`                | Medium    |

---

## 3. Correctifs appliqués

### 3.1 Allowlist configurable (corrige C1)

`src/hooks/useIsAdmin.ts` lit désormais `import.meta.env.VITE_ADMIN_ALLOWLIST`
(CSV / espaces / point-virgules acceptés). Le tableau `DEFAULT_ADMIN_EMAIL_ALLOWLIST`
sert de fallback de sécurité afin que le propriétaire historique
(`habboujabir@gmail.com`) ne soit jamais verrouillé en cas de variable manquante.

```ts
// Pour ajouter d'autres admins :
//   .env  →  VITE_ADMIN_ALLOWLIST=alice@acme.com,bob@acme.com
```

Une table `public.admin_allowlist` (RLS : seul `super_admin`/`owner` peut
lire/écrire) est également créée par la migration `20260417500000_super_admin_role.sql`
pour pouvoir basculer la source vers la base sans nouvelle release frontend.

### 3.2 Diagnostics visibles (corrige C2 + C3)

`useIsAdmin` retourne maintenant `denialReason` typé :

- `not-authenticated`
- `email-not-allowlisted`
- `role-missing`
- `rpc-error`

`AdminAccessDenied` accepte `reason` + `email` et rend un message **précis en
français** (titre, explication, action) pour chaque cas, avec attribut HTML
`data-reason="…"` exposé pour le test e2e et l'observabilité.

`SuperAdminGate` ne redirige plus jamais silencieusement vers `/dashboard` :

| Cas                              | Avant                              | Après                                                |
|----------------------------------|------------------------------------|------------------------------------------------------|
| Non connecté                     | `Navigate /login`                  | identique (flow control légitime)                    |
| Email non vérifié                | `Navigate /verify-email`           | identique                                            |
| `has_role` rejette une exception | `Navigate /dashboard` + console.error | `<AdminAccessDenied reason="super-admin-rpc-error" />` + structured log |
| `has_role` retourne `false`      | `Navigate /dashboard`              | `<AdminAccessDenied reason="super-admin-required" />` |

### 3.3 Migration `super_admin` (corrige C4)

`supabase/migrations/20260417500000_super_admin_role.sql` (idempotent) :

1. Ajoute `super_admin` à l'enum `public.app_role` si absent
   (`DO $$ … ALTER TYPE … ADD VALUE … $$`).
2. Re-déclare `public.has_role(uuid, app_role)` (signature inchangée) avec
   `GRANT EXECUTE TO authenticated`.
3. Crée la table `public.admin_allowlist` + policies RLS.
4. Attribue `super_admin` + `admin` à l'utilisateur dont `auth.users.email =
   'habboujabir@gmail.com'` si la ligne existe (sinon no-op silencieux).

### 3.4 Placeholders propres (corrige C5)

`SectionPlaceholder` :

- Badge **"Coming soon"** ambré + ETA optionnelle dans l'en-tête.
- Texte explicatif clair : *"Cette surface n'est pas encore branchée. […]
  Ce n'est pas un bug — la page est volontairement vide en attendant
  l'implémentation."*
- Lien retour vers `Overview`.
- Attribut `data-placeholder="true|false"` pour observabilité / tests.

### 3.5 Fallback chunk loading (C6)

Le shell admin est désormais monté via un wrapper dédié
`src/components/admin/AdminShellChunkBoundary.tsx` qui :

- Importe `AdminControlShellPage` via un `React.lazy` indépendant qui
  **propage** les erreurs de chargement (au lieu d'utiliser `safeLazy`
  qui les avale).
- Englobe le `Suspense` dans un `ErrorBoundary` qui rend le panneau partagé
  `AdminAccessDenied` avec `reason="chunk-load-failed"` et un bouton retry
  qui force un `window.location.reload()`.
- Logue l'incident dans `structuredLogger` (domain `admin`, action
  `admin_shell.chunk_load_failed`) pour observabilité.

`admin.routes.tsx` utilise maintenant `<AdminShellWithChunkBoundary />` à
la place de `<AdminControlShellPage />` direct, gardant les gardes
`ProtectedRoute` / `SuperAdminGate` en amont. `safeLazy()` reste actif
pour toutes les autres pages admin comme dernier filet, mais le chemin
critique du shell unifié a sa propre UX cohérente.

### 3.5bis Propagation des erreurs RPC `has_role` (corrige C2/C3 en
profondeur)

`hasRole(userId, role)` dans `src/repositories/auth-utils.repository.ts`
ne renvoyait silencieusement `false` qu'on ait ou non une vraie erreur
serveur. C'était la cause indirecte qui rendait `rpc-error` /
`super-admin-rpc-error` quasiment inatteignables : un RLS qui rejette,
un RPC manquant, un enum incomplet — tout finissait classifié en
`role-missing`. Le helper `throw` désormais sur `error` ; les appelants
(`useIsAdmin`, `SuperAdminGate`) mappent ces exceptions sur le bon
`denialReason`.

### 3.6 Redirections legacy (C7)

Les 7 redirections existantes (`admin.routes.tsx:142-149`) restent valides.
Combinées au #3.4, le placeholder devient une réponse acceptable plutôt qu'un
faux bug.

### 3.7 Test e2e

`e2e/21-admin-access.spec.ts` : se connecte avec un compte **super-admin
dédié** (`E2E_SUPER_ADMIN_EMAIL` / `E2E_SUPER_ADMIN_PASSWORD`) et, pour
chacune des 7 URLs legacy, vérifie strictement :

1. Pas de redirection silencieuse vers `/dashboard`.
2. URL finale = la destination canonique `/admin/control/*`.
3. Le shell `[data-testid="admin-control-shell"]` est visible.
4. Aucun panneau `[data-testid="admin-access-denied"]` n'est rendu.

Si les variables d'environnement super-admin ne sont pas configurées dans
l'environnement de CI, le test **skip** explicitement (avec message clair) ;
il ne passe jamais silencieusement. Le compte E2E générique est volontairement
non-admin et ne convient donc pas pour ce test.

---

## 4. Procédure de vérification manuelle (super-admin owner)

1. Se connecter avec un compte présent dans `VITE_ADMIN_ALLOWLIST` **et**
   ayant le rôle `super_admin` dans `public.user_roles`.
2. Visiter dans l'ordre :
   - `/admin/agents` → `/admin/control/agents` (shell visible)
   - `/admin/command-center` → `/admin/control/command` (placeholder *"Coming soon"*)
   - `/admin/approvals` → `/admin/control/approvals` (interface fonctionnelle)
   - `/admin/autonomy` → `/admin/control/autonomy` (dashboard fonctionnel)
   - `/admin/control-room` → `/admin/control/engines`
   - `/admin/engine-control-room` → `/admin/control/engines`
   - `/admin/master-control` → `/admin/control/master`
3. Aucune redirection silencieuse vers `/dashboard` ne doit se produire.
4. Aucun écran *"Access Denied"* ne doit apparaître.
5. Si une de ces URLs échoue, le panneau de refus indique désormais
   explicitement quoi corriger (allowlist, rôle DB, RPC, chunk).

---

## 5. Risques résiduels

| Risque                                                                                | Mitigation                                                                                              |
|---------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
| Une nouvelle valeur ajoutée à `app_role` côté app sans migration                       | La migration #946 est le modèle à reproduire (idempotent + `IF NOT EXISTS`).                            |
| `VITE_ADMIN_ALLOWLIST` mal configurée en production                                    | Fallback hard-codé garantit l'accès au propriétaire ; bannière de diagnostic visible si email refusé.   |
| RPC `has_role` revoke côté Supabase                                                    | `GRANT EXECUTE TO authenticated` ré-asserté par la migration ; `super-admin-rpc-error` panel + log Sentry. |
| Sections placeholder confondues avec une régression visuelle                           | Badge "Coming soon" + texte explicatif + attribut `data-placeholder`.                                   |

---

## 6. Fichiers modifiés / créés

```
src/hooks/useIsAdmin.ts                                  (modifié)
src/components/auth/AdminAccessDenied.tsx                (modifié)
src/components/auth/ProtectedRoute.tsx                   (modifié)
src/components/auth/SuperAdminGate.tsx                   (modifié)
src/pages/admin/control/sections/SectionPlaceholder.tsx  (modifié)
supabase/migrations/20260417500000_super_admin_role.sql  (créé)
e2e/21-admin-access.spec.ts                              (créé)
docs/audit/admin-access-audit.md                         (créé — ce document)
```

— Fin de l'audit —
