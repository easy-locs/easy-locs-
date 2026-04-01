# CARD SYSTEM — AUDIT FINAL & PLAN DE FERMETURE

Date: 2026-04-01

---

## BLOC A — RECLASSIFICATION DES 4 PARTIAL

| Card ID | Classification | Justification | Décision |
|---|---|---|---|
| `quick_actions` | `utility_navigation_card` | Raccourcis Wallet/QR/Send — aucune donnée métier, aucun pipeline live, pas de source DB | **HORS périmètre métier audité**. Ne compte pas comme card métier prouvée. Reste dans le registry pour inventaire mais exclue des métriques LIVE. |
| `boost_slot_hero` | `delegated_pipeline_card` | Pipeline réel détenu par `BoostSlotRenderer` qui fetch `boost_campaigns` en interne. L'adapter ne re-expose pas la donnée. | **Délégation acceptée** — propriétaire nommé : `BoostSlotRenderer`. Contrat : query `boost-slot` → renderer interne. Card non comptée LIVE car l'adapter lui-même ne porte pas la donnée. |
| `onboarding_checklist` | `local_only_temporary_card` | État de progression éphémère en session. Pas persisté en DB. Dismissé à la fin de l'onboarding. Aucune synchro cross-surface nécessaire. | **Explicitement local et hors SSOT**. Si un jour la checklist devient donnée produit, il faudra créer une table et un pipeline canonique. Pour l'instant : état local justifié. |
| `driver_positioning` | `on_demand_orchestration_card` | Déclenche une suggestion IA de zone sur tap utilisateur. Ce n'est PAS un flux live continu. Résultat éphémère. | **Action orchestrée on-demand**. Pas de faux stream live. L'adapter retourne un contrat `loading` par défaut, `live` uniquement après tap + réponse IA. |

### Score corrigé
- **18/22 business_data_card LIVE** (prouvées avec sources réelles)
- **4/22 reclassées** : 1 utility, 1 delegated, 1 local_only, 1 on_demand
- **0 zone grise**

---

## BLOC B — MATRICE D'ADOPTION UI RÉELLE

### Vérité brutale : adoption CardShell (domain) = 0%

Aucune surface réelle ne consomme encore `src/domains/cards/CardShell.tsx` ni les adapter hooks.

| Surface | Composant visible | Card ID mapping | Adapter utilisé ? | CardShell (domain) ? | Source actuelle |
|---|---|---|---|---|---|
| **Home** | `SmartHome.tsx` | hero_banner, quick_actions, category_grid, context_banners, boost_slot_hero, live_map, trending, best_rated, newest, near_you, onboarding_checklist, smart_recommendations | ❌ Non | ❌ Non | `useDashboardViewModel()` direct |
| **Driver** | `DriverDashboard.tsx` | driver_status, driver_positioning, driver_earnings | ❌ Non | ❌ Non | `useDriverMissions()` + `supabase` direct (`rider_presence`) |
| **Driver v2** | `DriverDashboardPage.tsx` | driver_status | ❌ Non | ❌ Non | `useDriverLive()` + `dashboard.read-model` |
| **Seller** | `SellerDashboard.tsx` | seller_businesses, seller_listing_lifecycle | ❌ Non | ❌ Non | `supabase` direct (`marketplace_services`, `storefront_pages`) |
| **Admin Ops** | `AdminOpsDashboardPage.tsx` | ops_metrics | ❌ Non | ❌ Non | `admin-ops.repository` → `dashboard.read-model` |
| **Admin Super** | `AdminSuperDashboardPage.tsx` | super_metrics | ❌ Non | ❌ Non | `admin-ops.repository` → `dashboard.read-model` |
| **Global** | Various | wallet_balance, orbit_recent_chats, notifications_badge | ❌ Non | ❌ Non | Direct store reads / scattered components |

### Seul usage de CardShell (components/)
- `UniverseCard.tsx` → utilise l'ancien `CardShell` de `src/components/cards/CardShell.tsx` (wrapper visuel, pas le domain contract shell)

### Conclusion adoption UI
> **Les 22 adapters existent et sont fonctionnels mais aucun n'est consommé par les surfaces réelles.**
> Le système card domain est une infrastructure prête à brancher, pas encore déployée.

---

## BLOC C — COMPOSANTS VISIBLES HORS PIPELINE CANONIQUE

