# GEO STORE FUSION PLAN — 3 stores → 1 SSOT

## Current State (BROKEN)

3 overlapping stores manage geo/map/search state:

| Store | Responsibility | Users |
|---|---|---|
| `locationStore` | GPS position, permissions, saved places, pickup/dropoff, map viewport | 35 files — heavily used |
| `superMapStore` | Map mode, entities, mobility points, zones, heatmap, layers | SuperMap page, map overlays |
| `smartMapStore` | Search viewport, search state, bottom sheet, result selection | SuperMap smart search |

### Overlap analysis

| Concern | locationStore | superMapStore | smartMapStore |
|---|---|---|---|
| User GPS lat/lng | ✅ `currentLocation` | ✅ `userLat/userLng` | ✅ `userLat/userLng` |
| Map center | ✅ `mapCenter` | ✅ `centerLat/centerLng` | ✅ `viewport.centerLat/centerLng` |
| Map zoom | ✅ `mapZoom` | ✅ `zoom` | ✅ `viewport.zoom` |
| Map mode | ❌ | ✅ `mode` | ✅ `viewport.mode` |
| Search | ❌ | ❌ | ✅ `search.*` |
| Layers | ❌ | ✅ `showHeatmap/showMobility/showRadius` | ❌ |
| Entities | ❌ | ✅ `entities/mobilityPoints/zones` | ❌ (results separate) |
| Selection | ❌ | ✅ `selectedEntityId` | ✅ `selectedResultId` |
| Bottom sheet | ❌ | ❌ | ✅ `sheetSnap` |
| Saved places | ✅ | ❌ | ❌ |
| Pickup/dropoff | ✅ | ❌ | ❌ |

## Target Architecture

### Keep: `locationStore` (GPS + Places)
**Reason**: 35 files depend on it. It is the canonical GPS source, synced from geoStore.
Stays as-is. Rename nothing.

Owns:
- GPS position (synced from geoStore)
- Permission state
- Saved/recent places
- Pickup/dropoff for mobility
- Search radius

**Remove from it**: `mapCenter` and `mapZoom` (move to unified map store)

### Merge: `superMapStore` + `smartMapStore` → `useMapStore`

New unified store owns:
- Map viewport (center, zoom, mode, bounds)
- Map layers (weather, radar, heatmap, mobility, POI)
- Map entities (GeoEntity[], mobility points, zones)
- Map selection (selectedEntityId)
- Map search (query, intent, results, status)
- Bottom sheet state
- Search bar focus

### Bridge: `useMapStore` reads GPS from `locationStore`

```ts
// useMapStore reads user location from locationStore reactively
const userLoc = useLocationStore(s => s.currentLocation);
```

No duplication of user GPS in map store.

## Migration Steps

### Step 1 — Create `src/stores/mapStore.ts`
Merge all state from `superMapStore` + `smartMapStore` into single store.
User GPS: read from `locationStore`, never duplicate.

### Step 2 — Update consumers
- `SuperMapPage.tsx` → import from `useMapStore`
- `SmartSearchBar.tsx` → import from `useMapStore`
- `SmartBottomSheet.tsx` → import from `useMapStore`
- `WeatherHUD.tsx` → import from `useMapStore`
- All map hooks → import from `useMapStore`

### Step 3 — Remove old stores
- Delete `src/stores/superMapStore.ts`
- Delete `src/stores/smartMapStore.ts`

### Step 4 — Clean locationStore
- Remove `mapCenter` and `mapZoom` (now in mapStore)
- Keep everything else (GPS, places, pickup/dropoff)

### Step 5 — Update domain registry
- Update `universal-root-formula.ts` map domain entries

## Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Breaking 35 locationStore consumers | Low | locationStore stays, only mapCenter/mapZoom removed |
| SuperMapPage regression | Medium | Single page, easy to test |
| SmartSearch regression | Low | Already points to smartMapStore |
| Stale GPS in map | Low | Bridge via subscription |

## Validation Criteria

- [ ] 1 single store for all map state
- [ ] 0 duplicate user GPS
- [ ] 0 duplicate map center/zoom
- [ ] locationStore intact for GPS + places
- [ ] SuperMapPage functional
- [ ] Search functional
- [ ] No TS errors
