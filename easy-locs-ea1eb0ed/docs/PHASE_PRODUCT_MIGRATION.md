# PHASE PRODUIT — MIGRATION UI RÉELLE

## Ordre strict : SmartHome → DriverDashboard → SellerDashboard → Admin → Geo Fusion

---

## A. PLAN SmartHome — Migration progressive

### État actuel
- Composant : `src/components/storefront/SmartHome.tsx` (357 lignes)
- Source : `useDashboardViewModel()` — déjà un ViewModel canonique ✅
- CardShell utilisé : ❌ (rendu inline avec `<div>` + classes manuelles)
- Fetch directs : ❌ aucun (tout passe par le ViewModel)
- Problème : les sections (trending, bestRated, nearYou, newest) rendent des items avec du markup inline au lieu de `UniverseCard` / `CardShell`

### Stratégie : wrapper progressif, pas de réécriture
Le ViewModel est déjà propre. La migration consiste uniquement à remplacer les rendus inline par des `CardShell` / `UniverseCard`.

### Étapes

| # | Action | Fichiers | Risque |
|---|--------|----------|--------|
| 1 | Remplacer les items des 4 sections (trending/bestRated/nearYou/newest) par `UniverseCard` | SmartHome.tsx | Bas — même data, nouveau shell |
| 2 | Wrapper le hero banner dans `CardShell` domain (status live/loading) | SmartHome.tsx | Bas — cosmétique |
| 3 | Wrapper quick_actions dans composant dédié `QuickActionsGrid` | SmartHome.tsx + nouveau fichier | Bas — extraction pure |
| 4 | Connecter `NotificationBell` au card adapter `notifications_badge` | NotificationBell.tsx | Bas — adapter existe déjà |

### Ce qui NE change PAS
- `useDashboardViewModel` reste la source unique
- Aucun nouveau fetch
- Aucun nouveau store
- Le ViewModel alimente les CardShell via props

### Validation
- [ ] Sections trending/bestRated/nearYou/newest rendent via UniverseCard
- [ ] Hero banner a un état loading/live visible
- [ ] Quick actions extraites dans composant propre
- [ ] Aucune régression visuelle

---

## B. PLAN DriverDashboard — Correction pipeline

### État actuel
- Composant : `src/pages/driver/DriverDashboardPage.tsx` (115 lignes)
- Source : `useDriverLive()` → `projectDriverDashboard()` ✅ pipeline canonique
- Fetch directs : ❌ aucun (corrigé précédemment)
- CardShell utilisé : ❌ (rendu inline `<div className="rounded-2xl...">`)
- Problème : 4 blocs visuels (status, profile, actions, earnings) sont des `<div>` inline sans lifecycle management

### Stratégie : wrapper les 4 blocs dans CardShell domain

### Étapes

| # | Action | Fichiers | Risque |
|---|--------|----------|--------|
| 1 | Extraire `DriverStatusCard` — consomme `model.isOnline/isAvailable` via CardShell | nouveau composant | Bas |
| 2 | Extraire `DriverProfileCard` — consomme `model.currentStatus` via CardShell | nouveau composant | Bas |
| 3 | Extraire `DriverEarningsCard` — placeholder avec état empty | nouveau composant | Bas |
| 4 | Quick actions restent inline (utility_navigation, hors périmètre card) | aucun changement | Nul |

### Ce qui NE change PAS
- `useDriverLive()` reste la source
- `projectDriverDashboard()` reste le read-model
- `toggleDriverOnline/toggleDriverAvailability` restent les mutations

### Validation
- [ ] Toggle online → état card change immédiatement
- [ ] Toggle availability → état card change immédiatement
- [ ] État loading visible pendant fetch initial
- [ ] Earnings montre état "empty" propre (pas de texte brut)

---

## C. PLAN SellerDashboard — Extraction fetch directs