### Surfaces majeures avec fetch direct Supabase (236 fichiers au total)

| Composant | Surface | Fetch direct ? | Store direct ? | Local state métier ? | Duplication card ? | Action recommandée |
|---|---|---|---|---|---|---|
| `SellerDashboard.tsx` | seller | ✅ `supabase` direct | ❌ | ✅ `useState` | ⚠️ Duplique seller_businesses | Migrer vers repository + adapter |
| `DriverDashboard.tsx` | driver | ✅ `supabase` direct (`rider_presence`) | ❌ | ✅ | ⚠️ Duplique driver_status | Migrer vers `useDriverLive` |
| `GiftCardManager.tsx` | storefront | ✅ Via repository (corrigé) | ❌ | ✅ | ❌ | ✅ Déjà migré |
| `WarehouseManager.tsx` | storefront | ✅ `supabase` direct | ❌ | ✅ | ❌ Non-card | Migrer vers repository |
| `MerchantCRM.tsx` | storefront | ✅ `supabase` direct | ❌ | ✅ | ❌ Non-card | Migrer vers repository |
| `GrowthDashboard.tsx` | storefront | ✅ `supabase` direct | ❌ | ❌ | ❌ Non-card | Migrer vers repository |
| `LaunchAudit.tsx` | storefront | ✅ `supabase` direct | ❌ | ✅ | ❌ Non-card | Migrer vers repository |
| `NotificationPreferences.tsx` | settings | ✅ `supabase` direct | ❌ | ✅ | ❌ Non-card | Acceptable (settings page) |
| `DriverWalletPanel.tsx` | driver | ✅ `supabase` direct | ❌ | ✅ | ⚠️ Duplique wallet | Migrer vers wallet store |
| `AdminEngineCockpit.tsx` | admin | ✅ `supabase` direct | ❌ | ✅ | ❌ Non-card | Acceptable (debug tool) |

### Classification des 236 fichiers avec fetch direct

