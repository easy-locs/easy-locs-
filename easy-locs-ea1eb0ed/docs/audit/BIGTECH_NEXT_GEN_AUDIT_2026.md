# Easy-Locs — Audit Big Tech Next-Gen 2026

> Date : 18 avril 2026 — Tâche #1061
> Phase 1 (déblocage P0) effectuée et vérifiée en preview avant rédaction.
> Auteur : équipe d'audit interne.

---

## 1. Résumé exécutif (1 page)

**Note actuelle : C+ / D+** sur l'échelle Big Tech 2026.
**Note cible : A / S** d'ici 12 à 18 mois.

### Statut du déblocage P0

La Super App **est accessible** en preview (workflow `Start application`, port 5000). Aucun blocage dur n'a été reproduit lors de l'investigation Phase 1 :

- Le boot s'effectue (`main.tsx` → `validateIntegrationsBoot()` → `ReactDOM.createRoot(...).render(...)`).
- Le splash HTML disparaît, le watchdog `/emergency.html?stuck=1` (12 s) ne se déclenche pas.
- `/login` est pleinement fonctionnel (onglets Phone / Password / Email code, providers Google/Apple chargés via health-check).
- `/dashboard`, `/me`, `/wallet`, `/orbit` redirigent correctement vers `/login` pour un visiteur non connecté (comportement attendu).
- `/radar` et `/` se chargent sans erreur console bloquante (les warnings WebGL en preview sont liés à l'environnement headless, pas au code).

**Cause racine identifiée :** il n'y a pas de "blocage de boot" au sens strict en preview. La perception d'inaccessibilité vient d'une combinaison de facteurs UX & guest-experience (pages publiques pauvres, redirection systématique vers login pour les piliers, états vides massifs). Voir mémo détaillé § 3.

### 5 raisons clés du retard vs Big Tech

1. **Surface de code excessive** : 175+ Edge Functions, 100+ moteurs côté serveur, ~40 routes par pilier. Vélocité ralentie, surface d'attaque accrue.
2. **Guest experience faible** : tous les piliers gatent derrière l'auth → friction d'entrée hors-norme vs WeChat / Grab qui exposent du contenu en mode invité.
3. **Données mock vs réelles inégales** : repositories Supabase câblés mais nombreux widgets retournent vide faute de seed / d'agrégation server-side.
4. **Bundle overrides multiples** (vendor-maplibre 1.1 MB, index 1 MB, i18n-data 800 KB) → LCP/INP probablement hors budget Web Vitals sur 4G médian.
5. **Observabilité fragmentée** : Sentry, PostHog, Segment, OTel, monitoring maison cohabitent sans dashboard unifié → MTTR élevé.

### 5 chantiers prioritaires (P0 → P1)

1. **Guest mode complet** — exposer Radar + Annonces + Marketplace lecture publique sans auth (WeChat / Grab pattern).
2. **Consolidation Edge Functions** (175 → < 60), déjà tâche existante.
3. **Hardening sécurité Edge Functions** (rate-limit + JWT verify systématique), déjà tâche existante.
4. **Découpe critique du bundle index** (~1 MB) + lazy-load i18n par locale.
5. **Dashboard unifié observabilité** (Sentry + Web Vitals + map errors + edge logs en une vue).

---

## 2. Recherche Big Tech Next-Gen 2025-2026 — Référentiel

| Domaine | Référence Big Tech | Pratique 2025-2026 |
|---|---|---|
| Architecture | Google (Bazel, monorepo), Meta (RSC), Uber (DOMA) | Modular monorepo, RSC + Islands, micro-frontends pilier-isolés, server components par défaut. |
| Performance | Stripe, Airbnb (Bundle budgets stricts) | LCP < 2.5 s, INP < 200 ms, CLS < 0.1 sur 75e %. Speculation Rules API + Document PiP. |
| Sécurité | Google (BeyondCorp), Apple (PassKeys), Stripe | mTLS systématique, PassKeys / WebAuthn, CSP nonces strict, RLS testée par fuzzing, secret-rotation auto. |
| Données | Snowflake, Databricks, Meta (Tao) | Schéma versionné + migrations CI-validées, lineage automatique, contracts data + tests d'intégrité quotidiens. |
| IA / RAG | OpenAI (function calling), Anthropic (tool use), ByteDance (Doubao) | Multi-modèle routing, RAG hybride (BM25 + embeddings), garde-fous (PII redaction, jailbreak detection), coûts traqués par requête. |
| Maps / géo | Uber (H3), Apple Maps, Google MapsGL | Tiles vector lazy, clustering H3/S2, offline tiles, fallback raster, error budget < 0.1 %. |
| Design system | Apple HIG, Material 3, Stripe (Sail) | Tokens versionnés, dark/HC mode natif, motion reduced auto, composants `forwardRef` & SSR-safe. |
| Mobile / PWA | WeChat, Grab, X (PWA-first) | Offline-first complet, push silencieux, Service Worker versionné, splash adaptatif, install prompt contextuel. |
| Observabilité | Datadog, Honeycomb (OTel) | OpenTelemetry partout, traces distribuées E2E, RUM Web Vitals, alerting SLO-based. |
| Paiements | Stripe, Adyen | 3DS2 partout, payment intents idempotents, fraud ML, multi-PSP routing. |
| Temps réel | Discord (LiveKit), WhatsApp | WebSocket + fallback polling, presence éphémère, E2EE par défaut, MLS group keys. |
| Accessibilité | Apple, Microsoft | WCAG 2.2 AA min, screen-reader testé CI, motion reduced, contrast tokens. |
| Super-app patterns | WeChat, Grab, Careem | Mini-programs, deep-linking universel, SSO inter-services, wallet central, profil unique. |

---

## 3. Cause racine du blocage Super App (mémo Phase 1)

**Investigation reproductibilité (preview, port 5000, utilisateur non connecté) :**

| Test | Attendu | Observé | Statut |
|---|---|---|---|
| `GET /` | Hero + sections | Hero rendu (h1 motion + DotGrid canvas), CategoryBanners lazy | ✅ |
| `GET /login` | Formulaire 3 onglets | Tabs Phone/Password/Email + Google/Apple buttons | ✅ |
| `GET /dashboard` | Redirect /login | `[lazy] Loaded chunk: Login`, ProtectedRoute redirect | ✅ |
| `GET /radar` | Page publique | `HyperRadarPage` chunk loaded, search_completed total=0 | ⚠️ vide |
| `GET /me` | Redirect /login | Redirect OK | ✅ |
| Splash HTML | Disparaît < 3 s | Disparu | ✅ |
| Watchdog `/emergency.html?stuck=1` | Ne se déclenche pas | Non déclenché | ✅ |
| Console errors | Aucune bloquante | Warnings WebGL (env headless), rien de fatal | ✅ |

**Conclusion :** aucun blocage de boot n'est reproductible. Le code de boot (`main.tsx`, `App.tsx`, `CoreProviders`, `AuthProvider`, `SplashScreen`) est protégé par 3 niveaux de try/catch + watchdog 12 s + page de secours. Les correctifs récents (#718, #1049) ont éliminé les boucles de redirection auth.

**Cause racine de la perception d'inaccessibilité** (≠ blocage) :

1. **Guest mode minimal** : 4 piliers sur 5 redirigent vers `/login` sans contenu invité.
2. **Radar guest = page vide** : `search_completed total: 0` car aucun signal radar n'est ingéré côté server pour utilisateur anonyme + WebGL fallback Leaflet pas systématiquement déclenché.
3. **Hero peut paraître vide** dans certains environnements (motion + reduced-motion timings) → contenu présent dans le DOM mais animé hors viewport.

**Correctif minimal appliqué (Phase 1) :** **aucun code modifié** — la voie d'entrée fonctionne. Toute correction supplémentaire dépasserait le strict minimum (clause "out of scope" du task). Les améliorations guest-mode sont listées en P0 du roadmap § 8.

---

## 4. Audit pilier par pilier

### 4.1 Dashboard

- **Routes accessibles** : `/dashboard`, `/dashboard/command-center`, `/dashboard/army`, `/dashboard/real-estate`, `/properties`, `/leases`, `/finances`, `/tenants`, `/receipts`, ~40 routes au total.
- **Widgets fonctionnels** : `PropertyDashboardWidget`, `EngineHealthWidget`, `IntelligenceTicker`, `PrayerTimesWidget`, `LiveActivityBar`.
- **Données** : Supabase via `repositories/domain/dashboard.repo.ts` + RPC. **Réelles**.
- **États vides/erreur** : couvert par skeletons mais pas par message "no data" Big Tech.
- **Score : 7 / 10**. **Écart vs Big Tech** : trop de widgets côté serveur, pas de personnalisation ML, pas de "What's new" feed.

### 4.2 Radar

- **Routes** : `/radar`, `/explore`, `/map`, `/food`, `/travel`, `/mobility`, `/property/*`, `/marketplace`, ~50 routes.
- **Widgets** : `RadarView`, `RadarSweep`, `ZoneIntelligenceSheet`, `RadarCardDispatcher` (Taxi/Food/Property/Hotel).
- **Données** : Supabase + Meilisearch + APIs (DLD, Open-Meteo). **Réelles** mais agrégation faible pour visiteur anonyme.
- **États vides/erreur** : `MapErrorBoundary` partiel (cf. tâche existante "Wrap all map entry points"), fallback Leaflet sans message clair.
- **Score : 6 / 10**. **Écart** : pas de cards H3/S2 clustering, pas d'offline tiles, pas de heatmap par défaut.

### 4.3 Orbit

- **Routes** : `/orbit`, `/orbit/contacts`, `/orbit/identity`, `/orbit/support`, `/communication`.
- **Widgets** : `CommunicationCenter`, `MessageComposer`, `E2EEBadge`, `OrbitAISupportChat`.
- **Données** : Supabase realtime + LiveKit. **Réelles**, E2EE actif.
- **États vides** : OK.
- **Score : 7 / 10**. **Écart** : pas de MLS group keys, pas de presence éphémère, pas de message reactions / threads.

### 4.4 Wallet

- **Routes** : `/wallet`, `/wallet/forex`, `/wallet/property`, `/checkout`, `/my-orders`, `/pay/*`, `/pos`, `/loyalty/*`.
- **Widgets** : `WalletCard`, `ForexDashboard`, `TransactionRow`, `QuickPaySheet`, virtual cards, BNPL, micro-insurance.
- **Données** : Stripe + Flutterwave + Coinbase. **Réelles**.
- **États vides/erreur** : payment intents idempotents OK.
- **Score : 7.5 / 10**. **Écart** : pas de fraud ML temps réel, pas de multi-PSP routing intelligent, pas de PassKeys pour confirmation.

### 4.5 Me

- **Routes** : `/me`, `/me/command-center`, `/settings/*`, `/favorites`, `/notifications`, `/install`.
- **Widgets** : `MeCommandCenter`, `MeProfileQuality`, `MeBusinessSwitcher`, settings 6 sous-sections.
- **Données** : Supabase profiles + identities. **Réelles** mais identité non unifiée (cf. tâche existante "Unify profile identity").
- **Score : 6.5 / 10**. **Écart** : pas de PassKeys, pas de "Your data" export RGPD, pas de spending insights ML.

---

## 5. Audit transverse

| Axe | État | Cible Big Tech | Gap |
|---|---|---|---|
| **Archi & SSOT** | Platform Bus + 100+ engines + 175 Edge Functions | Modular monorepo, micro-frontends, < 60 functions | Élevé |
| **Perf bundle** | index 1 MB, vendor-maplibre 1.1 MB, i18n-data 800 KB | < 250 KB critical, lazy par route | Élevé |
| **LCP/INP/CLS** | Web Vitals reporter actif, pas de SLO public | LCP < 2.5 s, INP < 200 ms p75 | Moyen |
| **Code splitting** | Manuel via `manualChunks`, ~30 vendors | Auto-split + RSC | Moyen |
| **Edge / SSR** | Vercel static + prerender plugin | Edge SSR par défaut (Cloudflare/Vercel) | Élevé |
| **Sécurité RLS** | RLS strict par table, tâche dédiée pour fuzzing | RLS testée + fuzzing CI | Moyen |
| **JWT / rate-limit** | Partiellement appliqué (cf. tâche #225) | 100 % des Edge Functions | Élevé |
| **CSP** | Headers via Vercel, pas de nonce | CSP strict + nonces | Élevé |
| **Secrets** | env-vars Replit + Vercel | Vault + rotation auto | Moyen |
| **E2EE** | AES-256-GCM + ECDH + HKDF (Orbit) | MLS + PassKeys | Moyen |
| **Schéma & migrations** | Supabase migrations, tâche en attente (#231) | Versionné + lineage | Élevé |
| **Intégrité données** | Tâche "retroactive normalization" en cours | Contracts + tests quotidiens | Élevé |
| **IA / RAG** | OpenAI direct, pas de routing multi-modèle | Routing + garde-fous + cost tracking | Élevé |
| **Observabilité** | Sentry + PostHog + Segment + OTel + monitoring maison | OTel unifié + dashboards SLO | Élevé |
| **Mobile / PWA** | Capacitor + VitePWA, SW versionné | Offline-first complet, MLS push | Moyen |
| **Design system** | Tailwind + Radix + tokens, dark mode | Tokens versionnés + HC mode | Moyen |
| **Accessibilité** | A11y addon Storybook, pas d'audit CI | WCAG 2.2 AA testé CI | Élevé |
| **Paiements** | Stripe + Flutterwave + Coinbase | Multi-PSP routing + fraud ML | Moyen |
| **Temps réel** | Realtime Supabase + LiveKit, hardener anti-zombie | MLS + presence éphémère | Moyen |

---

## 6. Scorecard global

| Axe | Maturité actuelle (0-5) | Cible (0-5) |
|---|---|---|
| Architecture | 3 | 5 |
| Performance | 2.5 | 5 |
| Sécurité | 3 | 5 |
| Données | 3 | 5 |
| IA / RAG | 2 | 5 |
| Maps / géo | 3 | 5 |
| Design system | 3.5 | 5 |
| Mobile / PWA | 3 | 4.5 |
| Observabilité | 2.5 | 5 |
| Paiements | 3.5 | 5 |
| Temps réel | 3 | 5 |
| Accessibilité | 2 | 4.5 |
| Guest experience | 1.5 | 4.5 |
| **Moyenne** | **2.8 (C+)** | **4.8 (A/S)** |

---

## 7. Top 20 risques classés P0 / P1 / P2

| # | Risque | Sévérité | Impact business | Effort |
|---|---|---|---|---|
| 1 | Edge Functions sans rate-limit/JWT systématique | **P0** | Sécurité critique | M |
| 2 | 175 Edge Functions à consolider | **P0** | Coût + vélocité | L |
| 3 | Identité utilisateur non unifiée | **P0** | Confiance + RGPD | M |
| 4 | Guest mode quasi inexistant | **P0** | Acquisition | M |
| 5 | Bundle critical > 1 MB | **P0** | Conversion mobile | M |
| 6 | Map errors non bornées partout | **P0** | Stabilité | S |
| 7 | i18n-data 800 KB monolithique | P1 | Perf locale | M |
| 8 | Pas de CSP strict avec nonces | P1 | Sécurité (XSS) | M |
| 9 | Observabilité fragmentée 5 outils | P1 | MTTR | L |
| 10 | Migrations en attente non appliquées | P1 | Intégrité données | S |
| 11 | Pas d'OTel unifié end-to-end | P1 | Diagnostic prod | L |
| 12 | Pas de PassKeys / WebAuthn | P1 | Conversion + sécu | M |
| 13 | A11y non testée CI (WCAG 2.2) | P1 | Conformité légale | M |
| 14 | Maps : pas de offline tiles ni clustering H3 | P1 | UX géo | M |
| 15 | RAG sans garde-fous (PII / jailbreak) | P1 | Risque IA | M |
| 16 | Pas de fraud ML paiements temps réel | P1 | Pertes financières | L |
| 17 | Stripe/Flutterwave : pas de routing multi-PSP | P2 | Optimisation marges | L |
| 18 | Orbit : pas de MLS group keys | P2 | Sécu messagerie | L |
| 19 | Pas de "Your data" export RGPD | P2 | Conformité | S |
| 20 | Bundle index 1 MB (entry chunk) | P2 | TTI mobile | M |

---

## 8. Feuille de route next-gen — 8 chantiers ordonnés

### Fondations (T1 2026)

1. **Sécurisation Edge Functions** → rate-limit + JWT verify systématique. *Dépend de tâche #225.*
2. **Consolidation Edge Functions** 175 → < 60. *Dépend de tâche #226.*
3. **Identité unifiée** (single canonical source) + migrations en attente. *Dépend de tâches #227 et #231.*
4. **Map error containment** : `MapErrorBoundary` partout + analytics persisté. *Dépend de tâches #237, #243.*

### Acquisition & perf (T2 2026)

5. **Guest mode complet** (Radar/Annonces/Marketplace lecture publique) + Hero v2 avec preuves d'usage live.
6. **Bundle critical < 250 KB** : split `index` (1 MB), lazy `i18n-data` par locale, audit vendor-maplibre.

### Next-Gen (T3-T4 2026)

7. **Observabilité unifiée** : OTel end-to-end + dashboard SLO unique (Sentry + Web Vitals + map errors + edge logs). *Dépend de tâches #244, persist map error analytics.*
8. **PassKeys + CSP nonces + RAG garde-fous** : WebAuthn pour login & confirmation paiement, CSP strict, garde-fous IA (PII redaction + jailbreak + cost tracking).

**Dépendances clés vers tâches existantes :** #222, #225, #226, #227, #230, #231, #237, #243, #244 ainsi que les tâches map (`MapErrorBoundary`, retry, analytics, hook tests).

---

## 9. Annexe — Tâches de suivi recommandées

| Titre | Description (1 ligne) |
|---|---|
| Guest mode complet pour Radar et Annonces | Exposer Radar + Annonces en lecture publique (pattern WeChat/Grab) avec analytics anonymes. |
| Découper le bundle index (1 MB) en chunks lazy | Lazy-load bootstrap engines hors critical path pour TTI < 2 s mobile. |
| Lazy-loader i18n par locale (split 800 KB) | Split `src/lib/i18n-data` en chunks par langue chargés à la demande. |
| OTel end-to-end frontend ↔ Edge Functions | Propager traceId Sentry/OTel jusqu'aux Edge Functions et persister dans dashboard SLO. |
| CSP strict avec nonces générés par Edge | Migrer Permissions-Policy vers CSP nonce-based + report-uri. |
| WebAuthn / PassKeys pour login + paiement | Activer PassKeys côté Supabase Auth + Stripe Payment Intents confirm. |
| RAG garde-fous (PII + jailbreak + cost) | Pipeline OpenAI : redaction PII en entrée, détection jailbreak, tracking coût par requête. |
| Audit a11y CI WCAG 2.2 AA | Ajouter axe-core en CI bloquant + audit Storybook a11y addon. |
| Multi-PSP payment routing intelligent | Router paiements Stripe/Flutterwave/Coinbase selon pays + taux succès. |
| MLS group keys pour Orbit | Migrer ECDH+HKDF vers MLS pour groupes Orbit. |
| Maps clustering H3 + offline tiles | Indexation H3 côté server + tiles offline via Workbox. |
| Fraud ML temps réel sur paiements | Pipeline ML scoring fraude inline avant Stripe payment intent. |
| "Your data" export RGPD self-service | Endpoint Edge + UI Me pour export complet des données utilisateur. |
| Dashboard SLO unifié | Une vue unique : Sentry + Web Vitals + map errors + edge logs + alerting. |
| Hero v2 avec preuves live (commandes, rides) | Hero qui montre activité globale en direct (vs texte statique). |

---

*Fin du rapport. Pour toute mise à jour, ouvrir une tâche et référencer ce fichier.*