### État actuel
- Composant : `src/components/seller/SellerDashboard.tsx` (187 lignes)
- Source : **2 fetch directs Supabase** ❌
  - `marketplace_services` (ligne 30)
  - `storefront_pages` (ligne 45)
- CardShell utilisé : ❌
- Problème : violation architecturale — composant UI fait des queries DB directes

### Stratégie : extraire les queries dans un repository, créer un ViewModel

### Étapes

| # | Action | Fichiers | Risque |
|---|--------|----------|--------|
| 1 | Créer `src/repositories/seller-repository.ts` avec `fetchSellerServices()` et `fetchSellerShops()` | nouveau fichier | Bas |
| 2 | Créer `src/families/seller/seller.view-model.ts` avec `useSellerViewModel()` | nouveau fichier | Bas |
| 3 | Migrer SellerDashboard pour consommer le ViewModel au lieu de fetch directs | SellerDashboard.tsx | Moyen — tester les queries |
| 4 | Wrapper les cards business dans `CardShell` avec lifecycle | SellerDashboard.tsx | Bas |

### Queries à extraire

```ts
// seller-repository.ts
export async function fetchSellerServices(orgId: string) { ... }
export async function fetchSellerShops(userId: string) { ... }
```

### Ce qui NE change PAS
- Le rendu visuel des SellerBusinessCard / SellerListingLifecycleCard
- La logique createOnboardingDraft
- resolveBusinessStatus / validateBusinessReadiness

### Validation
- [ ] 0 import de supabase/client dans SellerDashboard.tsx
- [ ] Services et shops chargent correctement
- [ ] État loading/empty/error visible via CardShell
- [ ] Création de business fonctionne toujours

---

## D. PLAN Fusion 3 stores geo → 1 SSOT

### État actuel — 3 stores concurrents

| Store | Fichier | Responsabilité | Consommateurs |
|-------|---------|----------------|---------------|
| `locationStore` | stores/locationStore.ts | GPS, permissions, places, pickup/dropoff, mapCenter, mapZoom | ~35 fichiers |
| `superMapStore` | stores/superMapStore.ts | Map mode, entities, mobility, zones, layers, userLat/Lng, center, zoom | ~15 fichiers (SuperMap) |
| `smartMapStore` | stores/smartMapStore.ts | Search viewport, search state, bottom sheet, selection | ~5 fichiers (SmartSearch) |

### Duplications identifiées

| Donnée | locationStore | superMapStore | smartMapStore |
|--------|--------------|---------------|---------------|
| User GPS | `currentLocation` | `userLat/userLng` | `userLat/userLng` |
| Map center | `mapCenter` | `centerLat/centerLng` | `viewport.centerLat/centerLng` |
| Map zoom | `mapZoom` | `zoom` | `viewport.zoom` |

### Architecture cible

```
┌──────────────────────────────────────────────┐
│              locationStore (KEEP)             │
│  GPS · permissions · saved places · pickup   │
│  REMOVE: mapCenter, mapZoom                  │
└────────────────┬─────────────────────────────┘
                 │ reads GPS reactively
┌────────────────▼─────────────────────────────┐
│          useMapStore (NEW — MERGE)            │
│  viewport (center, zoom, mode, bounds)       │
│  layers (heatmap, mobility, radius, weather) │
│  entities (GeoEntity[], mobility, zones)     │
│  search (query, intent, results, status)     │
│  selection (selectedEntityId)                │
│  bottom sheet (sheetSnap)                    │
│  search bar focus                            │
└──────────────────────────────────────────────┘
```

### Étapes

