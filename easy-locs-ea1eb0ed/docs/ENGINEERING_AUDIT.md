# Easy-Locs — Audit Ingénierie Complet
**Date**: 10 avril 2026
**Version**: Production Readiness Assessment

---

## 1. CARTOGRAPHIE COMPLÈTE DE L'APP

### Architecture Globale
| Métrique | Valeur |
|---|---|
| Fichiers TS/TSX | 3 279 |
| Lignes de code total | 462 115 |
| Pages (routes) | 397 |
| Composants UI | 717 |
| Hooks | 141 |
| Stores (Zustand) | 36 |
| Repositories | 98 |
| Engines | 61 |
| Services | 22 |
| Tests unitaires | 66 |
| Tests E2E | 8 |
| Dépendances npm | 106 |

### 5 Piliers
| Pilier | Route | Fichier principal | Fonction |
|---|---|---|---|
| Dashboard | `/dashboard` | `SmartHome.tsx` (769 lignes) | Accueil intelligent, services, catégories |
| Radar | `/radar` | `HyperRadarPage.tsx` | Découverte géolocalisée, recherche |
| Orbit | `/orbit` | `CommunicationCenter.tsx` | Messagerie, appels, contacts |
| Wallet | `/wallet` | `WalletHubPage.tsx` | Paiements, transactions, POS |
| Me | `/me` | `MeCommandCenter.tsx` (718 lignes) | Profil, business switch, settings |

### Verticales Marketplace (14)
food, grocery, shops, services, health, beauty, taxi, delivery, property, stay, utility, travel, education, finance

### Admin Panel
100+ routes spécialisées : AI quality, fraud detection, live ops, trust graph, financial recon, notification engine, etc.

### Multi-plateforme
- PWA (manifest.json, service worker)
- Mobile natif (Capacitor iOS/Android)
- SEO (sitemap: 2 203 URLs, 6 sub-sitemaps)

---

## 2. AUDIT WIRING END-TO-END

### Routes → Pages → Composants
- **App.tsx** (858 lignes) : routeur principal, 5 piliers + admin + SEO + deep links
- **app-route-registry.tsx** : lazy-loading centralisé de tous les composants page
- **ProtectedRoute** : garde d'authentification
- **RoleGuard** : garde de rôle (admin/merchant/driver)
- **AppLockGuard** : PIN/biométrique

### Base de données
- **db()** wrapper dans `src/services/db.ts` : point d'accès centralisé
- **v2db()** dans `src/lib/shared/db-v2.ts` : kill-switch pour tables legacy
- **Tables V1 → V2** : migration en cours (orbit_call_sessions → orbit_call_sessions_v2)
- **RPC** : logique critique en Postgres (transfer_locs, atomic_wallet_transfer, fetch_and_lock_job)
- **Realtime** : subscriptions sur trip_live_state, orbit_messages

### Taxonomie
- **SSOT** : `category-tree.ts` — 14 primaires, 268+ sous-catégories
- **Menu system** : `src/lib/menu/` — registre, moteur, filtrage role/pays/langue
- **World taxonomy** : `world-class-taxonomy.ts` — couche d'enrichissement

---

## 3. FAIBLESSES TECHNIQUES IDENTIFIÉES

### CRITIQUE (bloque la production)

| # | Problème | Impact | Fichiers |
|---|---|---|---|
| C1 | **387 imports directs supabase** contournant db() | Kill-switch V2 non appliqué, pas de logging centralisé | 387 fichiers |
| C2 | **3 762 usages de `any`** | Perte de type safety, bugs runtime silencieux | Codebase-wide |
| C3 | **274 catch blocks vides** `catch {}` | Erreurs avalées silencieusement, debugging impossible | Codebase-wide |
| C4 | **Secret fallback hardcodé** dans wallet-transfer | `WALLET_PIN_SECRET || "default-wallet-pin-secret"` | supabase/functions/wallet-transfer |
| C5 | **Build production échouait** | Import manquant `checkPublishBlockers` + clé dupliquée | **CORRIGÉ** |

### ÉLEVÉ (risque significatif)

| # | Problème | Impact |
|---|---|---|
| H1 | **214 console.log** restants | Fuite d'info en prod, bruit en console |
| H2 | **Fragmentation schema V1/V2** | Certains composants écrivent V1 pendant que d'autres lisent V2 |
| H3 | **CORS wildcard** `Access-Control-Allow-Origin: *` sur Edge Functions | Accepte requêtes de n'importe quelle origine |
| H4 | **localStorage pour rôle/org** | Manipulable côté client (backend doit re-vérifier) |
| H5 | **Fichiers monolithiques** — 8 fichiers > 800 lignes | MeCommandCenter (718), SmartHome (769), App.tsx (858), MerchantOnboardingPage (1599) |
| H6 | **Couverture de tests** : 66 unit + 8 E2E pour 3 279 fichiers | ~2% couverture estimée |

### MOYEN (dette technique)

| # | Problème | Impact |
|---|---|---|
| M1 | 14 marqueurs TODO/FIXME/HACK | Travail incomplet |
| M2 | Pas de rate limiting côté client | Possibilité de spam API |
| M3 | Pas de circuit breaker visible | Pas de fallback si Supabase tombe |
| M4 | Pas de monitoring/APM en place | Pas de visibilité performance prod |
| M5 | Pas de validation de schéma (Zod/Yup) sur les inputs critiques | Données invalides possibles |

---

## 4. AUDIT SÉCURITÉ

### Points forts
- Auth Supabase + session lifecycle robuste
- RPC pour opérations critiques (wallet transfers atomiques)
- DOMPurify pour sanitisation HTML (CVGenerator)
- Brute-force protection sur PIN wallet (5 tentatives, lock 5 min)
- Audit logging sur login/logout
- Edge Functions avec Service Role Key côté serveur

