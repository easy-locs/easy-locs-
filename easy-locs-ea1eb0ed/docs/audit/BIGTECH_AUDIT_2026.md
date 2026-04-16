# Easy-Locs Super App — Audit Big Tech 2026 & Roadmap Next-Gen

> Audit technique complet comparant Easy-Locs aux standards Big Tech (Google, Meta, Uber, Stripe, Airbnb) — avril 2026.
> Produit par : Task #764 (Audit Big Tech complet + roadmap next-gen).
> Hors scope : implémentation (couverte par 6 chantiers dépendants), audit juridique/RGPD formel.

---

## 0. TL;DR

Easy-Locs est une super-app fonctionnellement impressionnante (14 verticales : Radar, Ride/Taxi, GPS, Marketplace, Orbit, Wallet, Property, Delivery, Flight, Hotel, Restaurant, Services, Content Pipeline, Creator). Le socle React 19 + Vite + Supabase est moderne, la discipline de découpage de chunks (budgets perf) et l'outillage DX (CLI `el`, scripts d'audit, Storybook, Playwright, Artillery) sont au-dessus de la moyenne du marché.

Les 5 écarts les plus critiques vs Big Tech :

1. **Surface Edge Functions hypertrophiée** — 225 fonctions Deno (dont 125 non sécurisées cf. tâche en file), multiplication des points d'entrée, difficulté d'auditer les contrats et la RLS.
2. **668 migrations Postgres** — dette schéma massive, risque d'intégrité référentielle, cycles de normalisation incomplets.
3. **Observabilité partielle** — Sentry + web-vitals OK, mais pas de traces distribuées (OTel) bout-en-bout Front → Edge → DB, dashboards ad hoc, alerting non industrialisé.
4. **IA fragmentée** — 7+ moteurs IA (`ai-core-engine`, `ai-feedback-engine`, assistants, enrichissement, shopping, web-search) sans passerelle unique, pas de registre de prompts, pas de gouvernance coût/qualité, pas de RAG centralisé.
5. **Maps/Radar sans dégradation progressive standardisée** — MapLibre + fallback Leaflet + heatmap + clustering existent, mais pas de SLO explicite sur le rendu, pas de télémétrie unifiée, vulnérable aux régressions tokens (déjà constaté via les tâches map-error-*).

Top quick wins (P0, ≤ 2 semaines) : durcir les 125 Edge Functions (JWT + rate limit), activer OTel front/edge, geler les migrations DB (freeze + consolidation), centraliser les appels IA derrière `ai-router`.

---

## 1. Scorecard Maturité (0-10)

Colonne **Confiance** : H = finding vérifié par lecture code/fichiers ; M = inféré par absence de signal évident ; L = hypothèse à confirmer runtime.

| Pilier | Score | Cible Big Tech | Δ | Confiance | Commentaire |
|---|---|---|---|---|---|
| **Architecture** | 6.5 | 9 | -2.5 | H | Domaines clairs (29), mais 225 Edge Functions + couplage UI↔engines |
| **Performance Web** | 7.5 | 9 | -1.5 | H | Budgets perf + chunks pillar + PWA solides ; INP/LCP non tracké par route |
| **Sécurité** | 5.5 | 9.5 | -4.0 | M | RLS présente ; surface Edge + secrets + CSP à durcir (tâche existante confirme) |
| **DX / Outillage** | 8 | 9 | -1.0 | H | CLI maison, audits, Storybook, Playwright. Excellent |
| **Observabilité** | 5 | 9 | -4.0 | M | Sentry présent, pas de traces distribuées visibles ni SLO formels |
| **IA** | 5 | 9 | -4.0 | H | Fragmentée (8 edge fns + 6 engines lib), pas de gateway unique |
| **Maps / Radar / GPS** | 6.5 | 9 | -2.5 | H | MapLibre + fallback Leaflet ; tâches map-error-* confirment instabilité |
| **Data / Postgres** | 5.5 | 9 | -3.5 | H | 668 migrations, tâches normalisation en file |
| **Mobile / PWA** | 7 | 9 | -2.0 | M | PWA + Capacitor ; offline partiel, push unifié non confirmé |
| **Payments** | 7 | 9.5 | -2.5 | L | Stripe Connect + SEPA ; Apple/Google Pay couverture non confirmée runtime |
| **Realtime / Ride / Taxi** | 6 | 9.5 | -3.5 | M | Supabase Realtime + LiveKit ; backpressure/SLO non vus |