| # | Action | Risque |
|---|--------|--------|
| 1 | Créer `src/stores/mapStore.ts` (nouveau) avec tous les champs fusionnés de superMapStore + smartMapStore | Bas |
| 2 | Ajouter bridge GPS : `useMapStore` lit `locationStore.currentLocation` via subscription | Bas |
| 3 | Migrer `SuperMapPage.tsx` — remplacer les 2 imports par `useMapStore` | Moyen |
| 4 | Migrer `SmartBottomSheet.tsx`, `SmartSearchBar.tsx` → `useMapStore` | Moyen |
| 5 | Migrer hooks map (`useMapDataSync`, `useMapCamera`, `useMapWeather`) → `useMapStore` | Moyen |
| 6 | Migrer `map-dispatch.ts` → `useMapStore` | Bas |
| 7 | Migrer `domains/map/selectors.ts` → `useMapStore` | Bas |
| 8 | Retirer `mapCenter`/`mapZoom` de `locationStore` | Moyen — vérifier 35 consommateurs |
| 9 | Supprimer `superMapStore.ts` et `smartMapStore.ts` | Final |

### Fichiers impactés (exhaustif)

Consommateurs `superMapStore` (15 fichiers) :
- SuperMapPage, SuperMapModeBar, MapControls, MapEngine
- useMapDataSync, useMapCamera, useMapWeather
- map-dispatch, domains/map/selectors
- WeatherHUD, MapEntityPanel, etc.

Consommateurs `smartMapStore` (5 fichiers) :
- SuperMapPage, SmartSearchBar, SmartBottomSheet
- useSmartMapSearch hook

Consommateurs `locationStore.mapCenter/mapZoom` : à auditer au step 8

### Validation
- [ ] SuperMapPage fonctionne identiquement avec useMapStore
- [ ] Search fonctionne (query → results → map center)
- [ ] Bottom sheet sync avec sélection
- [ ] GPS ne dupliqué dans aucun store
- [ ] 0 import de superMapStore ou smartMapStore dans le codebase
- [ ] map-dispatch pointe vers useMapStore

---

## E. CRITÈRES DE VALIDATION PAR SURFACE

### SmartHome
| Critère | Type | Méthode |
|---------|------|---------|
| Sections rendent via UniverseCard | Visuel | Screenshot |
| Hero a état loading → live | Runtime | Navigation lente simulée |
| ViewModel reste seule source | Code | Grep : 0 fetch direct |
| Aucune régression catégories | Visuel | Comparer avant/après |

### DriverDashboard
| Critère | Type | Méthode |
|---------|------|---------|
| Toggle online → UI change | Runtime | Click + vérifier |
| Toggle available → UI change | Runtime | Click + vérifier |
| Loading state visible | Runtime | Throttle réseau |
| 0 fetch direct supabase | Code | Grep import |
| Earnings montre état empty propre | Visuel | Screenshot |

### SellerDashboard
| Critère | Type | Méthode |
|---------|------|---------|
| 0 import supabase/client | Code | Grep |
| Services chargent correctement | Runtime | Navigation page |
| Shops chargent correctement | Runtime | Navigation page |
| Création business fonctionne | Runtime | Click + vérifier |
| Loading/empty/error via CardShell | Visuel | Screenshot |

### Geo Fusion
| Critère | Type | Méthode |
|---------|------|---------|
| 0 import superMapStore | Code | Grep |
| 0 import smartMapStore | Code | Grep |
| SuperMap page fonctionnelle | Runtime | Navigation + interactions |
| Search → center map | Runtime | Taper query |
| GPS unique dans locationStore | Code | Audit stores |
| Bottom sheet sync | Runtime | Tap marker → sheet ouvre |

---

## PRIORITÉS ET SÉQUENÇAGE

```
Semaine 1: SmartHome (UniverseCard wrappers) + DriverDashboard (CardShell extraction)
Semaine 2: SellerDashboard (repository extraction) + Admin metrics (si temps)
Semaine 3: Geo fusion (stores merge) — plus risqué, fait en dernier
```

### Règle de progression
- Chaque surface migrée = PR isolée testable
- Aucune migration suivante ne commence avant validation de la précédente
- Rollback possible à chaque étape (wrappers autour de l'existant)
