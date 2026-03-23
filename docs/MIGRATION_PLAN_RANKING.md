# Ranking Engine Migration Plan
## Progressive, Screen-by-Screen

---

## Current State (3 systems → 2 after cleanup)

| System | File | Status | Used By |
|--------|------|--------|---------|
| ~~score-engine.ts~~ | `src/lib/ranking/score-engine.ts` | **DELETED** (dead code) | None |
| sortRadarPoints | `src/lib/radar/geo.ts` | **ACTIVE** | radarStore.ts → RadarResultsList, RadarPage, VerticalHubPage |
| ranking-engine.ts | `src/lib/ranking-engine.ts` | **ACTIVE** | SponsoredBanner (via `isActiveBoosted`) |

## Target State

All screens use `ranking-engine.ts` via the unified `rankEntities()` + `scoreEntity()` API.
`sortRadarPoints` is retired after all consumers migrate.

---

## Migration Order (safest first)

### Phase 1 — Already Done ✅
- [x] Unified ranking-engine.ts created with backward-compat wrappers
- [x] Dead score-engine.ts removed
- [x] Entity adapter with 4 canonical layers (Identity, Geo, Taxonomy, Capability)
- [x] Entities table extended with geography + capability columns

### Phase 2 — RadarStore (highest impact, most critical)
**File:** `src/stores/radarStore.ts`
**Current:** Uses `sortRadarPoints()` from `geo.ts`
**Migration:**
1. Create `sortRadarPointsV2()` wrapper in `geo.ts` that internally calls `rankEntities()`
2. Add feature flag `USE_UNIFIED_RANKING` (default: false)
3. In `refreshFiltered()`, branch on flag
4. Test both paths on /radar with same data
5. Once verified, flip flag to true
6. Remove old `sortRadarPoints` after 1 week

**Verification:**
- Compare sorted output of both engines on same 50 points
- Check that category filtering still works
- Check that subcategory hierarchy priority is preserved
- Visual QA on /radar list view

### Phase 3 — Map Pins (mapEngine.ts)
**File:** `src/lib/map/mapEngine.ts`
**Current:** Own haversine + sort by distance only
**Migration:**
1. Add optional `rankEntities()` call after distance filtering
2. Map pins don't need full ranking (just distance), so this is low priority
3. Only migrate when map needs hierarchy-aware ordering

### Phase 4 — VerticalHubPage
**File:** `src/components/discovery/VerticalHubPage.tsx`
**Current:** Uses radarStore (already migrated in Phase 2)
**Migration:** Automatic once radarStore migrates

### Phase 5 — Search Results
**File:** `src/components/search/ListingSearchResults.tsx`
**Current:** No ranking, shows raw order
**Migration:**
1. Import `rankEntities` with `SEARCH_WEIGHTS`
2. Score results before rendering
3. This is safe since search has no existing ranking to break

### Phase 6 — CuisineListPage
**File:** `src/pages/food/CuisineListPage.tsx`
**Current:** Orders by DB default (no client ranking)
**Migration:**
1. After fetch, pass through `rankEntities()` with `DISCOVERY_WEIGHTS`
2. Set `targetSubcategory` from cuisine param

### Phase 7 — Future Commercial Views
**When:** Offer/subscription/pass screens are built
**How:** Use `COMMERCIAL_WEIGHTS` profile with `rankEntities()`
**No current screens to migrate**

---

## Verification Protocol (per phase)

1. **Data parity test:** Score 20 entities with both old and new, compare order
2. **Visual QA:** Screenshot before/after on affected screen
3. **Console check:** No new errors/warnings
4. **Performance:** Ranking must complete < 5ms for 300 items
5. **Rollback:** Feature flag reverts to old path instantly

---

## Dead Code Cleanup Schedule

| Code | Remove After |
|------|-------------|
| `sortRadarPoints` | Phase 2 verified (1 week) |
| `smartScore` function | Phase 2 verified |
| `haversineKm` in geo.ts | Keep (still useful as utility) |
| Legacy `scoreItem`/`rankItems` in ranking-engine.ts | Phase 5 verified |

---

## Architecture After Full Migration

```
Entity Adapter (4 layers)
  → toRankable()
    → ranking-engine.ts (computeSignals → weightedScore)
      → DISCOVERY_WEIGHTS (radar, map, hubs)
      → SEARCH_WEIGHTS (search)
      → COMMERCIAL_WEIGHTS (future offers/passes)
```

All ranking flows through ONE engine. No parallel systems.
