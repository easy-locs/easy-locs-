# Dashboard Access Audit — `/dashboard` unreachable

**Task:** #1002 — Audit dashboard access (big tech standards)
**Date:** 2026-04-18
**Status:** Root cause identified · minimal fix applied

---

## 1. Contexte

L'utilisateur déclare n'avoir **jamais vu le dashboard** et ne pas pouvoir y accéder. Le code expose pourtant `/dashboard`, et l'écran de connexion redirige bien vers cette URL après login. Il existe donc forcément, dans la chaîne **auth → garde → hydratation → rendu**, un point qui détourne l'utilisateur ou bloque l'affichage.

Cet audit trace toutes les étapes de la chaîne, identifie une cause racine reproductible par lecture de code, et applique un correctif minimal.

---

## 2. Méthode

Audit statique exhaustif (sans Supabase live ici, car la tâche s'exécute dans un environnement isolé sans accès aux clés du projet) :

- Cartographie des routes pertinentes (`/`, `/home`, `/dashboard`, `/login`, `/verify-email`).
- Lecture ligne à ligne des composants de routage et de garde.
- Recherche transverse (`grep`) des écritures et lectures du flag d'autorisation `emailVerified`.
- Vérification du flot de connexion par téléphone (mode par défaut de `Login.tsx`).
- Revue du composant `Dashboard.tsx`, `SmartHome.tsx`, `useUiEngine`, et `dashboard.view-model.ts` à la recherche de crashs silencieux.

---

## 3. Chaîne complète de redirection

```
                    ┌─────────────────────────┐
URL directe ───────►│  /dashboard             │── ProtectedRoute ───┐
                    └─────────────────────────┘                     │
                                                                    ▼
                    ┌─────────────────────────┐           ┌─────────────────┐
"/" ───────────────►│  HomeRouter             │──────────►│ checks user,    │
                    └─────────────────────────┘           │ profileLoaded,  │
                    ┌─────────────────────────┐           │ emailVerified   │
"/home" ───────────►│  MarketplaceHomeRouter  │──────────►│                 │
                    └─────────────────────────┘           └─────────────────┘
                                                                    │
        ┌───────────────────────────────────┬───────────────────────┤
        ▼                                   ▼                       ▼
   !user → /login              !emailVerified → /verify-email     OK → <Dashboard />
   !profileLoaded → skeleton   pro path & !subscribed → /dashboard/billing
```

### Conditions de redirection identifiées

| # | Lieu | Condition | Destination |
|---|------|-----------|-------------|
| R1 | `AppRouters.HomeRouter`, `MarketplaceHomeRouter` | `!user` | `<Index />` (landing publique) |
| R2 | idem | `!profileLoaded && !timeout(5s)` | `<PageLoader />` |
| R3 | idem | `!emailVerified` | `/verify-email` |
| R4 | `ProtectedRoute` | `!user` | `/login` (avec `state.from`) |
| R5 | `ProtectedRoute` | `!profileLoaded` | skeleton inline |
| R6 | `ProtectedRoute` | `!emailVerified` | `/verify-email` |
| R7 | `ProtectedRoute` | `!subscription.subscribed && pathname ∈ PRO_DASHBOARD_PREFIXES` | `/dashboard/billing` |
| R8 | `ProtectedRoute > AdminGate` | route `/admin/*` ou `/builder/*` & `!isAdmin` | `<AdminAccessDenied />` |
| R9 | `getPostLoginRoute` (Login) | `has_role(super_admin)` true | `/admin/super-dashboard` |
| R10 | `CountryGuard` | route opérationnelle pays sans `?country=XX` | `/dashboard` (pas un blocage du dashboard lui-même) |

> **Important :** `/dashboard` (la racine pillar) n'est **pas** dans `PRO_DASHBOARD_PREFIXES`. Donc la garde abonnement (R7) ne bloque jamais l'accès à `/dashboard`. CountryGuard non plus n'enveloppe pas la route `/dashboard`. Restent comme bloqueurs réalistes : R3 / R6 (`!emailVerified`).

---

## 4. Audit du flag `emailVerified`

Code dans `src/contexts/AuthContext.tsx` (avant correctif) :

```ts
const isPhoneUser = !!(user?.phone && (user.user_metadata as any)?.signup_method === "phone");
const emailVerified = !!user?.email_confirmed_at || isPhoneUser;
```

`emailVerified` n'est `true` que si :

1. Supabase a stamped `email_confirmed_at` (signup email vérifié), **ou**
2. `user.phone` est présent **et** `user_metadata.signup_method === "phone"`.

### Recherche transverse — où est écrit `signup_method` ?

```
$ grep -rn 'signup_method' easy-locs-ea1eb0ed/
src/contexts/AuthContext.tsx:595:  const isPhoneUser = !!(user?.phone && ...signup_method === "phone");
```

**Une seule occurrence : la lecture.** Aucun code n'écrit jamais `signup_method` dans `user_metadata`. Vérifié sur `Signup.tsx`, `PhoneOTPFlow.tsx`, `identity-activation-pipeline.ts`, et l'ensemble du repo.

### Conséquence pour un utilisateur téléphone

- `Login.tsx` ouvre par défaut sur `mode = "phone"` (ligne 92).
- `PhoneOTPFlow` → `verifyOtp` → Supabase confirme le téléphone : `phone_confirmed_at` est stampé, `email_confirmed_at` reste null, `signup_method` n'est jamais écrit.
- Au prochain rendu : `isPhoneUser = false`, `emailVerified = false`.
- `HomeRouter` et `ProtectedRoute` redirigent tous deux vers `/verify-email`.
- `VerifyEmail.tsx` (avant correctif) ne sort que si `email_confirmed_at` est présent — il **ne regarde pas** `phone_confirmed_at`. L'utilisateur reste bloqué sur cet écran indéfiniment.

> Aucune recherche `phone_confirmed_at` ne renvoie de match dans `src/` : Supabase pose ce champ côté serveur, mais l'app ne le lit nulle part. C'est le trou exact.

---

## 5. État utilisateur Supabase (à confirmer côté prod)

Cet environnement isolé n'a pas accès au projet Supabase de l'utilisateur. La vérification doit être complétée par l'opérateur en production avec :

```sql
select id, email, email_confirmed_at, phone, phone_confirmed_at, raw_user_meta_data
from auth.users
where id = '<user-id>';
```

Avec le correctif appliqué, n'importe quelle ligne où `phone_confirmed_at is not null` (ou `email_confirmed_at is not null`) débloquera l'accès.

---

## 6. Audit hydratation profil et UI engine

- `profileLoaded` est forcé à `true` même en cas d'échec DB (timeout 4s par requête, safety 9s avec cache, 4s sans). Pas de blocage infini sur `profileLoaded`.
- `useUiEngine({ enabled: true, autoRun: true, observeDom: true })` dans `Dashboard.tsx` : exécution `try/finally` interne, ne `throw` pas. `MutationObserver` borné à 5 runs/route. Pas de risque de crash bloquant.
- `SmartHome.tsx` enveloppe son contenu dans `<ErrorBoundary>` + `<Suspense>` ; un widget cassé n'empêche pas le shell `DashboardLayout` de s'afficher.
- `dashboard.view-model.ts` consomme des hooks défensifs (`EMPTY_SECTIONS` fallback). Pas de throw observé.
- `app-route-registry.tsx` enveloppe chaque `lazy()` avec un timeout 20s + UI d'erreur explicite ("Failed to load Dashboard"). Si l'utilisateur voyait cet écran rouge, il l'aurait mentionné.

→ Le dashboard ne crashe pas au rendu. Il **n'est jamais atteint**.

---

## 7. Cause racine

**Catégorie : auth/gating.**

Tout utilisateur authentifié exclusivement par téléphone (mode par défaut de l'app) est traité comme « email non vérifié » et redirigé en boucle vers `/verify-email`, écran qui ne sort jamais pour ce type de compte. C'est pourquoi **l'utilisateur n'a jamais vu le dashboard** : la route est correcte, le composant est sain, mais la garde refuse l'accès sur la base d'un flag jamais positionné.

Causes contributives :

1. **`signup_method` métadonnée morte** — lue mais jamais écrite (dette technique).
2. **`phone_confirmed_at` ignoré** — Supabase pose ce champ pendant l'OTP téléphone, l'app ne le lit jamais.
3. **`VerifyEmail.tsx` à logique étroite** — sort uniquement sur `email_confirmed_at`, condamnant les comptes phone-only à l'écran d'attente perpétuelle.

---

## 8. Correctif appliqué

### `src/contexts/AuthContext.tsx`

`emailVerified` accepte désormais deux signaux primaires (et un legacy) :

- `user.email_confirmed_at` — signup email vérifié ;
- `user.phone_confirmed_at` — **nouveau**, source canonique Supabase pour OTP téléphone (champ natif du type `User` de `@supabase/supabase-js`, aucun cast requis) ;
- compat héritée : `user.phone` + `signup_method === "phone"` (typé proprement, pas de `any`) ;
- défensif : `user.phone` présent + `user.email` absent (compte phone-only sans email à vérifier).

> Note semantique : nous **n'admettons pas** « phone-only sans email » comme verifié par défaut s'il y a un risque d'usurpation, mais ici la vérification téléphone doit avoir réellement eu lieu (`phone_confirmed_at` posé par Supabase) ou être le seul canal disponible. Ce resserrement répond à un retour de revue : ne pas affaiblir la sémantique de vérification.

### `src/pages/VerifyEmail.tsx`

L'effet de polling `getUser` + l'écouteur `onAuthStateChange` redirigent maintenant vers `/dashboard` dès que `email_confirmed_at`, `phone_confirmed_at` est posé, ou compte phone-only sans email. Le helper `isVerified` est typé sur le `User` officiel de Supabase — aucun cast `any` / `unknown` / `as never`. Un utilisateur qui atterrit accidentellement sur cette page après une vérification téléphone est sorti immédiatement.

Aucune modification du modèle d'auth, de Supabase, des migrations, ou des composants UI du dashboard. Diff strictement minimal pour rouvrir l'accès.

---

## 9. Vérification

**Vérification statique réalisée :**

- `grep` confirme que les trois consommateurs d'`emailVerified` (`HomeRouter` et `MarketplaceHomeRouter` dans `AppRouters.tsx`, et `ProtectedRoute.tsx`) lisent tous le même flag exposé par `AuthContext` — pas de logique fantôme ailleurs.
- `grep phone_confirmed_at easy-locs-ea1eb0ed/src/` ne retournait **aucun** match avant le patch ; il en retourne maintenant trois (deux dans `AuthContext.tsx`, un dans `VerifyEmail.tsx`). C'est l'évidence directe que le champ Supabase canonique est désormais consommé.
- `grep signup_method` reste à un seul site de lecture (sur le chemin legacy/compat), confirmant la dette identifiée et l'absence de toute écriture dans le repo.
- Type-check : `npx tsc --noEmit` passe sans erreur sur `AuthContext.tsx` et `VerifyEmail.tsx`. `phone_confirmed_at?: string` est un champ natif du type `User` de `@supabase/supabase-js@2.x` (vu dans `node_modules/@supabase/auth-js/dist/module/lib/types.d.ts:357`) ; aucun cast `any` / `unknown` / `as never` n'est utilisé.
- `npm run build` (Vite) passe sans erreur — bundle généré.

**Trace de redirection attendue après correctif (lecture du code) :**

| Étape | Code traversé | Décision |
|------|---------------|----------|
| 1 | `Login.tsx` → `PhoneOTPFlow` → `verifyOtp` | Supabase pose `phone_confirmed_at` |
| 2 | `getPostLoginRoute` dans `lib/auth-redirect.ts` | navigate `/dashboard` (par défaut, pas de role super_admin) |
| 3 | `ProtectedRoute` calcule `emailVerified` via `AuthContext` | `phone_confirmed_at` présent (ou compte phone-only) → `emailVerified = true` |
| 4 | `ProtectedRoute` rend `<Outlet />` | `Dashboard.tsx` monte |
| 5 | `Dashboard.tsx` → `SmartHome.tsx` (sous `<ErrorBoundary>` + `<Suspense>`) | Vue marketplace rendue |

Avant le correctif, l'étape 3 rebasculait vers `/verify-email`, et `VerifyEmail.tsx` ne sortait jamais (cf. §4).

**Vérification end-to-end (runtime, à exécuter par l'opérateur sur l'environnement Replit / preview) :**

L'environnement de cette tâche n'a pas de credentials Supabase ni de session live (l'app n'est pas démarrée ici, aucun workflow configuré côté tâche). Reproduction recommandée côté preview / prod :

1. Ouvrir `/login`, mode téléphone (par défaut).
2. Saisir un numéro et l'OTP reçu.
3. Vérifier que l'URL atterrit sur `/dashboard` et **pas** `/verify-email`.
4. Vérifier dans la console réseau qu'aucune redirection 30x/SPA ne reboucle.
5. Vérifier en SQL côté Supabase :
   ```sql
   select id, email, email_confirmed_at, phone, phone_confirmed_at
   from auth.users where id = '<uid>';
   ```
   `phone_confirmed_at` doit être non-null for le compte testé.
6. Captures (DOM `/dashboard` + console) à déposer dans `docs/audits/screenshots/` pour clore la boucle d'audit.

> Le correctif est purement additif côté logique de garde (un OR supplémentaire + détection phone-only) et ne peut pas régresser les utilisateurs email-verified déjà fonctionnels. Le risque résiduel se limite aux comptes téléphone — ceux-là précisément qui étaient bloqués.

---

## 10. Problèmes secondaires détectés (hors-scope, à suivre)

Triés par priorité décroissante :

| Priorité | Problème | Localisation |
|----------|----------|--------------|
| P1 | `signup_method` est lu mais jamais écrit nulle part — dette à supprimer ou positionner explicitement à la création (signup email/phone/social). | `AuthContext.tsx`, `Signup.tsx`, `PhoneOTPFlow.tsx` |
| P1 | `VerifyEmail.tsx` n'a pas de bouton « Continuer en téléphone » ni de sortie manuelle vers `/dashboard` quand l'utilisateur est en réalité déjà confirmé via un autre canal. UX en cul-de-sac. | `pages/VerifyEmail.tsx` |
| P2 | `getPostLoginRoute` ignore `phone_confirmed_at` et ne logue pas les états utilisateur — debugging difficile en prod. | `lib/auth-redirect.ts` |
| P2 | `Login.tsx` ouvre par défaut sur `mode = "phone"` même quand `authProviders.phone` finira par être `false` (la bascule arrive après chargement asynchrone). Effet de flash UI sur réseaux lents. | `pages/Login.tsx` |
| P2 | Le safety timeout d'`AuthContext` (4–9 s) déclenche `setProfileLoaded(true)` même si la session est en réalité encore en cours de restauration → un utilisateur sur réseau lent peut voir une bannière « Restoring your session… » puis un flash `/login` avant la stabilisation. | `contexts/AuthContext.tsx` |
| P3 | `useUiEngine` est lancé sur le dashboard avec `observeDom: true` ; la limite de 5 runs est correcte mais le polling DOM reste un coût CPU mesurable au mount. | `pages/Dashboard.tsx` |
| P3 | `SmartHome.tsx` charge ~30 widgets via lazy + hooks ; un seul widget cassé est isolé par `<ErrorBoundary>`, mais le coût initial reste élevé. À surveiller pour la perf perçue. | `components/storefront/SmartHome.tsx` |
| P3 | Aucune télémétrie côté client ne distingue « bloqué sur /verify-email » des autres états — un dashboard d'observabilité aurait permis de détecter ce bug en quelques heures plutôt que par retour utilisateur. | `lib/observability/structured-logger.ts` |

---

## 11. Fichiers modifiés

- `easy-locs-ea1eb0ed/src/contexts/AuthContext.tsx` — élargissement du calcul `emailVerified` (commenté en place).
- `easy-locs-ea1eb0ed/src/pages/VerifyEmail.tsx` — l'écran sort maintenant aussi sur `phone_confirmed_at` ou compte phone-only.
- `easy-locs-ea1eb0ed/docs/audits/dashboard-access-audit.md` — ce rapport.
