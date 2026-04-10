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

## Key Files
- **5 Pillars**: `SmartHome.tsx` (Dashboard), `HyperRadarPage.tsx` (Radar), `CommunicationCenter.tsx` (Orbit), `WalletHubPage.tsx` (Wallet), `MeCommandCenter.tsx` (Me)
- **Stores**: `useOrbitProfileStore` (canonical; `useOrbitStore` deprecated alias)
- **Services**: `src/services/db.ts` (database), `src/services/` (all services)

## Component Audit Results (Latest)
- Reduced UI library from 91 → 69 components (22 dead/duplicate removed)
- Deleted: UltraButton, PageEmptyState, ShimmerSkeleton, FuturisticCard, NetworkStatusBar, OrbitSpinner, CareemTopHeroStrip, FinalStatusLegendCard, feature-tooltip, page-motion, a11y, PaginationControls, PageBreadcrumb, CitySelector, NationalitySelector, SearchableSelector, AppSearchInput, MapEmptyState
- Consolidated: UniverseCard (2 → 1 canonical), EmptyState (2 → 1), Card bases (5 → 3 purposeful)
- Upgraded: Skeleton (stub → real animated), LoadingState (empty div → 4 variants), Button (+loading), AppCard (+kpi/status/glow)
- Memoized: CommCallsSection filtered list, filter labels, missed count
- Bundle: index.js 429KB (was 487KB, -12%)

## Visual Cleanup (Error Sanitization)
- All user-facing `toast.error(err.message)` replaced with user-friendly messages (~90+ files)
- All `toast({ description: error.message })` replaced with generic messages (~30+ files)
- ErrorBoundary no longer exposes raw `error.message` to users
- Added `src/lib/safe-error.ts` utility and `common.error_generic` i18n key (EN/FR/AR)
- ExploreListingCard: removed raw category slug fallback, null-safe price display
- Admin pages intentionally keep raw error messages for debugging
- Pattern: `console.error("[Module]", err.message); toast.error("User-friendly message");`

## Taxonomy & Data Architecture
- **SSOT**: `src/lib/taxonomy/category-tree.ts` — 12 primaries, 150+ subcategories (was ~100), strict hierarchy
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