| Catégorie | Count | Verdict |
|---|---|---|
| Pages (orchestrateurs de domaine) | ~80 | **Autorisé** selon gouvernance repository-layer |
| Components domain (seller/storefront/delivery) | ~40 | **À migrer** vers repositories |
| Components UI pur qui fetch | ~15 | **Violation** — à corriger |
| Admin/debug tools | ~20 | **Toléré** |
| Auth/settings/legal | ~10 | **Acceptable** |
| Hooks/services/repositories | ~70 | **Correct** (c'est leur rôle) |

---

## BLOC D — CARTE SSOT PAR DOMAINE

| Domaine | Source canonique | Selectors autorisés | Lectures divergentes | Mutations canoniques | Statut SSOT |
|---|---|---|---|---|---|
| **auth** | `AuthContext` + `useAuth()` | `useAuth()` | ❌ Aucune | `supabase.auth.*` | ✅ **clean** |
| **wallet** | `useWalletStore` | `useWalletStore(s => s.wallet)` | ⚠️ `DriverWalletPanel` fetch direct | `walletStore.setWallet()` | ⚠️ **partial** |
| **orbit** | `orbitStore` + `useOrbitStore` | `useOrbitStore(s => s.*)` | ❌ Propre | Pipelines orbit | ✅ **clean** |
| **marketplace** | `useDashboardViewModel` + queries | `useDashboardViewModel()` | ⚠️ `SellerDashboard` fetch direct | Dispersées | ⚠️ **partial** |
| **onboarding** | Local state | N/A | N/A | N/A | ✅ **clean** (explicitement local) |
| **analytics** | `admin-ops.repository` → read-model | `projectOpsDashboard()` | ❌ Propre | N/A (read-only) | ✅ **clean** |
| **delivery** | `useDriverMissions` + `useDriverLive` | Hook direct | ⚠️ `DriverDashboard.tsx` fetch `rider_presence` direct | `acceptMission()`, `updateStatus()` | ⚠️ **partial** |
| **notifications** | `notificationStore` | `useNotificationStore(s => s.unreadCount)` | ❌ Propre | Store actions | ✅ **clean** |
| **geo/radar** | ⚠️ 3 stores concurrents : `superMapStore`, `smartMapStore`, `locationStore` | Conflictuels | ⚠️ Duplication critique | Dispersées | ❌ **broken** |
| **boost** | `BoostSlotRenderer` interne | N/A (delegated) | ❌ | N/A | ✅ **clean** (delegated) |
| **support** | Queries directes | N/A | Pages autonomes | N/A | ✅ **acceptable** |

### Problèmes SSOT critiques

1. **geo/radar** : 3 stores concurrents (`superMapStore`, `smartMapStore`, `locationStore`) — **à fusionner**
2. **marketplace seller** : `SellerDashboard` bypass le pipeline avec fetch direct — **à migrer**
3. **delivery driver** : `DriverDashboard.tsx` fetch `rider_presence` en direct au lieu d'utiliser `useDriverLive` — **à corriger**
4. **wallet** : `DriverWalletPanel` fetch en direct — **à migrer vers wallet store**

---

## BLOC E — PLAN FINAL DE FERMETURE

### PHASE 1 — Clarification périmètre (✅ FAIT)
- [x] 4 PARTIAL reclassées sans zone grise
- [x] utility vs métier vs non-card séparés
- [x] Score : 18 business LIVE + 4 reclassées

### PHASE 2 — Adoption UI réelle (PRIORITÉ 1)
**Objectif** : brancher au moins les surfaces principales aux adapters existants

| Action | Composants touchés | Risque | Critère de validation |
|---|---|---|---|
| SmartHome consomme les adapter hooks | `SmartHome.tsx` | Moyen — refactor majeur | Cards rendues via `CardShell` domain |
| DriverDashboardPage consomme driver adapters | `DriverDashboardPage.tsx` | Faible | Driver cards via adapters |
| SellerDashboard consomme seller adapters | `SellerDashboard.tsx` | Moyen | Suppression fetch direct |
| Admin pages consomment admin adapters | `AdminOps/SuperDashboardPage.tsx` | Faible | Metrics via adapters |

### PHASE 3 — Nettoyage hors système (PRIORITÉ 2)
**Objectif** : éliminer les fetch directs dans les 15 composants UI purs identifiés

| Action | Risque | Critère |
|---|---|---|
| Extraire les fetches de `SellerDashboard` → repository | Faible | 0 import supabase dans le composant |
| Extraire `DriverWalletPanel` → wallet store | Faible | Lecture wallet via store |
| Extraire `WarehouseManager` / `MerchantCRM` → repositories | Faible | 0 fetch direct |

### PHASE 4 — SSOT finale (PRIORITÉ 3)
**Objectif** : 1 source de vérité par domaine

| Action | Risque | Critère |
|---|---|---|
| Fusionner `superMapStore` + `smartMapStore` → 1 store géo | **Élevé** — impact map | 1 seul store géo |
| Supprimer fetch `rider_presence` direct dans DriverDashboard | Faible | Via `useDriverLive` |
| Supprimer queries dupliquées seller | Faible | 1 query key par donnée |

### PHASE 5 — Preuve runtime finale (PRIORITÉ 4)
**Objectif** : tests d'intégration cross-surface

| Card | Scénario | Critère |
|---|---|---|
| wallet_balance | Wallet change → card update immédiat | Réactivité prouvée |
| notifications_badge | unreadCount change → badge update | Réactivité prouvée |
| driver_status | Toggle online/offline → état card | Mutation + refresh |
| seller_businesses | Création business → liste update | Query invalidation |
| ops_metrics | Changement alertes → refresh | Cohérence |

---

## RÉSUMÉ HONNÊTE

| Dimension | État | Score |
|---|---|---|
| **Registry & contrat** | ✅ Complet | 22/22 classées |
| **Adapters fonctionnels** | ✅ Existent | 22/22 hooks créés |
| **Sources réelles branchées** | ✅ Prouvé | 18/22 business LIVE |
| **Classification PARTIAL** | ✅ Propre | 4/4 reclassées sans zone grise |
| **Adoption UI réelle** | ❌ 0% | 0/22 consommées par les surfaces |
| **CardShell domain déployé** | ❌ 0% | Aucune surface ne l'utilise |
| **SSOT domaine** | ⚠️ Partiel | 7/11 clean, 3 partial, 1 broken |
| **Composants hors pipeline** | ⚠️ ~15 violations UI | À migrer vers repositories |

### En une ligne
> **Infrastructure card : 100% prête. Déploiement produit réel : 0%. Le chantier suivant est l'adoption UI.**