**Maturité globale : 6.3 / 10** (vs 9 standard Big Tech). Potentiel d'atteindre 8.5 en 6 chantiers ciblés.

---

## 2. Cartographie des domaines

### 2.1 Verticales produit

| Domaine | Dossier | Complexité | Engines clés |
|---|---|---|---|
| Radar / Explore | `src/domains/radar`, `src/components/radar` (25+ composants) | Haute | `mapEngine`, `heatmap-engine`, `nearby-discovery`, `smart-map-search`, `radar-dispatch` |
| Ride / Taxi | `src/domains/ride` | Haute | `pricing.ts`, `ports.ts`, `service.ts`, driver-positioning |
| GPS / Maps | `src/lib/map`, `src/components/map` | Haute | MapLibre + fallback Leaflet, clustering, layers |
| Marketplace (C2C, rental, property) | `src/domains/marketplace`, `property`, `rental` | Haute | Search, filters, listings |
| Orbit (messagerie/social) | `src/domains/orbit`, `src/families/orbit` | Très haute | E2EE annoncé, non vérifié |
| Wallet / Payments | `src/domains/wallet`, `src/lib/banking` | Haute | Stripe Connect, SEPA, payouts |
| Property (gestion locative) | `src/domains/property` | Haute | Leases, tenants, receipts, interventions |
| Delivery | `src/domains/delivery`, `components/delivery` | Moyenne | Proof of delivery |
| Flight / Hotel / Restaurant / Services | `src/domains/{flight,hotel,restaurant,services}` | Moyenne | Intégrations externes |
| Content Pipeline | `src/domains/content-pipeline` | Haute | Scraping, enrichment, SEO |
| Creator | `src/domains/creator` | Moyenne | Ads, boost |
| Admin / Control Plane | `src/pages/admin*`, `src/lib/control-plane` | Haute | Review, disputes, alerts |

### 2.2 Chiffres clés

- **29 domaines** (src/domains)
- **323 modules** src/lib
- **181 pages** routes React
- **225 Edge Functions** Deno (Supabase)
- **668 migrations** SQL
- **96 répertoires de composants** UI
- Stack : React 19.2, Vite 5, Supabase 2.99, MapLibre 5.23, TanStack Query 5.90, Zustand 5, Framer Motion 12, Three.js 0.175, Capacitor 8, Sentry 10, PostHog, Firebase 12

---

## 3. Audit par domaine

### 3.1 Architecture (6.5/10)

