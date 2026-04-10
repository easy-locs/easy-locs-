# Easy-Locs Super App

## Overview
Easy-Locs is a worldwide super-app (190+ countries, 120+ currencies, 31 languages) built with React + Vite + TypeScript + Supabase. Five main pillars: Dashboard, Radar, Orbit, Wallet, Me. Taxonomy: 14 primary categories, 268 subcategories.

## Architecture
- **Stack**: React 18, Vite, TypeScript, TailwindCSS, Supabase, Framer Motion, Tanstack Query, Zustand
- **Design**: Navy `hsl(220 40% 18%)` / Gold `hsl(38 65% 56%)` — always inline `style={{}}` for brand colors
- **Typography**: Min `text-[10px]`, `font-size: 16px` on inputs
- **Bottom nav**: 72px height, hidden on `/login`, `/signup`, `/orbit`, `/checkout`, `/pay/`, `/order/`
- **DB Access**: ALL database calls MUST use `db(table)` from `src/services/db.ts`

## Component Library (src/components/ui/)
69 unified UI components. Key canonical components:
- **Button** (`button.tsx`): 8 variants (default/destructive/outline/secondary/ghost/link/premium/success), `loading` prop
- **Card** (`card.tsx`): shadcn base with CSS vars (`--card-radius`, `--card-padding`)
- **AppCard** (`AppCard.tsx`): App-level card with 5 variants (base/interactive/settings/elevated/kpi), status/glow/loading
- **StatCard** (`stat-card.tsx`): KPI display with animated counters, loading skeleton
- **SmartActionCard**: Navigation card with icon, label, counter badge
- **BackCard** (`back-card.tsx`): Smart back navigation (29 imports)
- **UniverseCard** (`cards/UniverseCard.tsx`): Entity display card — vertical (carousel) and horizontal (list) layouts
- **EmptyState** (`empty-state.tsx`): Canonical empty state with icon, title, desc, action, animation
- **ErrorState** (`error-state.tsx`): Error state with i18n, retry
- **LoadingState** (`LoadingState.tsx`): Skeleton variants (cards/list/page/inline)
- **Skeleton** (`skeleton.tsx`): Base pulse skeleton + SkeletonText/SkeletonCard/SkeletonList/SkeletonAvatar
- **PageShell** (`page-shell.tsx`): Page wrapper with loading/error/empty states built in
- **SectionHeader** (`section-header.tsx`): Section heading with seeAll link, icon, compact mode
- **ResponsiveGrid** (`responsive-grid.tsx`): Auto-fit grid with variant/cols/minChildWidth
- **MobilePageHeader** (`mobile-page-header.tsx`): Sticky header with back nav (21 imports)
- **OptimizedImage**: Lazy loading, srcset, fade-in, Supabase transforms
- **AppActionButton**: Action button for payment/checkout flows

## Payment Flows (Phone-Contact-Based)
- **Identity**: Phone number = root identity, OTP required, user_id = internal stable ID
- **Send Money** (`/wallet/transfer`): Contact picker (no email/ID input), resolves via `peer_user_id`
- **Request Money** (`/wallet/request`): Contact picker (no email/ID input), resolves via `peer_user_id`
- **Contact Picker**: `ContactPickerSheet` in `src/components/wallet/ContactPickerSheet.tsx`
  - Shows "On Easy Locs" contacts (with green badge) and "Phone Contacts" (with invite)
  - `InviteContactSheet` for non-users with share/invite flow
- **Resolution**: `resolvePayTarget` supports userId, orbitId, phone, walletId (email kept for backward compat but removed from UI)
- **RULE**: No email input, no ID input, no manual entry in payment flows. Contact → Action → Payment.

## Shop Onboarding System
Professional 8-step onboarding flow for merchants (`/merchant/onboarding`):
1. Welcome (vertical + subcategory selection)
2. Business Details (name, manager, phone, email, WhatsApp, description, tagline)
3. Legal & Location (legal name, registration/tax numbers, address, city, country, geolocation)
4. Media (logo URL, cover photo URL, gallery)
5. Catalog (vertical-specific: menu/rooms/services)
6. Schedule (food: opening hours per day, hotel: check-in/out + amenities, services: work days/hours)
7. Payment (wallet or bank/IBAN)
8. Go Live (completeness score, activation)

Key backend files:
- `src/lib/onboarding/merchant-onboarding.ts`: ActivationPayload (nested ShopContactInfo, ShopLegalInfo, ShopLocationInfo, ShopMediaInfo, ShopBusinessInfo), validation (phone/email/tax/coordinates), completeness scoring, legacy payload normalization
- `src/data/onboarding-templates.ts`: VERTICAL_CONFIG (food/hotel/services step configs), menu/room/service templates
- `src/pages/MerchantOnboardingPage.tsx`: Multi-step wizard with field validation and error display

Storefront data flows into `storefront_pages` table with full profile: identity, contact, legal (in metadata_json), location with coordinates, media URLs, opening hours, provenance tracking, and completeness score.

