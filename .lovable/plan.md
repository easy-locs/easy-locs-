

## Plan: UX/UI Harmonization & Error Fixes

### Issues Identified

**A. Text Truncation Issues (violates premium UX standards)**

1. `OrbitSmartActions.tsx:139` — action descriptions use `truncate`, cutting off text
2. `OrbitHome.tsx:121` — alert message banner uses `truncate`
3. `OrbitQuickCard.tsx:99` — description uses `line-clamp-1`, can cut useful info
4. `OrbitRadar.tsx:445` — entity subtitle in list view uses `truncate`
5. `OrbitRadar.tsx:487` — entity title in preview card uses `truncate`

**B. Fake Geo Positioning (breaks Living Ecosystem integrity)**

6. `useEcosystemRadar.ts:222-230` — properties with no lat/lng get random offset from user position (`Math.random() * 0.01`)
7. `useEcosystemRadar.ts:253-254` — same issue for booking tasks

**C. Type Safety (`as any` cleanup for `live_trackings` table)**

8. `useLiveTracking.ts` — 7 instances of `as any` on insert/update/select calls
9. These are expected until types regenerate but should use proper typing where possible

**D. Minor UX Inconsistencies**

10. `OrbitOrb.tsx:68` — message area has no max-width, can stretch across wide screens
11. `OrbitHome.tsx:231` — Infrastructure grid uses `grid-cols-3` with `gap-2.5`, inconsistent with other sections using `gap-2`
12. `OrbitWalletCard.tsx:98` — Quick actions row can overflow on narrow screens (5 buttons)

### Implementation Plan

#### 1. Fix text truncation → use `line-clamp-2` or full wrap
- Replace `truncate` with `line-clamp-2` in SmartActions descriptions, alert messages, and entity subtitles
- Keep `truncate` only for single-line titles where it's semantically appropriate (names)

#### 2. Fix fake geo positioning
- Skip entities without real coordinates instead of placing them at random offsets
- Add a `no_geo` flag to entities that have no real position, render them in list view only (not on map)

#### 3. Reduce `as any` in useLiveTracking
- Create a `LiveTrackingInsert` and `LiveTrackingUpdate` local type interface to replace raw `as any` casts
- Keep the `as any` only on `.in("status", [...])` which is a Supabase SDK limitation

#### 4. Minor UX polish
- Add `max-w-[280px]` to OrbitOrb message area
- Normalize all OrbitHome grid gaps to `gap-2`
- Make WalletCard quick actions scrollable horizontally on small screens
- Ensure OrbitRadar category pills have proper spacing on 402px viewport

#### Files Modified
- `src/components/orbit/OrbitSmartActions.tsx` — remove truncate on descriptions
- `src/components/orbit/OrbitQuickCard.tsx` — improve description rendering
- `src/components/orbit/OrbitOrb.tsx` — constrain message width
- `src/components/orbit/OrbitRadar.tsx` — fix truncation in list/preview
- `src/pages/OrbitHome.tsx` — normalize grid gaps, fix alert truncation
- `src/components/orbit/OrbitWalletCard.tsx` — scrollable actions row
- `src/hooks/useEcosystemRadar.ts` — remove fake geo offsets, skip no-geo entities on map
- `src/hooks/useLiveTracking.ts` — typed inserts/updates to reduce `as any`