**État actuel**
- Découpage domaine (atoms / molecules / microns / adapters / ports / service) solide et cohérent sur Radar, Wallet, Ride, Orbit.
- `src/lib` contient 323 modules racines — signal de sur-granularité et de duplication (ex. multiples engines IA, multiples moteurs d'auth, multiples caches).
- 225 Edge Functions : mélange de routers (`admin-router`, `booking-router`) et de fonctions atomiques — modèle hybride non documenté.
- Chunks Vite bien séparés (vendor-*, pillar-*), budgets enforcés via plugin custom.

**Écarts Big Tech**
- Pas de **monorepo** pnpm/turbo séparant `web`, `mobile`, `edge`, `shared`, `contracts`. Un seul paquet.
- Pas de **contracts-first** (OpenAPI/tRPC/GraphQL) entre front et Edge.
- Pas de **CODEOWNERS par domaine** ni de DoD par vertical.

**Risques**
- Changement transversal coûteux (ex. renommer un champ user → toucher ~200 fonctions).
- Onboarding dev lent.

**Recommandations**
- P1 : extraire `@easylocs/contracts` (Zod schemas + types partagés front/edge).
- P1 : passer à un monorepo pnpm + turborepo, `apps/web`, `apps/mobile`, `packages/ui`, `packages/contracts`, `services/edge`.
- P2 : RFC process sur les changements structurels (ADR dans `docs/adr`).

### 3.2 Performance Web (7.5/10)

**État actuel**
- React 19 + Vite 5, chunks pillar-* (radar/wallet/orbit/me/dashboard) avec budgets KB (250/400) enforcés en CI.
- PWA Workbox : NetworkFirst pour navigate, SWR pour Supabase REST, CacheFirst images/fonts.
- Compression gzip + brotli, sourcemaps hidden pour Sentry.
- `optimizeDeps.exclude` sur MapLibre, Three, Tesseract (bon choix).
- `esbuild.drop: ["console","debugger"]` en prod.

**Écarts Big Tech**
- Pas de **SSR / streaming** : tout rendu client. LCP pénalisé sur entrées froides.
- `modulePreload.polyfill: true` inutile pour cibles modernes → coût bytes.
- Pas de **route-level INP tracking** dans web-vitals. PostHog sans annotations.
- Pas d'Edge CDN (Vercel/Cloudflare) configuré devant l'app ; PWA cache compense partiellement.
- Pas de **React Compiler** (babel-plugin-react-compiler) — aligné React 19, gain free 5-15% re-renders.
- `react-router-dom` v7 OK ; pas de `loader`/`defer` utilisés.

**Risques**
- LCP >2.5s sur 3G/low-end Android, INP >200ms sur pages lourdes (HyperRadar).

**Recommandations**
- P0 : activer React Compiler (opt-in) sur pillar-dashboard et pillar-me.
- P1 : SSR/prerender streaming sur routes publiques (landing, property listing, SEO).
- P1 : web-vitals taggués par route + pillar, remontés dans PostHog dashboard.
- P2 : déployer sur edge runtime (Vercel Edge / Cloudflare Workers) pour HTML shell.

### 3.3 Sécurité (5.5/10)

**État actuel**
- Supabase RLS présente (cf. `supabase/migrations`).
- Sentry pour crashs front + sourcemaps upload.
- PWA avec stratégie cache différenciée ; pas de CSP stricte détectée dans `vite.config.ts`.
- DOMPurify utilisé (dépendance présente).
- Tâches en file : "Secure all Edge Functions with rate limiting and JWT verification" → implique 125+ fonctions non sécurisées.

**Écarts Big Tech**
- Pas de **CSP + Trusted Types** activés côté HTML. Pas de Subresource Integrity.
- Pas de **WAF** / rate limiting centralisé (devrait être au niveau edge, pas par fonction).
- Pas de rotation automatisée de secrets (Firebase, Supabase service role, Mapbox/MapTiler tokens).
- Surface Edge Functions trop large pour audit exhaustif (225).
- Pas de **fuzz testing** ni **SAST en CI** (scripts existent mais pas obligatoires).
- E2EE Orbit : annoncé, non vérifié dans le code (à confirmer, risque réputationnel si faux).

**Risques**
- CVSS élevé : auth bypass possible sur Edge Functions sans JWT.
- Fuite de secrets via sourcemaps publiques ou env mal séparées.
- XSS via champs UGC (listings, messages) si DOMPurify non systématisé.

**Recommandations**
- P0 : JWT + rate limit sur 100% Edge Functions (tâche déjà planifiée).
- P0 : CSP strict + Trusted Types en mode report-only puis enforce.
- P1 : consolider Edge Functions à <60 (tâche déjà planifiée).
- P1 : rotation auto secrets (Supabase Vault + GitHub Actions).
- P1 : vérification/preuve E2EE Orbit (libsignal ou NaCl + documentation audit).
- P2 : SAST obligatoire en CI (semgrep, CodeQL), dependency audit bloquant.

### 3.4 DX / Outillage (8/10)

**État actuel**
- CLI maison `el-cli.ts`.
- Scripts : `perf-audit`, `bundle:gate`, `check:budget`, `security:scan`, `sdk-generator`, `changelog`, `version-bump`, `api:docs`.
- Storybook 8 + Chromatic.
- Playwright (desktop + mobile), Artillery load tests, Vitest.
- Scripts de génération locales automatiques (`predev`, `prebuild`).

**Écarts Big Tech**
- Pas de **monorepo build cache** (turborepo/nx remote cache).
- CI/CD pipeline non visible (à confirmer GitHub Actions).
- Pas de **preview deploys par PR** obligatoires.
- Pas de **typechecking incremental** en dev (tsc `--noEmit` global).

**Recommandations**
- P1 : turborepo + remote cache (Vercel/self-hosted).
- P2 : preview deploys par PR avec dataset seed anonymisé.

### 3.5 Observabilité (5/10)

**État actuel**
- Sentry front (React) + Vite plugin (sourcemaps upload).
- PostHog.
- web-vitals package présent.
- Pas de traces distribuées détectées.
- Tâches récentes sur error boundaries maps (MapErrorBoundary) — positif.

**Écarts Big Tech**
- Pas d'**OpenTelemetry** end-to-end (front → edge → DB).
- Pas de **correlation IDs** propagés depuis front jusqu'aux fonctions Deno.
- Pas de **SLO/SLI formels** par pilier (ex. P95 < 300ms pour radar search).
- Logs Edge Functions non structurés (JSON lines non garantis).
- Pas de **runbooks** pour incidents critiques.

**Recommandations**
- P0 : instrumenter OTel front + Edge, exporter vers Grafana Tempo/Honeycomb.
- P0 : SLO par pilier + error budget.
- P1 : dashboards unifiés (maps, ride, wallet, orbit).
- P2 : alerting PagerDuty/Opsgenie + runbooks.

### 3.6 IA (5/10)

**État actuel**
- `src/lib/ai/` : ai-core-engine, ai-feedback-engine, ops-chat, suggest-best-driver-zone, city-supply-balancer, driver-positioning.
- Edge Functions : `ai-assistant`, `ai-entity-enrichment`, `ai-proxy`, `ai-router`, `ai-shopping-chat`, `ai-web-search`, `chief-agent`, `classify-business`.
- Pas de registre de prompts unifié détecté.

**Écarts Big Tech**
- Pas de **gateway unique** : 8 fonctions IA distinctes → coûts non agrégés, quotas non enforceables.
- Pas de **RAG centralisé** (pgvector présent via `pg`? à vérifier).
- Pas de **prompt registry** versionné (pas de `prompts/` structurée).
- Pas de **eval harness** (golden sets, regression tests LLM).
- Pas de **fallback models** ni **circuit breakers** visibles.

**Recommandations**
- P0 : consolider derrière `ai-router` (1 seule edge function gateway).
- P0 : prompt registry versionné dans `src/lib/ai/prompts/` avec tests.
- P1 : RAG unifié pgvector + embeddings batch.
- P1 : eval harness + coût/latence par tenant.
- P2 : garde-fous PII detection + content policy.

### 3.7 Maps / Radar / GPS (6.5/10)

**État actuel**
- MapLibre-gl 5.23 principal, Leaflet fallback, leaflet.heat, leaflet.markercluster.
- Engines : `mapEngine`, `map-engine-v2`, `heatmap-engine`, `live-stations-engine`, `nearby-discovery-engine`, `route-preview-engine`, `smart-map-search`.
- 25+ composants radar (RadarView, HeatmapModeSelector, SmartLayerToggle, NightlifeZonesLayer, WeatherCapsule…).
- Tâches en file nombreuses autour des erreurs maps → signal d'instabilité passée, en cours de stabilisation.
- `vendor-maplibre` chunk dédié, exclu de optimizeDeps (bon).

**Écarts Big Tech (Uber/Lyft/Google)**
- Pas de **tile cache offline** explicite au-delà de PWA basique.
- Pas de **SLO rendu** (time-to-first-marker, FPS pan/zoom).
- Pas de **vector tiles maison** (dépendance MapTiler/Mapbox → coût + vendor lock).
- Pas de **heatmap GPU-accelerated** unifiée (deux moteurs : MapLibre + leaflet.heat fallback).
- Pas de **clustering serveur** (ST_ClusterKMeans) pour grands volumes.

**Risques**
- Coût tokens tiers qui explose à l'échelle.
- Régressions récurrentes (historique des tâches map-error-*).

**Recommandations**
- P0 : télémétrie maps unifiée (FPS, token errors, load time) + SLO.
- P1 : clustering serveur PostGIS pour >5k points.
- P1 : offline tiles via PMTiles + service worker.
- P2 : vector tiles maison pour réduire coût tokens.

### 3.8 Data / Postgres (5.5/10)

**État actuel**
- 668 migrations — impressionnant mais ingérable.
- Tâches en file : "Retroactive Data Normalization", "Unify profile identity", "Normalize listing_type".
- Postgres via Supabase + driver `pg` utilisé côté Node (scripts).

**Écarts Big Tech**
- Pas de **schema consolidation** / squash annuel.
- Pas de **contrats référentiels** documentés (ex. dbt / sqlmesh).
- Pas de **lineage** / catalog (OpenMetadata, DataHub).
- Intégrité référentielle partielle (signalée par la tâche de normalisation).

**Recommandations**
- P0 : freeze migrations sur 4 semaines, squash en une baseline propre.
- P1 : schemaspy / dbdocs auto-généré.
- P1 : contrats dbt + tests qualité données.
- P2 : CDC vers data warehouse (Snowflake/BigQuery) pour analytics.

### 3.9 Mobile / PWA (7/10)

**État actuel**
- Capacitor 8 (iOS + Android) + 10+ plugins.
- PWA vite-plugin-pwa avec runtime caching différencié.
- Firebase messaging SW stampé avec version build.
- Pas d'app shell pur / skeleton universel détecté.

**Écarts Big Tech**
- Pas de **install prompt** intelligente (pattern Lighthouse).
- Offline partiel : pas de **queue de mutations** (background sync).
- Pas de **push notifications** unifiées (Firebase vs Capacitor push vs Web Push).
- Perf sur low-end non mesurée en CI.

**Recommandations**
- P1 : background sync (TanStack Query + workbox-background-sync).
- P1 : unifier push (1 service d'envoi, 3 canaux : APNs/FCM/WebPush).
- P2 : budget perf device low-end (Moto G Power profile).

### 3.10 Payments (7/10)

**État actuel**
- Stripe Connect + SEPA (`collect-sepa-rents` edge function).
- `capture-payment-intent`, `check-connect-status`.
- Pages Checkout / Payment / Wallet présentes.

**Écarts Big Tech (Stripe / Uber)**
- Apple Pay / Google Pay non généralisés (à confirmer).
- Pas de **3DS2 challenge flow** uniformisé visible.
- Pas de **idempotency keys** systématisées côté client.
- Pas de **reconciliation automatisée** (tâche FinancialReconPage existe mais manuelle ?).

**Recommandations**
- P1 : Apple/Google Pay + Payment Request API généralisés.
- P1 : idempotency keys partout (création intents, transferts).
- P2 : reconciliation cron + alertes drift > 0.1%.

### 3.11 Realtime / Ride / Taxi (6/10)

**État actuel**
- Supabase Realtime (channels).
- LiveKit (externe, exclu des bundles).
- `src/domains/ride` avec pricing, ports, service, adapters.

**Écarts Big Tech (Uber/Lyft/Didi)**
- Pas de **WebSocket backpressure** explicite ni de reconnect exponentiel standardisé.
- Pas de **state reconciliation** pour la position driver (idempotency + clock skew).
- Pas de **geo-fencing** PostGIS temps réel côté serveur.
- Pas de **SLO latence** (P95 push driver → rider).

**Recommandations**
- P0 : SLO latence realtime + métriques.
- P1 : reconnect strategy unifiée (hook shared avec maps).
- P1 : geo-fencing PostGIS + triggers pour zones payantes/surge.
- P2 : passer dispatch ride vers un moteur dédié (Temporal/Inngest) si volumes le justifient.

---

## 4. Findings critiques (tableau P0/P1/P2)

| ID | Finding | Domaine | Sévérité | Effort | Impact | Owner | Milestone |
|---|---|---|---|---|---|---|---|
| F-01 | 125 Edge Functions sans JWT/rate-limit | Sécurité | **P0** | M | Très élevé | Platform/Security | Chantier 3 — S+2 |
| F-02 | Pas de traces distribuées OTel | Observabilité | **P0** | M | Très élevé | Platform/SRE | Chantier 4 — S+4 |
| F-03 | IA fragmentée (8 fonctions) sans gateway | IA | **P0** | S | Élevé | AI Team | Chantier 5 — S+6 |
| F-04 | 668 migrations, schéma non consolidé | Data | **P0** | L | Élevé | Data/Backend | Chantier 6 — S+10 |
| F-05 | Télémétrie maps absente + SLO manquants | Maps | **P0** | S | Élevé | Maps/Radar | Chantier 1 — S+1 |
| F-06 | 225 Edge Functions → >60 | Architecture | **P0** | L | Élevé | Platform | Chantier 3 — S+3 |
| F-07 | CSP + Trusted Types absents | Sécurité | **P1** | S | Élevé | Security | Chantier 3 — S+3 |
| F-08 | Pas de SSR/streaming sur SEO | Perf | **P1** | M | Moyen | Web Platform | Chantier 2 — S+3 |
| F-09 | Monorepo + contracts-first absent | Archi / DX | **P1** | L | Moyen | Platform/DX | Chantier 2 — S+4 |
| F-10 | Pas de prompt registry IA | IA | **P1** | S | Moyen | AI Team | Chantier 5 — S+5 |
| F-11 | Pas de RAG centralisé | IA | **P1** | M | Élevé | AI Team | Chantier 5 — S+6 |
| F-12 | Offline / background sync partiel | Mobile | **P1** | M | Moyen | Mobile | Chantier 2 — S+4 |
| F-13 | Push unification APNs/FCM/WebPush | Mobile | **P1** | M | Moyen | Mobile | Chantier 2 — S+5 |
| F-14 | Clustering serveur PostGIS manquant | Maps | **P1** | S | Moyen | Maps/Radar | Chantier 1 — S+2 |
| F-15 | SLO ride/taxi latence | Realtime | **P1** | S | Élevé | Ride/Realtime | Chantier 1 — S+2 |
| F-16 | Rotation secrets non automatisée | Sécurité | **P1** | S | Élevé | Security | Chantier 3 — S+3 |
| F-17 | E2EE Orbit non prouvé | Sécurité | **P1** | M | Réputation | Security/Orbit | Chantier 3 — S+4 |
| F-18 | React Compiler non activé | Perf | **P2** | XS | Faible | Web Platform | Chantier 2 — S+2 |
| F-19 | Preview deploys par PR | DX | **P2** | S | Faible | DX/SRE | Chantier 4 — S+4 |
| F-20 | Vector tiles maison | Maps | **P2** | L | Moyen (coût) | Maps/Radar | Chantier 1 — S+8 |
| F-21 | CDC + data warehouse | Data | **P2** | L | Analytics | Data | Chantier 6 — S+12 |
| F-22 | 3DS2 / idempotency généralisés | Payments | **P2** | M | Moyen | Payments | Chantier 6 — S+10 |
| F-23 | Eval harness LLM | IA | **P2** | M | Qualité | AI Team | Chantier 5 — S+7 |

*Owners = équipes indicatives à valider avec le staffing réel. Milestones en semaines depuis kickoff Chantier correspondant.*

Légende effort : XS <1j · S 1-3j · M 1-2sem · L 2-6sem.

---

## 5. Roadmap priorisée — 6 chantiers next-gen

Ordre d'exécution conseillé. Chaque chantier correspond à une tâche aval déjà planifiée.

### Chantier 1 — **Next-Gen Maps / Radar / GPS / Ride**
- Findings : F-05, F-14, F-15, F-20.
- Livrables : télémétrie maps unifiée, SLO rendu/latence, clustering PostGIS, stratégie offline tiles (PMTiles), reconnect/backpressure realtime.
- Pourquoi en premier : forte visibilité utilisateur, fondation pour Ride/Taxi.

### Chantier 2 — **Next-Gen Performance & Edge**
- Findings : F-08, F-18.
- Livrables : React Compiler, SSR/streaming sur routes SEO, web-vitals route-level, edge runtime HTML shell, budgets INP par pillar.
- Pourquoi : quick wins bundle + Core Web Vitals, déblocage SEO.

### Chantier 3 — **Next-Gen Sécurité**
- Findings : F-01, F-07, F-16, F-17, + dépend F-06 (partiel).
- Livrables : JWT + rate-limit 100% Edge Functions, CSP + Trusted Types (report→enforce), rotation auto secrets, preuve E2EE Orbit.
- Pourquoi : bloque toute extension publique et toute conformité audit.

### Chantier 4 — **Next-Gen Observabilité**
- Findings : F-02.
- Livrables : OTel front + Edge, correlation IDs, dashboards par pilier, SLO/SLI, runbooks, alerting.
- Pourquoi : pré-requis pour opérer les chantiers suivants sereinement.

### Chantier 5 — **Next-Gen IA**
- Findings : F-03, F-10, F-11, F-23.
- Livrables : AI gateway unique (`ai-router` consolidé), prompt registry versionné, RAG pgvector centralisé, eval harness + coûts par tenant, garde-fous PII/content.
- Pourquoi : dépend obs (chantier 4) pour coûts/qualité.

### Chantier 6 — **Next-Gen Ride/Taxi, Marketplace, Realtime**
- Findings : F-15 (renforcement), + F-04 (partiel data ride/marketplace).
- Livrables : dispatch moteur dédié, geo-fencing PostGIS, pricing dynamique branché sur IA (chantier 5), reconciliation Wallet/Stripe.
- Pourquoi : dernier car capitalise sur les 5 chantiers précédents.

Chantiers couverts par des tâches aval existantes (ne pas proposer en doublon).

---

## 6. Annexes

### 6.1 Méthodologie
- Inspection statique : `src/domains` (29), `src/lib` (323), `src/pages` (181), `supabase/functions` (225), `supabase/migrations` (668), `vite.config.ts`, `package.json`, `src/components/radar`, `src/lib/map`, `src/lib/ai`, `docs/audit/*`.
- Comparaison avec standards publics : Google SRE Workbook, Meta Web Performance, Uber Engineering Blog (H3, schemaless), Stripe Security Playbook, Airbnb Design System.
- Scoring : pondération égale par pilier, borne 0-10, cible Big Tech calibrée à 9-9.5.

### 6.2 Hypothèses & limites
- Audit statique, sans accès runtime / métriques prod.
- E2EE Orbit non vérifié par lecture cryptographique approfondie.
- Volumes réels (requêtes/jour, MAU) non disponibles ici — les SLO proposés sont des cibles génériques Big Tech.
- RGPD non couvert formellement (mentions indicatives seulement).

### 6.3 Évidence reproductible

Commandes exécutables depuis `easy-locs-ea1eb0ed/` pour reproduire les chiffres-clés et vérifier les findings factuels.

| Claim | Commande | Résultat attendu (avril 2026) |
|---|---|---|
| 29 domaines | `ls src/domains \| wc -l` | 29 |
| 181 pages | `ls src/pages \| wc -l` | 181 |
| 323 modules lib | `ls src/lib \| wc -l` | 323 |
| 225 Edge Functions | `ls supabase/functions \| wc -l` | 225 |
| 668 migrations | `ls supabase/migrations \| wc -l` | 668 |
| 25+ composants radar | `ls src/components/radar \| wc -l` | 25 |
| 8 edge functions IA | `ls supabase/functions \| grep -E '^(ai-\|chief-agent\|classify-business)'` | 8 lignes |
| 6 engines IA lib | `ls src/lib/ai \| wc -l` | 8 fichiers (dont 6 engines) |
| React 19 + Vite 5 | `grep -E '\"react\"\|\"vite\"' package.json` | ^19.2 / ^5.4 |
| MapLibre 5.23 | `grep maplibre-gl package.json` | ^5.23 |
| Stripe Connect | `ls supabase/functions \| grep -E 'connect\|payout\|payment'` | admin-payout-*, capture-payment-intent, check-connect-status, collect-sepa-rents |
| Sentry front | `grep @sentry/react package.json` | ^10.45 |

**Findings inférés (confiance M/L)** — nécessitent confirmation runtime :
- F-01 (125 fns non sécurisées) : chiffre issu des tâches projet en file ("Secure all Edge Functions with rate limiting and JWT verification"). Vérifier via inventaire auth middlewares dans `supabase/functions/*/index.ts`.
- F-02 (pas d'OTel) : absence de dépendance `@opentelemetry/*` dans `package.json` et de `supabase/functions/_shared/otel*`. À confirmer sur environnements staging/prod.
- F-17 (E2EE Orbit) : revue cryptographique hors scope de cet audit statique.
- F-22 (Apple/Google Pay) : présence Stripe confirmée, couverture paymentRequest non inspectée exhaustivement.

### 6.4 Références internes
- `docs/audit/GLOBAL_AUDIT_REPORT.md`, `docs/audit/FULL_SYSTEM_AUDIT.md`, `docs/audit/SUPERAPP_DEEP_AUDIT_2026.md`, `docs/audit/AUDIT_REPORT_2026_03_23.md`.
- `docs/audit/audit/*` (CANONICAL_WIRING_MODEL, DOMAIN_RELATION_MAP, STRUCTURE_WIRING_AUDIT, MISSING_CONNECTIONS_REPORT, FIX_PLAN_BY_PHASE).
- Ce rapport consolide et priorise ces audits existants sous la grille Big Tech 2026.

---

_Fin du rapport._