### Vulnérabilités identifiées
| Sévérité | Vulnérabilité | Recommandation |
|---|---|---|
| **CRITIQUE** | Fallback secret hardcodé wallet PIN | Supprimer le fallback, rendre WALLET_PIN_SECRET obligatoire |
| **ÉLEVÉ** | CORS `*` sur Edge Functions | Restreindre aux domaines Easy-Locs |
| **ÉLEVÉ** | 387 accès DB non centralisés | Migrer vers db() pour audit trail |
| **MOYEN** | localStorage pour rôle actif | Vérifier côté serveur systématiquement |
| **MOYEN** | Pas de CSP (Content Security Policy) | Ajouter headers CSP |
| **BAS** | console.log en prod | Supprimer ou conditionner à dev only |

---

## 5. PLAN D'OPTIMISATION PERFORMANCE

### Phase 1 — Quick Wins (impact immédiat)
1. **Supprimer les 214 console.log** — réduction bruit + micro-perf
2. **Code splitting agressif** — les 8 fichiers >800 lignes doivent être découpés
3. **Lazy loading** — vérifier que toutes les pages admin sont lazy (100+ routes)
4. **Image optimization** — vérifier que OptimizedImage est utilisé partout
5. **Memoization audit** — vérifier useMemo/useCallback sur les renders coûteux

### Phase 2 — Architecture (1-2 semaines)
1. **Bundle splitting par pilier** — dashboard/radar/orbit/wallet/me comme chunks séparés
2. **Service Worker cache** — stratégie stale-while-revalidate pour assets statiques
3. **Virtual scrolling** — pour les listes longues (produits, messages, contacts)
4. **Query dedup** — auditer les useQuery pour staleTime et caching optimal
5. **Prefetch intelligent** — `prefetchForRoute` existe, vérifier couverture

### Phase 3 — Monitoring (mesure continue)
1. **Sentry** déjà importé (`@sentry/react`) — configurer les breadcrumbs et performance
2. **Web Vitals** — LCP, FID, CLS tracking
3. **API latency** — mesurer les temps de réponse Supabase
4. **Bundle analyzer** — intégrer vite-plugin-visualizer

---

## 6. VALIDATION MULTI-PAYS

### Couverture actuelle
- **Templates pays** : 24+ pays dans `src/lib/templates/` (de, fr, gb, it, etc.)
- **Country rules Real Estate** : 15 pays (FR/AE/US/GB/DE/ES/MA/TN/SN/CI/CM/IN/SA/EG/TR)
- **Devises** : 120+ (CurrencyCode type)
- **Langues i18n** : 5 supportées (fr, en, es, de, ar) avec détection RTL
- **RTL** : ar, he, fa, ur détectés
- **Country config** : `src/lib/country-config.ts` (746 lignes)
- **Accounting rules** : `src/lib/accounting-rules.ts` (772 lignes)

### Lacunes multi-pays
| # | Lacune | Impact |
|---|---|---|
| 1 | Objectif 31 langues, seulement ~5 supportées | 26 langues manquantes |
| 2 | Pas de format date localisé visible | DD/MM vs MM/DD selon pays |
| 3 | Pas de format numérique localisé | 1,000.00 vs 1.000,00 |
| 4 | Pas de validation téléphone par pays | Formats variables (10-15 digits) |
| 5 | Pas de fiscalité par pays dans wallet | TVA/GST/VAT rates |

---

## 7. SYSTÈME DE MESURE (à implémenter)

### Métriques techniques
- Bundle size par route (vite-plugin-visualizer)
- TypeScript coverage (any count → 0)
- Test coverage (jest --coverage)
- Lighthouse scores (PWA, Performance, Accessibility, SEO)
- Error rate (Sentry)

### Métriques business
- Time to Interactive par page
- API error rate par endpoint
- User session duration
- Conversion funnel par vertical
- Feature adoption (feature flags)

---

## 8. CORRECTIONS APPLIQUÉES DANS CETTE SESSION

| # | Correction | Fichier |
|---|---|---|
| 1 | Build fix: `checkPublishBlockers` → `getPublishBlockers` | `property-workflows.ts` |
| 2 | Build fix: clé dupliquée `patisserie` | `world-class-taxonomy.ts` |
| 3 | TypeScript : 0 erreurs confirmé | Codebase entière |

---

## 9. PRIORITÉS D'ACTION RECOMMANDÉES

### Sprint 1 — Stabilité (bloquants prod)
1. Corriger le secret hardcodé wallet-transfer
2. Supprimer les 214 console.log
3. Migrer les 387 imports supabase directs → db()
4. Restreindre CORS sur Edge Functions
5. Ajouter validation build CI (bloquer si build fail)

### Sprint 2 — Qualité code
1. Remplacer les 274 catch vides par error handling proper
2. Réduire les `any` : top 50 fichiers les plus critiques d'abord
3. Découper les fichiers >800 lignes
4. Finaliser migration V1→V2 des tables
5. Ajouter Zod sur les inputs critiques (formulaires, API)

### Sprint 3 — Tests & Monitoring
1. Tests E2E sur les 5 flows critiques : auth, order, payment, booking, property
2. Tests unitaires sur les engines (menu-engine, property-automation, wallet)
3. Configurer Sentry performance monitoring
4. Ajouter Web Vitals tracking
5. Mettre en place un dashboard de santé technique

### Sprint 4 — Multi-pays & Scale
1. Implémenter les 26 langues manquantes
2. Localisation formats (dates, nombres, devises)
3. Validation téléphone par pays
4. CSP headers
5. Rate limiting côté client