## Quality Engines System (22 engines)
- **Location**: `src/engines/quality/` — Tier 3, lazy-loaded 12s after boot
- **Dashboard**: `/admin/quality-engines` — real-time scores, findings, grade
- **Engines**:
  1. **TaxonomyEngine** — analyzes real CATEGORY_TREE: duplicate subcategories, missing tags, alias conflicts, orphan clusters
  2. **CanonicalMappingEngine** — verifies source of truth: route uniqueness, wallet/orbit integration, capability/architecture alignment
  3. **ProfileQualityEngine** — scans storefront_pages DB: missing photos, contacts, categories, completeness scores
  4. **AddressEngine** — validates addresses: missing coordinates, null island, incomplete city/country
  5. **ModuleLinkEngine** — verifies cross-pillar wiring: Dashboard↔Radar↔Orbit↔Wallet↔Me end-to-end
  6. **RoutingQualityEngine** — detects dead routes, duplicate routes, orphan pages
  7. **UIPolishEngine** — detects overflow, tiny text, missing alt, card height inconsistency
  8. **DataCleaningEngine** — finds null names, null categories, missing coordinates, stale data in DB
  9. **SEOEngine** — checks title, description, H1, OG tags, canonical links per page
  10. **DeadCodeEngine** — detects deprecated/legacy DOM elements, inline handlers, hidden elements
  11. **DeadFlowEngine** — detects dead buttons, broken links (#), orphan forms, invisible CTAs
  12. **WalletQualityEngine** — finds stuck transactions, recurring payment failures, slow checkout
  13. **OrbitQualityEngine** — checks message delivery, thread consistency, realtime connection status
  14. **RadarOptimizationEngine** — monitors search speed, empty results, map pin count, filter usage
  15. **MeBusinessEngine** — verifies business profiles, wallet/orbit links in Me section
  16. **PropertyEngine** — validates property listings: media, location, staleness, completeness
  17. **CountryRulesEngine** — detects single-country assumptions, hardcoded currencies, missing lang
  18. **AutomationEngine** — finds inactive merchants, stuck orders, stale bookings
  19. **ObservabilityEngine** — monitors error spikes, slow pages, memory leaks, engine failures
  20. **TestEnforcementEngine** — checks responsive layout, tap target sizes, i18n gaps
  21. **FeatureFlagEngine** — audits feature flags: stale, unregistered, debt
  22. **QualityScoreEngine** — aggregates all engine scores into global quality grade (A-F)
- **Architecture**: All extend `BaseEngine`, run on intervals, emit to `platformBus`, record via `engineObserver`

## Key Files
- **5 Pillars**: `SmartHome.tsx` (Dashboard), `HyperRadarPage.tsx` (Radar), `CommunicationCenter.tsx` (Orbit), `WalletHubPage.tsx` (Wallet), `MeCommandCenter.tsx` (Me)
- **Radar Components**: `RadarSmartSearch.tsx` (autocomplete + history), `RadarResultCard.tsx` (uniform card), `RadarEntitySheet.tsx` (detail), `PersonalRadarPanel.tsx` (AI personal), `RadarStoryRail.tsx` (stories), `ZoneIntelligenceSheet.tsx` (zone detail)
- **Stores**: `useOrbitProfileStore` (canonical; `useOrbitStore` deprecated alias)
- **Services**: `src/services/db.ts` (database), `src/services/` (all services)

## Component Audit Results (Latest)
- Reduced UI library from 91 → 69 components (22 dead/duplicate removed)
- Deleted: UltraButton, PageEmptyState, ShimmerSkeleton, FuturisticCard, NetworkStatusBar, OrbitSpinner, CareemTopHeroStrip, FinalStatusLegendCard, feature-tooltip, page-motion, a11y, PaginationControls, PageBreadcrumb, CitySelector, NationalitySelector, SearchableSelector, AppSearchInput, MapEmptyState
- Consolidated: UniverseCard (2 → 1 canonical), EmptyState (2 → 1), Card bases (5 → 3 purposeful)
- Upgraded: Skeleton (stub → real animated), LoadingState (empty div → 4 variants), Button (+loading), AppCard (+kpi/status/glow)
- Memoized: CommCallsSection filtered list, filter labels, missed count
- Bundle: index.js 429KB (was 487KB, -12%)

## Page Layout System (Pillar Pages)
- **Components**: `PillarPage` + `PageSection` in `src/components/layout/PillarPage.tsx`
- **CSS**: `.pillar-page`, `.page-section`, `.page-section__header`, `.page-section__title`, `.page-section__action-btn`, `.page-section__divider`, `.page-hero` in `index.css`
- **Spacing variables**: `--section-gap` (24px, tablet 32px, mobile 20px), `--section-gap-compact` (16px, tablet 24px, mobile 12px), `--section-header-mb` (12px, tablet 16px)
- **RULE**: All pillar pages must use `pillar-page` class. Section headers use `page-section__header` pattern (title + action). Section spacing via CSS variables, never hardcode `mb-5`.
- **5 pillars applied**: SmartHome (PillarPage component), WalletHub/Me/Radar/Orbit (pillar-page CSS class)

## Design System Standards (Enforced)
- **Spacing scale**: 4/8/12/16/24/32/48px (strict, see CSS variables + `src/config/ui.ts` SPACING)
- **Section spacing**: `var(--section-gap)` between sections (NOT `mb-5`)
- **Section header spacing**: `var(--section-header-mb)` between section header and content
- **Section header typography**: `text-[13px] font-bold`; use `.ds-section-title` CSS class
- **Card images**: `aspect-[16/10]`, never fixed height
- **Card text**: Always `line-clamp-1` or `line-clamp-2`, never unclamped
- **Carousel**: `gap-2.5`, `pb-1.5`, card width `w-[170px]`
- **Padding**: `px-4` (never `px-3 sm:px-4`)
- **Buttons**: `min-h-[44px]` on mobile, `whitespace-nowrap text-xs` for tab bars
- **Typography**: `font-bold` for headers/labels, `font-extrabold tabular-nums` for numeric values, `font-black` ONLY in watermarks/logo
- **Minimum font**: `text-[10px]` minimum; `text-xs` (12px) minimum body
- **Brand colors**: Navy/Gold always via inline `style={{}}`, never Tailwind classes
- **i18n**: Use `tSafe(t, key, fallback)` pattern

## Radar (HyperRadarPage) Architecture
- **View modes**: Map (fullscreen Mapbox), List (scrollable cards), Hybrid (50/50 split map+list synced)
- **Search**: RadarSmartSearch with SearchBrain autocomplete, localStorage history (8 items), 300ms debounce, quick category chips
- **Filters**: 9 layer toggles + contextual vertical filters. When single vertical selected, shows `RadarFilters.tsx` with vertical-specific schemas from `radar-filter-schemas.ts` (food: cuisine/price/delivery/dine-in, hotel: stars/budget/type/pool/breakfast, property: buy-rent/budget/bedrooms/furnished, services: urgency/availability/price, taxi: vehicle/ETA, healthcare: specialty/availability)
- **Sort**: Smart (RadarScore composite), Nearest (distance), Top Rated, Trending (popularity + reviews + sponsored)
- **Scoring**: Composite `RadarScore` from `radar-score.ts` — extends `ranking-engine.ts` with 9 vertical-specific weight profiles (food: proximity 28%, services: profile 15%, hotel: rating 22%, property: recency 20%, taxi: proximity 35%, etc). Additional signals: availability, quality, trust, preference match, conversion likelihood. Penalties for closed/low-quality, boosts for high-quality+nearby
- **Quality gates**: `radar-quality-gate.ts` — fails entities missing geo/title/category or quality<0.15. Demotes entities with quality<0.3 or missing image in critical verticals (food/hotel). Score penalty 0.6x on demoted items
- **Result cards**: 6 vertical-specific cards via `RadarCardDispatcher` — `RadarFoodCard` (cuisine, price, open status), `RadarHotelCard` (stars, district, price/night), `RadarPropertyCard` (image hero, bedrooms, price), `RadarServiceCard` (availability, healthcare badge), `RadarShopCard` (standard row), `RadarTaxiCard` (vehicle icon, ETA, status). All share consistent spacing/sizing (px-3 py-2.5, rounded-2xl, line-clamp-1)
- **Normalized items**: `RadarResultItem` shape from `radar-result-item.ts` — type, radarScore, qualityScore, primaryAction, secondaryActions, orbitBindable, walletBindable, route builder
- **Map sync**: UnifiedMap `onMapMove` callback fires on `moveend`. "Search this area" button appears when map pans >0.005° from last search center. Recenter button resets to GPS location
- **Analytics**: `radarAnalytics.ts` — tracks search_started, search_completed, filter_used, filter_reset, sort_changed, view_mode_changed, result_clicked, cta_used, area_research. All events fire from handlers/effects, not memos
- **Services layer**: `src/services/radar/` — `radarSearchService.ts` (unified search with pagination/timing), `radarResultMapper.ts` (RadarPoint → RadarResultItem with scoring), `radarAnalytics.ts` (event buffering, session management)
- **Diversification**: `diversifyResults()` from `radar-score.ts` — limits max 3 consecutive same-type results in smart sort
- **Intelligence**: Vibe density engine, zone rhythm, time-slot guidance (coffee in morning, food at lunch, nightlife at night)
- **Pillar wiring**: Quick-nav to Dashboard, Orbit, Wallet, Me from bottom sheet
- **Performance**: `useDeferredValue` for search, `MAX_VISIBLE_PINS=80`, lazy image loading, memo on cards
- **Weather**: Live weather station with temp, humidity, wind, precipitation
- **Live context**: Real-time traffic, demand prediction, rider supply, zone events (via RadarView)

## Global Navigation State Machine
- **Store**: `src/stores/navigationStateMachine.ts` (Zustand) — centralized FSM for all 5 pillars
- **16 states**: 3 Dashboard (IDLE/PREVIEW/INTERACTION), 4 Radar (IDLE/SEARCHING/RESULTS/DETAIL_PREVIEW), 3 Orbit (IDLE/ACTIVE/CONVERSATION), 3 Wallet (IDLE/PAYMENT/CONFIRMATION), 3 Me (IDLE/EDIT/ANALYTICS)
- **Transition types**: soft (same pillar), overlay (cross-pillar preview), hard (full navigation)
- **Guard matrix**: `ALLOWED_TRANSITIONS` defines all valid state→state paths; blocked transitions logged in dev
- **Context preservation**: Per-pillar `PillarContext` (lastQuery, lastFilters, lastPosition, lastScroll, lastEntity, lastRoute) — saved automatically on cross-pillar transitions
- **Overlay management**: `openOverlay`/`closeOverlay`/`upgradeOverlay` — FSM-gated, single overlay at a time
- **Route sync**: `forceSync(pillar)` bypasses guard matrix for URL-driven navigation (browser back/forward)
- **History**: Last 50 transitions stored for debugging
- **Integration**: `useSmartNavigation` reads/writes FSM via Zustand selectors; SmartHome + HyperRadarPage report sub-states via `setPillarSubState`
- **Files**: `src/stores/navigationStateMachine.ts`, `src/hooks/useSmartNavigation.ts`

## Dashboard ↔ Radar Progressive Engagement (4-Level Navigation)
- **Architecture**: Dashboard consumes Radar capabilities without premature context switch. 4 engagement levels with progressive disclosure.
- **Level 1 — Preview**: `RadarPreviewWidget` (in Dashboard) shows top 5 nearby results with mini cards (image, name, category, rating, distance). "Explore" CTA opens Level 2. No navigation away from Dashboard.
- **Level 2 — Interactive Preview**: `RadarExplorerDrawer` (bottom sheet via `AppBottomSheet`, snap points 45%/88%). Scrollable results with `RadarCardDispatcher`, vertical filter chips (all/food/hotel/property/services/shops/taxi/healthcare), sort options (smart/nearest/top-rated/trending), collapsible mini map preview via lazy-loaded `UnifiedMap`.
- **Level 3 — Transition Triggers**: Explicit buttons at drawer bottom: "Open Map" (navy CTA), "Full Search" (gold CTA), "Explore Zone" (arrow). Each builds URL with context (`vertical`, `sort`) via `buildRadarRoute()`.
- **Level 4 — Radar Full Screen**: Standard `HyperRadarPage` — now reads `sort` and `vertical` URL params to hydrate initial state from dashboard context.
- **Shared data**: `useDashboardRadar` hook lifted to `SmartHome`, passes same `items/loading/totalCount` to both preview widget and drawer. Single fetch, no duplication.
- **Engagement state**: `radar-engagement.ts` — `EngagementLevel` enum, `TransitionTrigger` type, `buildRadarRoute()` for context-preserving navigation.
- **AdapterSection pattern**: "See all" buttons on Trending/Best Rated/Newest/Near You sections now open `RadarExplorerDrawer` with pre-set sort instead of navigating directly to `/radar`.
- **Drawer prop sync**: `useEffect` resets `activeSort`/`activeVertical`/`selectedItemId` when drawer opens with new props.
- **Files**: `src/lib/radar/radar-engagement.ts`, `src/hooks/useDashboardRadar.ts`, `src/components/dashboard/RadarPreviewWidget.tsx`, `src/components/dashboard/RadarExplorerDrawer.tsx`

## Visual Cleanup (Error Sanitization)
- All user-facing `toast.error(err.message)` replaced with user-friendly messages (~90+ files)
- All `toast({ description: error.message })` replaced with generic messages (~30+ files)
- ErrorBoundary no longer exposes raw `error.message` to users
- Added `src/lib/safe-error.ts` utility and `common.error_generic` i18n key (EN/FR/AR)
- ExploreListingCard: removed raw category slug fallback, null-safe price display
- Admin pages intentionally keep raw error messages for debugging
- Pattern: `console.error("[Module]", err.message); toast.error("User-friendly message");`

## Global Menu System (src/lib/menu/ + src/components/menu/)
Canonical, data-driven menu derived from CATEGORY_TREE (14 verticals, 268+ subcategories).
Replaces hardcoded `EXPLORE_CATEGORIES` and `SuperServicesGrid`.

**Data Layer** (`src/lib/menu/`):
- `menu-types.ts` — MenuNode (4-level: vertical→cluster→subcategory→activity), MenuContext (role/country/language/RTL/features/time-of-day), MenuSection, MenuSearchResult, BusinessMenuItem
- `menu-registry.ts` — Canonical registry built from CATEGORY_TREE. Exports: `getMenuTree()`, `getFlatMenuIndex()`, `getBusinessMenuItems(role)`, `getBusinessMenuSections(role)`, `QUICK_ACCESS_SERVICES`
- `menu-engine.ts` — `resolvePublicMenu(ctx)`, `resolveBusinessMenu(ctx)`, `searchMenu(query, ctx)`, `getVerticalSubMenu(key, ctx)`, `getQuickActions(ctx)`. Handles visibility (role/country/feature-flag), scoring (frequency/favorites/time-of-day), filtering
- `useMenuContext.ts` — React hook building MenuContext from i18n locale, user role, country, RTL detection, frequent routes from localStorage

**Components** (`src/components/menu/`):
- `ServiceMenuGrid` — Data-driven 4-col grid replacing SuperServicesGrid (used in SmartHome.tsx)
- `ServiceMenuDrawer` — Bottom sheet with full CategoryMenu (mobile, 85vh)
- `CategoryMenu` — 2-panel vertical→subcategory browser with search
- `MegaMenu` — Desktop hover mega menu with vertical sidebar + cluster grid
- `BusinessMenu` — Role-adaptive business menu (merchant/provider/property_manager/landlord/tenant/driver/admin)
- `MenuSearchBar` — Fuzzy search across all menu nodes (label/slug/alias/tag matching)
- `IconMenuCard` — Single service card with emoji/icon + label
- `MenuItem` — List-style menu row with icon/emoji/badge/chevron
- `MenuSectionComponent` — Collapsible section with title + child items

**Roles supported**: user, merchant, provider, owner, manager, admin, property_manager, tenant, landlord, driver
**Business menu sections**: operations, finance, growth, compliance, communication, settings, admin

## Taxonomy & Data Architecture
- **SSOT**: `src/lib/taxonomy/category-tree.ts` — 14 primaries, 268+ subcategories, strict hierarchy
- **Adapter**: `src/lib/taxonomy/world-class-taxonomy.ts` — enrichment layer (service modes, time relevance, geo hints)
- **Import mapper**: `src/lib/import-engine/taxonomy/taxonomy-mapper.ts` — 180+ aliases for global category resolution
- **Taxonomy health engine**: `src/lib/engines/taxonomy-health-engine.ts` — detects vertical mismatches, orphaned subcategories, missing tags, tree duplicates
- **Data quality engine**: `src/lib/engines/data-quality-engine.ts` — 5-dimension scoring (identity/contact/geo/visuals/content), A–F grades, batch assessment
- **Dedup engine**: `src/lib/import-engine/dedup/dedup-engine.ts` — Levenshtein fuzzy name matching, country-normalized phones, graduated GPS proximity, Arabic/multilingual normalizers
- **Geo normalizer**: `src/lib/geo/geo-normalizer.ts` — address format templates per country (14 countries), noise removal, anomaly detection, enhanced confidence scoring
- **Canonical address**: `src/lib/address/canonical-address-resolver.ts` — upsert/search/resolve pipeline, user saved addresses, active context system

## Review Paywall
- All review surfaces are locked behind subscription paywall (`ReviewPaywall` component)
- Gated surfaces: `ReviewList` (merchant), `SortableReviewList` (marketplace), `ReviewPanel` (property)
- Free users see blurred reviews with Navy/Gold lock overlay and upgrade CTA
- Aggregate rating summary (stars, average) remains visible as teaser
- Review submission (`ReviewComposer`) remains free — only viewing is gated
- Feature key: `"reviews"` in `useSubscriptionGating` (not in FREE_FEATURES)

## Dead Code Audit (Latest)
- Removed 8 dead hooks: useActivityRealtime, useAuditReport, useDeliveryCommandCenter, useFavoritesRealtime, usePaymentStatusSync, useRadarGeo, useRealtimeDispatchBoard, useSmartBanners
- Removed 1 dead store: liveBadgeStore
- Removed 9 dead components: CardCommerce, CardIdentity, CardMedia, CardSignals, StayCard, PayActionSheet, DeliveryHeatmapPanel, BubbleMediaBlock, ReplyPreview

## Performance Optimization (Latest)
- jsPDF (~300KB) converted from static to dynamic import in all 7 files (3 lib generators, 3 page files, 1 component)
- All call sites updated to await the async `generateFromTemplate()` / `downloadFinancialPDF()`
- Skeleton loaders upgraded to `skeleton-premium` CSS class (smooth directional shimmer vs basic pulse)

## Payment/QR UX Improvements ("Améliore")
- **UnifiedPaymentSystem**: Redesigned with Navy/Gold branded slide-up sheet, spring animation, recipient initials avatar card, swipe-to-pay gesture (drag + keyboard accessible), branded success state
- **ReceiveQrPanel**: Navy/Gold branded QR card with gradient background, quick amount presets (5/10/20/50/100/250), toggle-off on re-tap, custom amount input
- **QrScannerPage**: Manual amount entry upgraded with Navy header showing recipient initials, quick amount chips with Gold active state, 16px font-size input
- **WalletHubPage**: Gold floating "Quick Pay" FAB positioned above bottom nav, spring entrance animation

## Super-App Amélioration (Latest)
- **HERO Redesign**: TopHeroBanner upgraded with premium Navy gradient, H1 heading, prominent centered search bar, 6 category quick-access buttons (Food/Services/Hotel/Taxi/Delivery/Immo) with i18n keys
- **SEO Overhaul**: robots.txt (single policy, comprehensive Allow/Disallow incl. exact /dashboard), index.html with schema.org @graph (Organization + WebSite+SearchAction + SoftwareApplication + WebPage+BreadcrumbList), updated meta tags to super-app positioning (French primary, multi-locale OG)
- **SEOHead on All 5 Pillars**: Dashboard, Wallet (noindex), Me (noindex), Radar (indexed with canonical+keywords), Orbit (noindex)
- **Wallet Pagination**: Transaction history paginated (20/page) with "Load more" button
- **Me Role Logic**: Cleaned from nested ternary to useMemo accumulation. Hardcoded "Gestion Immo" replaced with i18n
- **Cross-Pillar Wiring**: OrbitPreviewWidget links fixed from `/dashboard/communication` to `/orbit/{threadId}`. LiveStatsPulse tiles now clickable navigating to Wallet/Orbit/Orders/Me
- **Heading Hierarchy**: All dashboard sections consistent H2/font-black/14px (SuperServicesGrid, EssentialServicesStrip, Browse Categories, FeaturedHotels, AdapterSections)
- **I18n Gaps Closed**: Hero categories, ActiveCartBanner, active ride/delivery banners — all hardcoded English replaced with i18n keys (FR/EN added)
- **Design System Consistency**: Gold "See all" links uniform, section labels uniform across OrbitPreviewWidget and all dashboard sections
- **Dead Code Cleanup**: Removed `sedeeNVJO` junk file, `safe-lazy.tsx` (unused duplicate)

## Improvement Pass (Latest)
- **Sentry Error Boundaries**: Both `ErrorBoundary` and `AppCrashBoundary` now report crashes to Sentry via `captureException()` (was console-only)
- **Sentry Boot**: Already wired via `initMonitoring()` → `initUnifiedMonitoring()` → `initSentry()` (deferred 3s after boot). Needs `VITE_SENTRY_DSN` env var to activate
- **I18n Completion**: All 5 pillar SEOHead tags now use i18n keys (was hardcoded French). Added: `radar.seo_title/desc/keywords`, `wallet.seo_title/desc`, `me.seo_title/desc`, `orbit.seo_desc`, `radar.hotspots`, `orbit.new_group/new_community/find_contact`, `me.property_management/property_management_sub`
- **Removed Hardcoded Fallbacks**: MeCommandCenter (spending/receipts/property labels), CommunicationCenter (new group/community/find contact) — all now pure i18n without `|| "English fallback"`
- **Dead Code Cleaned**: Removed orphaned registry entries (`OrdersPage`, `SettingsPaymentMethodsPage`, `NotificationPreferencesPage`). Cleaned dead nav matchers (`/send`, `/super-map`) from navigation.ts
- **Navigation Clarity**: `/settings/payment-methods` → redirects to `/wallet`, `/settings/notification-preferences` → redirects to `/settings/notifications` (routes kept, orphaned lazy imports removed)

## Technical Improvement Pass (Latest)
- **Critical Bug Fix**: CommunicationCenter useEffect had empty `[]` deps but referenced `activeSection` — threads were never cleared on section switch. Fixed with `[activeSection]` dep.
- **Performance — Memoization**: `TransactionRow` (Wallet list), `PersonalRadarPanel` (Radar AI panel), `RadarStoryRail` (Radar story feed) wrapped in `React.memo` to prevent unnecessary re-renders
- **Performance — useCallback**: HyperRadarPage `toggleLayer`, `cycleRadius`, `cyclePanelSnap` wrapped in `useCallback`. CommunicationCenter `handleContactInfo`, `handleStatusChange` wrapped in `useCallback` (were inline in JSX). WalletHubPage `createDefaultWallet` converted from bare function to `useCallback` with proper deps.
- **useEffect Deps Fixed**: WalletHubPage `createDefaultWallet` added to effect deps. CommunicationCenter section-clearing effect now has proper `[activeSection]` dependency.
- **Dead Store Removed**: `useCameraStore` (src/stores/cameraStore.ts) deleted — zero external imports confirmed.
- **All stores audited**: 55+ stores verified, only `useCameraStore` was truly dead. `useStoryViewerStore` was initially flagged but confirmed used in 3 files.

## Me Cockpit Strategic Upgrade
- **MeCommandCenter** transformed from flat profile menu into structured business cockpit
- **10 Business Blocs**: Business Identity, Contact & Address, Activities & Services, Media Center, Payments & Wallet, Orbit & Communication, Performance, Settings & Control, Documents & Compliance, Team & Roles
- **Role-Adaptive**: Simple user sees personal essentials only; merchant sees full 10-bloc cockpit; property manager sees property section; driver sees driver hub
- **MeBusinessSwitcher** (`src/components/me/MeBusinessSwitcher.tsx`): Multi-shop switcher for users with multiple businesses. Expandable dropdown with shop logos, names, and city.
- **MeProfileQuality** (`src/components/me/MeProfileQuality.tsx`): Animated SVG gauge showing profile completeness (0-100%) computed from 10 checks (name, description, logo, cover, phone, email, address, categories, hours, wallet). Shows top 3 improvement suggestions.
- **MeBusinessKpis** (`src/components/me/MeBusinessKpis.tsx`): 5-column KPI strip (Views, Contacts, Orders, Rating, Revenue) for merchant dashboard overview.
- **Data Layer**: Added `typedQueries.storefrontPages.selectByOwner()` for full shop data fetch
- **i18n**: 90+ new keys added (FR + EN) for all bloc titles, item labels, quality checks, KPI labels
- **Cross-Pillar Wiring**: Merchant items link to `/merchant/store-settings/:id`, `/merchant/menu/:id`, `/merchant/finance`, `/pos`, `/seller`, `/seller/boost`. Property items link to `/dashboard/*`. Orbit items link to `/orbit`. Wallet items link to `/me/saved-cards`, `/me/order-receipts`.

## Me Cockpit Deep Enhancement (Phase 2)
- **Provider Role Detection**: Added `marketplace_providers.existsByUser()` and `marketplace_providers.countServicesByUser()` to typedQueries. Me now detects marketplace provider role and shows provider-specific section.
- **Provider Hub Section**: 6 items — Services & Activities, Covered Zones, Availability, Client Requests (bookings), Invoices, Performance. Links to marketplace pages.
- **MeStatusBar** (`src/components/me/MeStatusBar.tsx`): Horizontal scrollable status pills showing 4 states: Verification (verified/pending), Publication (published/draft/hidden), Wallet (active/setup needed), Orbit (on/off). Green accent when active, navy muted when inactive.
- **MeQuickActions** (`src/components/me/MeQuickActions.tsx`): 6-column quick action grid for merchants: Orders, Add Product, POS, Chat, Analytics, Media. One-tap access to frequent operations.
- **Real Merchant KPIs**: Replaced generic KPI strip with real data from `getMerchantDashboardSnapshot()` — Revenue (grossSales), Active Orders, Completed Orders, Available Products. Each KPI is clickable and navigates to its detail page.
- **CTA Layout Improved**: "Open Shop" and "Become Provider" now side-by-side in a 2-column grid for non-business users. More compact and actionable.
- **5 Role Support**: simple user, merchant, property manager, provider, driver — each sees only their relevant cockpit sections.
- **i18n**: 30+ additional keys for status bar, quick actions, provider hub, merchant KPIs (FR + EN).

## SmartCore Intelligence Layer
- **SmartCore** (`src/lib/smart-core.ts`): Unified intelligence engine tracking feature usage (route visits, dwell time), flow metrics (start/complete/abandon), and generating adaptive suggestions. Persists to localStorage with automatic history pruning (max 200 entries) and score decay (0.95 factor per session).
- **SmartCoreTracker** (`src/components/system/SmartCoreTracker.tsx`): Mounted in App.tsx inside the Router. Automatically tracks every route visit and dwell time without component-level integration needed.
- **useSmartInsights** (`src/hooks/useSmartInsights.ts`): React hook consuming SmartCore data. Returns `topRoutes` (usage-ranked), `suggestions` (context-aware), and `dismiss` function.
- **SmartShortcuts** (`src/components/dashboard/SmartShortcuts.tsx`): Usage-frequency-based dynamic shortcut strip on Dashboard. Shows top 4 most-visited features as quick-access pills. Excludes main nav routes (/, /login) and adapts over time.
- **SmartSuggestions** (`src/components/dashboard/SmartSuggestions.tsx`): Contextual action suggestions on Dashboard. Suggests: open shop, setup wallet, complete profile, try Orbit, flow help. Dismissible. Priority-sorted.
- **Flow Tracking**: Taxi flow (taxiFlowStore) and Checkout (CheckoutPage) both track start/complete/abandon with duration metrics. Uses ref-based guard to prevent false abandon on successful completion.

## Performance Hardening
- **HyperRadarPage**: Search filtering now uses `useDeferredValue` for non-blocking input. Prevents UI jank during search with up to 80 visible pins.
- **Existing infrastructure confirmed active**: smart-prefetch (T+2s), browser-telemetry (T+3s via DeferredBootGuards), UX friction engine (T+8s via engine-orchestrator Tier 2), PWA offline support, optimistic UI framework.
- **i18n**: 24 new keys for smart suggestions (FR + EN).

## Technical Hardening Pass (Latest)
### Dead Code Cleanup
- Removed `src/lib/address/resolver/` (unused directory — 3 files)
- Removed `src/lib/payments/payment-intent.ts` (duplicate of payment-intents.ts)
- Removed `src/i18n/locales/` (unused — app uses src/lib/i18n-data.ts)
- Removed `src/lib/pwa-advanced.ts` + test (superseded by pwa-utils.ts)
- Removed `src/lib/api-docs.ts` + test (unused)

### Type Safety Hardening
- **merchant.types.ts** (`src/services/merchant.types.ts`): 12 canonical interfaces for merchant domain (MerchantRecord, StorefrontPage, CatalogCategory, MenuItem, OrderRecord, ReviewRecord, PromoRecord, ProductRecord, MerchantSummary, MerchantAnalytics, OnboardingProfile, OrderSummaryRow)
- **merchant.service.ts**: All return types now concrete (was `unknown[]` / `any[]`). Every method has explicit return type annotation.
- **HyperRadarPage**: `selectedEntity` state typed as `GeoEntity & { isSponsored?; reviewsCount? }` (was `any`). `handleSelectEntity` callback typed. Removed `as any` cast for `reviewsCount`.
- **SmartHome**: `AdapterSection` shops prop typed as `ShopSummary[]` interface (was `any[]`). Iterator typed.

### Error Handling Normalization
- **useAppError** (`src/hooks/useAppError.ts`): Hook wrapping `classifyError` + `reportError` + i18n-aware toast. Provides `handleError(error)` for manual catch blocks and `wrapAsync(fn, fallback)` for automatic error handling. Severity-aware toast duration (fatal=8s, transient=4s, standard=5s). Falls back through `error.{domain}` → `error.{context}` → built-in userMessage.
- **i18n Error Keys**: 11 error domain keys added to FR + EN: `error.network`, `error.auth`, `error.validation`, `error.database`, `error.payment`, `error.unknown`, `error.wallet`, `error.booking`, `error.order`, `error.upload`, `error.permission`

### Quality Gates System
- **quality-gates.ts** (`src/lib/quality-gates.ts`): Runtime quality infrastructure with error log collection (max 500), health status monitoring (healthy/degraded/unhealthy based on 5-min error rate), architecture rules registry (8 rules: no-direct-db-in-ui, no-any-in-services, no-circular-deps, no-raw-error-messages, canonical-types-only, i18n-required, service-layer-required, no-dead-routes), performance budgets (bundle 500KB, page load 3s, interaction 100ms, list items 100, images 200KB), and module-level quality scoring.
- **initQualityGates()**: Wired in App.tsx at module scope — registers global error reporter to feed error snapshots into quality tracking. `getErrorSummary()` returns live health dashboard data.

## Real Estate Vertical (Global)
- **Domain layer**: `src/domains/real-estate/` — canonical-types.ts (14 entity interfaces, all enums), taxonomy.ts (full property tree + alias resolver), country-rules.ts (15 countries: AE/FR/US/GB/SA/MA/EG/IN/DE/TN/SN/CI/CM/TR/ES + default fallback), permissions.ts (12 roles, fine-grained perms), quality-gates.ts (publish blockers + scoring), e-signature-types.ts (signature flow types, signer roles, audit trail)
- **Service layer**: `src/services/real-estate.service.ts` — 8 service objects: property (CRUD, filters, publish), lease, tenant, maintenance, document, viewing, payment, analytics (portfolio overview)
- **Country rules engine**: `getCountryRules(countryCode)` — expanded with `rentalLaw` (law name/reference/tenant protection/eviction difficulty/rent control), `leaseTypes` (empty/furnished/commercial/seasonal/professional/rural), `paymentFrequencies`, `legalObligations[]` (per-party with penalties), `documentFormats`, `eSignatureSupported`, `rentReceiptMandatory`, `inventoryRequired`, `insuranceMandatory`, `diagnosticsMandatory`, `guarantorAllowed`. Helper functions: `computeDeposit()`, `computeTaxOnRent()`, `getLegalObligations(cc, party?)`, `getRentalLaw()`, `getLeaseTypes()`, `getPaymentFrequencies()`, `isRentReceiptMandatory()`, `isESignatureSupported()`
- **Lease generator engine** (`src/lib/engines/lease-generator-engine.ts`): `generateLease(input)` → lease data + deposit calc + obligations checklist + warnings + template selection per country/category. `generateLeaseRenewal()` for renewals with rent increase validation
- **Rent call engine** (`src/lib/engines/rent-call-engine.ts`): `generateRentCalls(lease)` → periodic rent calls from lease dates. `markRentCallPaid()` → status update + receipt trigger + platformBus events. `computeOverdueStatus()` (severity: none/warning/late/critical). `shouldSendReminder()` → push/orbit channel selection
- **Rent receipt engine** (`src/lib/engines/rent-receipt-engine.ts`): `generateRentReceipt()` → localized receipt (FR quittance de loyer / AR إيصال إيجار / EN receipt) with PDF-ready data structure, legal text per country, receipt numbering
- **Rent payment engine** (`src/lib/engines/rent-payment-engine.ts`): `processRentPayment()` → Wallet debit/credit + platform fee (1.5%) + late fee calc. `createPaymentPlan()` → split payments (2/3/4 installments). `getPaymentSummary()` → collection rate, overdue count, totals. `computeLateFee()` with configurable grace period
- **Legal engine** (`src/lib/engines/legal-engine.ts`): `runPropertyComplianceCheck()` → compliance report with score (0-100), missing documents, per-obligation status. `validateLeaseCompliance()` → validates lease params against country rules. `getSignatureRequirements()` → e-sig allowed, witness/notarization/registration requirements per country
- **E-signature types** (`src/domains/real-estate/e-signature-types.ts`): SignatureRequest, Signer (6 roles), SignatureAuditEntry, SignatureConfig (sequential/parallel, expiration, reminders). `isSignatureComplete()`, `canSign()`, `getNextSigner()`, `computeSignatureProgress()`
- **Automation rules**: 16 built-in rules (was 9) — added: auto_receipt_on_payment, monthly_rent_call_generation, lease_renewal_compliance_check, overdue_payment_orbit_relance, signature_expiry_reminder, partial_payment_followup, insurance_expiry_alert. New action types: generate_receipt, trigger_rent_call, compliance_check, signature_reminder
- **Engine registry** (`src/lib/engines/real-estate-engine-registry.ts`): Wired into useMasterAppBootstrap stage-3. Connects platformBus events across all 5 engines (rent.paid → receipt, lease.generated → compliance, partial_payment → Orbit, compliance alert → Orbit)
- **Marketplace**: `/real-estate` (ListingType tabs + filters), `/real-estate/:listingType/:slug` (detail page with media, specs, contact/viewing sheet)
- **Me cockpit**: `/me/properties` (hub + list + 5-step create wizard + tenants + leases + maintenance + analytics). Cockpit = summary only, no financial operations
- **Wallet finance**: `/wallet/property` (rents/deposits/payouts/expenses tabs, 4 KPI chips). ALL financial detail lives here
- **Me/Wallet contract**: Me = cockpit/overview. Wallet = all financial operations. Me Analytics has "Open Property Finance →" button linking to Wallet
- **i18n**: 170+ keys in `re.*` namespace (EN/FR/AR) in i18n-canonical.ts `realEstateVertical` section
- **Routes**: `/me/gestion-immo` redirects to `/me/properties`

## Engineering Audit (2026-04-10)
Full audit report: `docs/ENGINEERING_AUDIT.md`
- **Build**: production build fixed (checkPublishBlockers import + duplicate patisserie key)
- **TypeScript**: 0 errors confirmed
- **Known issues**: 387 direct supabase imports (should use db()), 3762 `any` usages, 274 empty catch blocks, 214 console.log, wallet PIN secret fallback hardcoded
- **Security**: Auth/RLS solid, CORS wildcard on Edge Functions needs restricting, CSP headers needed
- **Test coverage**: ~2% (66 unit + 8 E2E for 3279 files)
- **Performance**: 462K lines, bundle needs splitting by pillar, 8 files >800 lines need decomposition
