# Easy-Locs Super App

## Overview
Easy-Locs is a worldwide super-app (190+ countries, 120+ currencies, 31 languages) built with React + Vite + TypeScript + Supabase. Five main pillars: Dashboard, Radar, Orbit, Wallet, Me. Taxonomy: 14 primary categories, 268 subcategories.

## Architecture
- **Stack**: React 18, Vite, TypeScript, TailwindCSS, Supabase, Framer Motion, Tanstack Query, Zustand, @tanstack/react-virtual
- **Performance Ultra (Task #191)**: Systematic performance optimization targeting FCP <1.5s, TTI <3s, Lighthouse >90 mobile. Key changes:
  - **AuthContext Split**: 3 atomic contexts (AuthSessionContext, AuthProfileContext, AuthActionsContext) reduce cascade re-renders. Backward-compatible `useAuth()` merges all 3. Granular hooks: `useAuthSession()`, `useAuthProfile()`, `useAuthActions()`.
  - **Virtualized Lists**: HudConversationList, MessageList (chat), WalletHubPage transactions all use `@tanstack/react-virtual`. Generic `VirtualizedList.tsx` component available. Conversation list: 72px row height, 8 overscan. Messages: 60px, 10 overscan. Transactions: 64px, 10 overscan.
  - **Bundle Optimization**: Brotli + gzip compression via vite-plugin-compression. Manual chunks: vendor-react-dom, vendor-react-core, vendor-charts (recharts+d3), vendor-3d, vendor-pdf, vendor-mapbox, vendor-supabase, vendor-radix, vendor-tanstack, vendor-icons, vendor-vitals. Pillar-based code splitting (pillar-dashboard, pillar-radar, pillar-orbit, pillar-wallet, pillar-me). Chunk size warning: 300KB.
  - **Provider Tree Reduction**: CoreProviders wrapper merges LazyMotion + GlobalErrorBoundary + ChunkRecoveryBoundary + ThemeProvider + QueryClientProvider + I18nProvider into single component, reducing App.tsx nesting depth.
  - **Web Vitals Tracking**: `src/lib/web-vitals.ts` tracks LCP, FID, CLS, INP, TTFB, FCP via official web-vitals library. Auto-initialized via idle callback. Dev mode: color-coded console logging. `getLatestVitals()` for admin dashboard.
  - **Smart Prefetch**: Hover/focus/touch prefetch via `createPrefetchHandlers()`. Critical route prefetch on idle. Preconnect hints for Supabase, Mapbox API, Mapbox tiles (both in index.html and dynamic via `initPreconnectHints()`).
  - **IndexedDB Cache**: `src/lib/cache/idb-cache.ts` — lightweight key-value cache with TTL. `cachedFetch()` for profile/taxonomy data. 4-hour default TTL.
  - **LazyChart**: `src/components/ui/LazyChart.tsx` — lazy-loaded ChartContainer for deferred recharts loading. Admin pages (Finances, Reporting, Accounting, etc.) already code-split via safeLazy route registry.
- **Mapbox Dynamic Loading** (Task #177): mapbox-gl (1.7MB) is loaded dynamically via `src/lib/mapbox/mapbox-loader.ts` singleton. All map components use `import type mapboxgl from "mapbox-gl"` (zero-cost) + `loadMapbox()` / `getMapboxgl()` from the loader. CSS is injected on first load. Never use `import mapboxgl from "mapbox-gl"` directly.
- **Image Lazy Loading**: All `<img>` tags use `loading="lazy"` except above-the-fold hero images which use `loading="eager"`
- **Design**: Navy `hsl(225 25% 16%)` / Brand Teal `hsl(168 72% 44%)` — use CSS variables from `src/styles/brand-tokens.css` (--brand-primary, --brand-primary-dark, --brand-primary-light, --brand-gradient, --brand-navy, --brand-motion-*). Dynamic logo system (`useDynamicLogo`) drives time-of-day gradient adaptation. EasyLocsLogo component used in sidebar, headers, error/empty states. Hardcoded #1AAE8E only allowed in canvas/map rendering files
- **Landing Dark Theme**: `.landing-dark` CSS scope on Index page forces dark CSS variable overrides (background, foreground, card, muted, border) + `color-scheme: dark`. Loading skeleton also uses dark theme via `PageLoader dark` prop. All landing sections auto-inherit dark styling through CSS variable cascade.
- **Typography**: Min `text-[10px]`, `font-size: 16px` on inputs
- **Bottom nav**: 72px height, hidden on `/login`, `/signup`, `/orbit`, `/checkout`, `/pay/`, `/order/`
- **Layout System** (Task #90): Unified full-screen layout across all 244 pages. `.app-mobile-page` CSS class handles `min-h-[100dvh]`, `background-color: hsl(var(--background))`, `color: hsl(var(--foreground))`, and `padding-bottom: var(--page-bottom-pad)` automatically. `--page-bottom-pad = calc(72px + env(safe-area-inset-bottom,0px) + 16px)`. All pages use `app-mobile-page` class or `min-h-[100dvh]`. All hardcoded `pb-24`/`pb-28`/`pb-20` replaced with `pb-[var(--page-bottom-pad)]`. All `min-h-screen` replaced with `min-h-[100dvh]`. Inline `style={{ background: "#f8f9fa" }}` → `bg-background`; inline `style={{ background: "#fff" }}` → `bg-card`. Card backgrounds use `bg-card border border-border`. Back buttons use `bg-muted` class.
- **DB Access**: ALL database calls MUST use `db(table)` or `db.auth/storage/rpc/functions/channel` from `src/services/db.ts`. Direct imports of `@/integrations/supabase/client` are forbidden everywhere except `src/services/db.ts` (enforced via ESLint no-restricted-imports rule). Use `domainDb.<schema>.from(table)` for schema-ownership-aware access. **Data Layer Boundary (Task #124)**: UI → Domain Service → Repository → DB. Pages/components/hooks MUST NOT import `db` directly — they go through domain services (`src/services/domain/*.service.ts`). 7 domain services: marketplace, dashboard, orbit, wallet, radar, me, onboarding. 7 unified domain repositories (`src/repositories/domain/*.repo.ts`) consolidate sub-repos with `domainDb`. Canonical types SSOT: `src/domains/shared/canonical-types.ts` (legacy `lib/types/domain.ts` deleted). SQL migration `20260415200000_drop_compat_views.sql` drops 19 legacy compat views.
- **Domain Schema Architecture** (Task #56): 38 canonical tables physically moved from `public` to 11 domain schemas using `ALTER TABLE … SET SCHEMA` (preserves RLS, indexes, FK constraints). Public compat views (simple SELECT * → domain table, auto-updatable, SECURITY INVOKER PG15+) ensure zero-downtime backward compatibility. supabase_realtime publication updated to include domain schema tables. supabase/config.toml [api].schemas exposes all 11 schemas to PostgREST. Schema → tables: `identity`(profiles, organizations, organization_members), `wallet`(wallet_accounts, wallet_transactions, wallet_ledger_entries), `orbit`(conversations_v2, chat_messages_v2, conversation_participants_v2, orbit_contacts_v2, ghost_call_sessions, call_logs), `marketplace`(listings, listing_details, listing_attributes, categories, verticals, reviews, favorites), `commerce`(bookings, transactions, carts, receipts, payout_requests), `property`(properties, units, leases), `onboarding`(onboarding_sessions, import_jobs, staging_entities), `support`(support_tickets), `notification`(app_notifications, user_notification_preferences, user_push_tokens), `system`(engine_supervisor, engine_run_logs, worker_health_snapshots), `analytics`(user_radar_events, user_radar_profiles). domainDb.<schema>.from(table) in db.ts validates table ownership then routes via supabase.schema(schema).from(table) directly to the domain table (schema-qualified PostgREST access, no public compat views needed).
- **Legacy Tables Dropped** (Task #56): `orbit_profiles_v2`, `orbit_identity_profiles`, `wallet_balances_v2`, `conversations`(v1), `messages`(v1), `marketplace_services`, `storefront_pages`, `marketplace_bookings`, `concierge_orders`, `booking_requests`. ALL have public alias views (LEGACY — remove after tsx callers migrate). Realtime subscriptions in non-tsx files updated to use domain schemas (orbit.chat_messages_v2, orbit.conversations_v2, orbit.call_logs, commerce.bookings, commerce.transactions). tsx component subscriptions tracked as follow-up work.
- **Domain Schema Files**: `src/lib/schema/domain-schemas.ts` — DOMAIN_SCHEMAS constants, DOMAIN_TABLE_MAP, LEGACY_TABLE_REDIRECTS, getOwningSchema(), qualifiedTable(), getLegacyRedirect(), PLATFORM_FK_ROOT. `src/lib/schema/schema-registry.ts` — all 35 entries with pg_schema + pg_table fields. Migration: `supabase/migrations/20260413600000_domain_schema_architecture.sql`. `src/lib/schema/canonical-mappers.ts` — DB↔domain mapper functions (fromDb/toDb) for Message, WalletAccount, Address, Media, Presence, LedgerEntry.
- **Taxonomy & Canonical Audit** (Task #132): CANONICAL_VERTICALS collision resolved (`canonical-registry.ts` export renamed to `REGISTRY_VERTICALS`). Duplicate mapping functions (`mapCategoryKeyToVertical`, `mapVerticalToRadar`) removed from `world-taxonomy-data.ts` — single source in `world-class-taxonomy.ts` via `CATEGORY_KEY_TO_VERTICAL` / `VERTICAL_TO_RADAR` exports. Alias maps consolidated: `taxonomy-mapper.ts` now imports `SUBCATEGORY_ALIASES` from `taxonomy-aliases.ts` as base, adds import-specific overrides. UI components (`FoodTypePage.tsx`, `CategoryBanners.tsx`) derive from `CATEGORY_TREE`. Full report: `TAXONOMY_CANONICAL_AUDIT_REPORT.md`.
- **localStorage**: ALL browser storage access MUST use `localStore`/`sessionStore` from `src/services/local-store.ts`, namespaced by pillar (dashboard/radar/orbit/wallet/me/auth/system) with `el:pillar:key` prefix.
- **Supabase Project**: `ifvuvbolrmuuugtzxsfk` (Southeast Asia/Singapore). Config.toml project_id must match.
- **Event Bus (Unified)**: Single `platformBus` with colon-notation only (e.g. `wallet:payment_success`). The old `eventBus` (dot-notation) and `notation-bridge.ts` have been removed (Task #123). `event-init.ts` contains a `ROUTING_MAP` that re-emits platformBus events under canonical aliases for downstream fan-out. All emitters and listeners use `platformBus.on()`/`platformBus.emit()` exclusively.
- **Payment Flow**: walletStore emits `wallet:payment_success` → order-handlers + engineConnectorHub resolve orderId via `resolveOrderId()` (handles `orderId`, `referenceId+referenceType`, `reference` with `order:` prefix or UUID format) → order status "paid" + escrow creation.
- **Conversation Uniqueness**: `conversations_v2` has unique index `uq_conversations_v2_direct_pair` on `metadata->>'direct_user_ids'` for `type='direct'`. Pair format: sorted UUID array. Group conversations unaffected (WHERE clause).
- **Pair Key Separator**: All user-pair keys use `::` separator (e.g., `[userA, userB].sort().join("::") `).
- **QR Identity**: All contact QR codes use `qr.addContact()` from `qr-engine.ts`. Legacy `el-contact` format still accepted for backward compatibility. Route: `/add-contact?userId=...&name=...`.
- **Short Links (Link Preview Pro)**: `short_links` table stores short codes mapping to QR actions + JSON payloads. `createShortLink()` in `src/lib/short-links.ts` generates 8-char codes. Route `/sl/:code` resolves short links client-side via `ShortLinkResolvePage`. `social-preview` edge function handles types: listing, service, host, provider, real-estate, payment, profile, contact, shop, product, order, short-link. Payment links auto-generate short URLs. Share messages use `getSocialShareUrl()` for rich OG previews on WhatsApp/Telegram. `social-share.ts` `ShareableType` union includes all 12 types.
- **Disappearing Messages**: `disappear_at` column does NOT exist on `chat_messages_v2`. Value stored in `metadata.disappear_at` JSONB field. Client reads both `msg.disappear_at` and `msg.metadata?.disappear_at`.

## Super App Platform Layer (Block 1)
- **Unified Module Registry** (`src/lib/core/module-registry.ts`): 27 modules across 5 pillars, each declaring domain, ownership, capabilities, routes, canonical models, events published/consumed, dependencies, health checks, feature flags, permissions, UI surfaces, backend services. `moduleRegistry` singleton for discovery/orchestration.
- **Canonical Models SSOT** (`src/domains/shared/canonical-types.ts`): 70+ canonical types — Per-vertical entities for all 20 verticals (CanonicalFoodEntity, CanonicalGroceryEntity, CanonicalHotelEntity, CanonicalServiceEntity, CanonicalServicesEntity, CanonicalPropertyEntity, CanonicalFlightEntity, CanonicalRideEntity, CanonicalDeliveryEntity, CanonicalRetailEntity, CanonicalShopsEntity, CanonicalHealthcareEntity, CanonicalEventsEntity, CanonicalExperiencesEntity, CanonicalEducationEntity, CanonicalBeautyEntity, CanonicalMobilityEntity, CanonicalStayEntity, CanonicalUtilityEntity, CanonicalFinanceEntity, CanonicalMerchantEntity), governance types (CanonicalMediaEntity, CanonicalBannerEntity, CanonicalCategoryNode, GovernanceViolation), geo types (GeoContext, GeoContextUnresolved, ResolvedGeoContext, GeoHierarchyLevel), context types (CanonicalCountryContext, CanonicalLocaleContext, CanonicalCurrencyContext), descriptor types (CanonicalActionDescriptor, CanonicalPageDescriptor, CanonicalFlowDescriptor), plus all prior types (CanonicalOrder, CanonicalListing, CanonicalProviderProfile, etc). Closed CanonicalVertical 20-value union type. `CANONICAL_VERTICALS` const array + `isCanonicalVertical()` type guard + `toViolationVertical()` helper. `isVerticalEntity()` for discriminated union narrowing. Zero `as CanonicalVertical` casts — all validation uses type guards.
- **Geo Hierarchy Engine** (`src/engines/geo/geo-hierarchy-engine.ts`): Foundation-critical context engine. Resolves GPS coordinates → structured GeoContext (country→region→city→district→postal→coordinates). Uses Nominatim reverse geocoding. 13 country defaults (AE, SA, MA, EG, TN, TR, GB, FR, US, IN, SN, CI, CM). `GeoContext` (resolved) and `GeoContextUnresolved` (explicit failure typing — never silent defaults). Confidence scoring (high/medium/low/unresolved). 5-minute TTL cache. `resolveGeoContext()` async + `resolveGeoContextFromCountryCode()` sync. `isResolved()` type guard. Registered in engine-registry Tier 1.
- **Platform Governance Engine Layer** (`src/engines/governance/`): 13 governance engines registered in Tier 1: VerticalIsolationEngine (cross-vertical contamination blocking), TaxonomyGovernanceEngine (category validation from CATEGORY_TREE), MediaRelevanceEngine (media validation scoring with stock/watermark/quality/cross-vertical checks), TextIntegrityEngine (length/encoding/placeholder/overflow per 18 text contexts), LayoutIntegrityEngine (DS token enforcement, overflow/touch-target detection, page-family rules), PageOpenEngine (route→paint lifecycle tracking with timeout classification), ActionWiringEngine (CTA registry with dead-click detection), RuntimeHealthEngine (subscription health, heartbeat, failure classification), FlowClosureEngine (typed state machine for 36 critical flows), BannerStrategyEngine (country/religion/season/cuisine-aware scoring), LocalizationEngine (country/currency/locale registries with 10 countries + 12 currencies), AutoRemediationEngine (auto-fix for media/banner/CTA violations), AntiConflictEngine (unified governance summary across all violation types). All engines extend BaseEngine, emit via platform bus, produce typed GovernanceViolation records.
- **Control Room Governance Tab**: Live dashboard showing violation counts by severity/type, page-open stats, action-wiring metrics, runtime health, flow closure rates, auto-remediation stats, and recent violations feed. Auto-refreshes every 10s.
- **Super App Bridge** (`src/lib/super-app-bridge.ts`): Cross-module bridge actions — bridgeContactProvider, bridgePayNow, bridgeBookNow, bridgeRequestDelivery, bridgeOpenSupport, bridgeShareListing, bridgeLaunchRoute, bridgeCreateConversation, bridgeAttachPaymentContext, bridgeAttachOrderContext, bridgeAttachLiveLocation. All event-driven with canonical payloads.
- **Runtime Data Pipeline** (`src/lib/platform/runtime-pipeline.ts`): Real-time event intake, normalization (12 categories), prioritization (4 levels), enrichment, deduplication (5s TTL), retry (exponential backoff, 3 max), dead-letter queue, telemetry (throughput/latency/category breakdown), audit log (500 entries), replay capability. `runtimePipeline` singleton.
- **Module Health System** (`src/lib/platform/module-health-system.ts`): Per-module health (online/degraded/offline), latency tracking, error rate, missing dependencies, data freshness, queue backlog, failed events, broken UI surfaces, broken actions, policy violations, security warnings. Global snapshot across all pillars. `moduleHealthSystem` singleton.

## 25 Critical System Layers (`src/lib/systems/`)
All layers import from canonical `platform-bus`, emit colon-notation events, zero `as any` casts, zero duplicates.
- **L1 Design System**: Spacing/typography/color/elevation/animation/grid/radius tokens, component registry, breakpoints. Design system barrel: `src/components/ui/design-system.ts` — canonical exports for AppCard, AppText, AppPrice, AppChip, AppSection, AppToolbar, AppBottomBar, Badge, StatCard, EmptyState, ErrorState, LoadingState, PageShell, ResponsiveGrid, SmartActionCard, SectionHeader, Skeleton*, StatusChip, ListRow, SectionBlock, QuickActionGrid. Design tokens: `src/config/ui.ts` exports COLOR (CSS-var backed brand+semantic), ACCENT (10-color palette), LINE_HEIGHT, DENSITY, TEXT, ICON, BUTTON, CARD, etc. CSS: `src/index.css` (4186+ lines) — full card type system, text clamping, grid system, responsive utilities, unified harmony layer. ESLint: `AppPageShell` deprecated (warns), direct Supabase/localStorage access forbidden.
- **L2 Navigation System**: 5 pillars (dashboard/radar/orbit/wallet/me), deep link patterns, quick actions, transition history
- **L3 Permission Framework**: 10 roles, 13 permissions, 11 scopes, ownership rules per resource, visibility levels
- **L4 Pricing Engine**: Commission tables per vertical+seller type, delivery fees, tax rates (14 countries), loyalty discounts, refund calculator
- **L5 Growth Engine**: Loyalty tiers (bronze→platinum), referral system, coupon validation, abandoned cart detection
- **L6 Seller OS**: Dashboard metrics, performance scoring, seller levels, payout calculation, milestone events, low stock alerts
- **L7 Delivery System**: Courier dispatch (nearest/round_robin/broadcast), ETA calculation, proof-of-delivery, position tracking
- **L8 Realtime Engine**: WebSocket channels, presence tracking, message dedup, ordered delivery, exponential reconnect backoff
- **L9 Offline System**: Pending action queue, cache TTLs, conflict resolution (server/client/merge), sync status
- **L10 Search Engine**: Cross-domain unified search (shops, products, properties, services, profiles). Client-side: `search-engine/` pipeline with fetchers per domain, `search-store.ts` Zustand store, `UnifiedSearchBar` (hero/compact/fullscreen variants), `SearchFilters` (type/rating/price), `search-suggestions.ts` (recent + popular + contextual). Server-side: `search-global` edge function for cross-table search with ranking and filters. `search_analytics` table tracks popular searches. PostgreSQL trigram indexes on key searchable tables. `SearchResultsPage` groups results by type with filters.
- **L11 Analytics Engine**: Event buffer, 3 standard funnels, feature flags, A/B testing, bus listener auto-tracking
- **L12 i18n System**: 30+ locales, 21 currencies, 14 country configs, RTL detection, address formats, phone formatting, currency conversion
- **L13 Compliance Engine**: 5 KYC levels (none/basic/standard/enhanced/full), AML screening, transaction limits, GDPR exportable fields, data retention policies. **Unified Provider Model** (Task #139): `identity.providers` table unifies all provider types (restaurant, hotel, taxi_driver, delivery_driver, service_provider, commerce) with common fields (display_name, location, bank, commission, rating, KYC status) + JSONB metadata for vertical-specific data. `identity.kyc_documents` tracks uploaded verification documents. KYC pipeline: upload → pending → admin review (Edge Function `kyc-review`) → approved/rejected → auto-recalculate level → notification. Admin KYC Review at `/admin/kyc`. KYC gates via `useKycGate(level)` hook + `KycRequiredSheet` UI component. Onboarding wizards: `/onboarding/hotel` (6 steps), `/onboarding/taxi` (5 steps), `/onboarding/service-provider` (5 steps). ProCompliance page wired to upload docs to Supabase Storage `kyc-documents` bucket (private, signed URLs only). Onboarding media (photos, portfolio) stored in separate `onboarding-media` bucket (public). KYC gates integrated into: listing publish (basic), delivery assignment (basic), ride accept (basic), wallet transfer >100 AED (standard), withdrawal (enhanced), boost/advertising campaigns (standard). `KycRequiredSheet` rendered in wallet and boost UX flows for interactive blocking. Backend kyc-review emits `kyc:status_changed` via Supabase Realtime broadcast for client-side reactivity. Admin RLS on providers table via authenticated role-based policy (admin/super_admin/compliance_officer/moderator). Cookie consent system (`src/lib/consent/cookie-consent.ts` + `CookieConsentBanner.tsx`) with category-based consent (necessary/analytics/marketing), localStorage persistence, consent-gated PostHog/Sentry initialization, DB audit in `cookie_consent_log`. GDPR export edge function (`gdpr-export/index.ts`) for comprehensive multi-table JSON download (Art. 20). GDPR account deletion edge function (`gdpr-delete-account/index.ts`) with anonymization, storage cleanup, 30-day grace period (Art. 17). Immutable `financial_audit_trail` table (no UPDATE/DELETE). PSD2 SCA: 3D Secure forced for EU currencies/countries in `create-stripe-intent`. Marketing preferences page at `/settings/marketing` (channel × type matrix). CGU v2.0 and Privacy Policy v2.0 with table of contents (14 sections each). Migration: `20260414900000_legal_compliance.sql`.
- **L14 Admin System**: 7 admin roles, audit logging, support tickets with SLA deadlines, platform metrics dashboard
- **L15 Notification System**: 13 templates, 5 channels (push/in_app/sms/email/whatsapp), quiet hours, throttling, batch send
- **L16 Identity Graph**: Multi-provider identity, trust/risk scoring, device fingerprinting, identity merge, suspicious activity detection
- **L17 Moderation System**: Content policies per target type, strike system, priority calculation, ban/mute/shadowban
- **L18 Catalog Engine**: Cross-vertical catalog validation, required attributes per vertical, inventory alerts, SEO slugs, cross-listing
- **L19 SLA Engine**: 3 default policies (support/delivery/seller), escalation chains, penalty rules, breach detection
- **L20 Smart Home**: IoT devices (9 categories), guest access codes, automation rules, device health monitoring
- **L21 Component Library**: Toast/bottom-sheet/empty-state/skeleton/stepper/filter-chip/pull-to-refresh/infinite-scroll/swipe-action configs
- **L22 Automation Engine**: 4 built-in workflows (order lifecycle/delivery tracking/seller payout/KYC review), trigger conditions, step chaining
- **L23 Multi-tenant System**: 5 plan tiers (free→enterprise), quotas, team members with 5 roles, branding, trial management
- **L24 API Gateway**: 15 REST endpoints, 4 rate limit tiers, API keys with scopes, webhook subscriptions, metrics
- **L25 Premium UX**: 6 page transitions, 8 micro-interactions, 7 gesture configs, haptic patterns, skeleton shimmer

**Schema Registry**: 58 total entries (33 original + 25 system layers) in `src/lib/schema/schema-registry.ts`
**Canonical Events**: 195+ events in `src/lib/schema/canonical-events.ts` — all colon notation, zero dot notation

## Multi-Platform + Dual-Experience Architecture (Block 2)
- **Platform Capability Layer** (`src/lib/platform/platform-capability-layer.ts`): Unified device abstraction for 15 capabilities (camera, mic, geo, push notifications, file upload, contact sync, QR scan, biometric auth, share, clipboard, deep links, payment methods, vibration, orientation, network info). Each capability: detection, permission request, fallback method, status tracking. `platformCapabilities` singleton. `executeWithFallback()` for graceful degradation.
- **Responsive System** (`src/lib/platform/responsive-system.ts`): Breakpoint-aware layout engine (xs/sm/md/lg/xl/2xl). 3 device classes (mobile/tablet/desktop), 3 layout modes (mobile_stack/tablet_hybrid/desktop_multi). Auto-installed resize/orientation listeners. Hooks: `useDeviceContext()`, `useLayoutConfig()`, `useBreakpoint()`, `useIsDesktop()`, `useIsMobileDevice()`, `useIsTablet()`. Utilities: `responsiveValue()`, `getResponsiveColumns()`, `getResponsiveSpacing()`, `getTypography()`. Typography scale per device class.
- **Dual Experience** (`src/lib/platform/dual-experience.ts`): Client mobile vs Provider desktop vs Admin experience routing. 3 experience modes with role-based module visibility matrix (10 client modules, 11 provider modules, 9 admin modules). Per-module mobile/desktop visibility flags. Screen adaptations per module (Orbit: stack→split, Wallet: quick_actions→full_finance, Radar: discovery→operations). Functions: `resolveExperienceMode()`, `getExperienceConfig()`, `getModuleVisibility()`, `getBottomNavModules()`, `getSidebarModules()`.
- **Desktop Shell** (`src/components/layout/DesktopShell.tsx`): Navy/Gold sidebar + multi-panel desktop layout. Collapsible sidebar (240px↔64px) with active state, badges, smooth transitions. Side panel support for split views. Conditional rendering based on layout config.
- **Adaptive Layout Components** (`src/components/layout/AdaptiveLayout.tsx`): `AdaptiveContainer` (responsive max-width), `AdaptiveSplit` (split↔stack based on layout.showSplitView), `AdaptiveGrid` (responsive columns with auto-fill), `AdaptiveModal` (fullscreen on mobile, dialog on desktop), `AdaptiveList` (cards on mobile, table on desktop), `AdaptiveNav` (bottom bar when no sidebar), `useAdaptiveValue()` hook.

## SEO & Performance Optimization
- **Title**: "Easy-Locs — Food, Services, Taxi, Hotel in One App | 190+ Countries" (optimized, keyword-rich)
- **Meta Description**: 160 chars, English, SEO-optimized with value proposition
- **Meta Robots**: `index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1`
- **OG/Twitter Tags**: Full set including og:image:alt, twitter:image:alt, twitter:site
- **Hreflang Tags**: 9 alternates (fr, en, es, de, it, pt, ar, ja, x-default) for international SEO
- **Structured Data**: Organization + WebSite + SoftwareApplication + WebPage + BreadcrumbList + FAQPage (JSON-LD)
- **sitemap.xml**: 90+ URLs with lastmod dates; build-time plugin generates split sitemaps with lastmod
- **robots.txt**: Allows all public discovery pages, blocks private (wallet/admin/settings/auth), sitemap reference
- **CDN Cache Headers** (`public/_headers`): Immutable for versioned assets, 30d for images, 5min for HTML
- **Security Headers**: HSTS (preload), X-Frame-Options, X-Content-Type-Options, CSP (script/style/img/font/connect), Referrer-Policy, Permissions-Policy
- **manifest.json**: Full super-app description, proper categories, lang/dir/id fields
- **PWA Icons**: Optimized (192x192: 6KB, 512x512: 22KB) + favicon-16x16, favicon-32x32
- **Homepage SEO Content**: 800+ words noscript fallback with semantic HTML (header/section/nav/footer), H1/H2 hierarchy, internal navigation links to verticals and cities
- **Accessibility**: Skip-to-content link, aria labels, proper alt text on public images, focus management
- **Image Lazy Loading**: All non-critical images use `loading="lazy"` with width/height for CLS prevention
- **Core Web Vitals**: `src/lib/platform/web-vitals.ts` — tracks FCP, LCP, CLS, TTFB, INP at boot
- **Code Splitting**: Route-based + feature-based + vendor chunking via Vite manualChunks
- **Deferred Loading**: All non-critical systems use `requestIdleCallback` with timeouts (sentry 2s, web-vitals 4s, monitoring 8s, events 10s, E2EE 12s)
- **Passive Touch Listeners**: SwipeableMain uses native passive event listeners for jank-free scrolling
- **CSS Containment**: `contain: layout style` on bottom nav + utility classes
- **touch-action: manipulation**: Applied to all interactive elements — eliminates 300ms tap delay
- **Content Visibility**: `.render-offscreen` for below-fold sections, `.render-critical` for above-fold
- **GPU Scroll**: `.scroll-gpu` for smooth momentum scrolling with `overscroll-behavior: contain`
- **Module Preload Polyfill**: Enabled in Vite build for faster chunk loading
- **Reduced Motion**: All animations respect `prefers-reduced-motion: reduce`
- **Font Loading**: Non-render-blocking (print/onload pattern) + noscript fallback + font-display:swap via Google Fonts

## WebRTC & Calls Infrastructure (Task #105)
- **CallManager** (`src/lib/call-manager.ts`): Thin orchestrator composing atomic call units (ICE config, signaling, media, call-db, types, network-quality, recorder). Handles 1:1 calls with WebRTC peer connections, ICE candidate exchange via Supabase Realtime signaling, automatic reconnection attempts, and proper cleanup.
- **TURN/STUN Configuration**: `get-turn-credentials` edge function supports 3 providers via `TURN_PROVIDER` env var: `twilio` (Twilio NTS API), `metered_api` (Metered.ca REST API), `static` (fallback TURN/STUN servers). Env vars: `TURN_PROVIDER`, `TURN_USERNAME`, `TURN_CREDENTIAL`, `TURN_API_KEY`, `TURN_DOMAIN`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`.
- **Network Quality Monitoring** (`src/lib/call/network-quality.ts`): RTCPeerConnection stats polling every 2s — measures RTT, jitter, packet loss %, bitrate, candidate type (relay detection). Quality score computed as weighted composite → labels: excellent/good/fair/poor/critical. Integrated into CallManager with `onQualityUpdate` callback; UI shows quality badge in call screen.
- **Call Recording** (`src/lib/call/call-recorder.ts`): MediaRecorder-based with dual-party consent enforcement. Chunked capture (1s timeslice), MIME negotiation (WebM/Opus preferred). Upload to Supabase Storage (`call-recordings` bucket) with signed URL generation. `recording_path`, `recording_duration_ms`, `recording_consent` columns in `call_logs`.
- **Screen Sharing**: CallManager `startScreenShare()`/`stopScreenShare()` — acquires display media, replaces video sender track, auto-restores camera on screen share end. Connected to OrbitCallScreen menu.
- **Group Calls** (`src/lib/call/group-call-manager.ts`): Mesh WebRTC for up to 8 participants. Supabase Realtime broadcast signaling on `group-call:{roomId}` channel. Per-peer quality monitors. Types in `group-call-types.ts`, Zustand store in `group-call.store.ts`. `GroupCallScreen.tsx` component with adaptive grid layout.
- **Push Notifications for Calls** (`src/lib/push/call-push-handler.ts`): FCM push with `incoming_call` payload type. `send-call-push` edge function wraps `send-push-notification` with call-specific payloads (incoming/missed/ended actions). High priority with accept/decline actions.
- **Enhanced Call History**: `call_logs` table extended with `recording_path`, `recording_duration_ms`, `recording_consent`, `quality_score`, `quality_label`, `network_type`, `used_relay`, `group_room_id`, `participant_count`, `ended_reason`. `group_call_rooms` and `group_call_participants` tables with RLS policies. Migration: `20260414800000_call_infrastructure.sql`.
- **Call Store** (`src/stores/orbit/call.store.ts`): Extended `ActiveCall` with `qualityScore`, `qualityLabel`, `usingRelay`, `isRecording`, `isScreenSharing`. Store methods: `setQuality()`, `setUsingRelay()`, `setRecording()`, `setScreenSharing()`.

## Visual Design System (Storybook + Chromatic)
- **Storybook 8** installed with React/Vite framework, a11y addon, interactions addon
- **Stories** (`src/stories/`): Button (all 8 variants, sizes, loading, icons), Input (text, email, password, textarea, form groups), Card (AppCard 5 variants, status, loading), StatCard (KPIs, animated counters, grid), SmartActionCard (navigation cards, counts, dashboard grid), MobilePageHeader (back nav, actions, subtitles), List (tenant list, payment list, scrollable, empty state)
- **Chromatic** configured for visual regression: 3 viewport sizes (375px mobile, 768px tablet, 1440px desktop). Requires `CHROMATIC_PROJECT_TOKEN` env var to run.
- **Scripts**: `npm run storybook` (dev), `npm run build-storybook`, `npm run chromatic`
- **Config**: `.storybook/main.ts`, `.storybook/preview.ts`, `chromatic.config.json` (repo root)
- **Backgrounds**: Navy (brand), Dark, Light, White presets for all stories

## Sentinel Core — Central Surveillance System (`src/core/sentinel/`)
Production-grade central surveillance layer. 25 TypeScript files, 3,623 lines + 220-line SQL migration (16 tables). Boots deferred at 22s after app start (t7 stage in useMasterAppBootstrap).

**Motto: WATCH → VALIDATE → BLOCK → HEAL → RE-AUDIT → RELEASE**

### Registries (7 registries, database-backed)
- **Engine Registry**: 14 sentinel monitoring engines + 6 consolidated domain engines bridged from engine-registry. Heartbeat tracking, health snapshots, status management. Domain vertical engines (food, hotel, etc.) consolidated into TaxonomyEngine configurations
- **Cron Registry**: 25 jobs with schedule presets (1m→24h), lock keys, collision detection, failure tracking
- **Source-of-Truth Registry**: 14 critical field mappings. Conflict detection (no dual authority)
- **Taxonomy Registry**: Path validation, alias resolution, orphan detection, conflict scanning
- **Page Registry**: Route-based, orphan/duplicate canonical detection, SEO/perf tracking
- **Card Registry**: Compliance auditing (data source, states, route), non-compliant detection
- **Workflow Registry**: Durable workflow tracking with runs, state history, completion/failure

### Core Engines
- **Conflict Engine**: 5 built-in scanners (source-truth, taxonomy, cron, SEO, route). Per-domain scoring, auto-fix detection
- **Validation Engine**: 14-stage pipeline (normalize → parse_type → schema → taxonomy → geo → time → media → state → owner → source_of_truth → invariant → quality_score → conflict_check → save_or_reject)
- **Health Engine**: Heartbeat collection, stale detection, global status (healthy/degraded/unhealthy)
- **Healing Engine**: 12 safe auto-fix types + 6 unsafe (review_required). Rollback support, review queue
- **Workflow Engine**: Durable workflows with retry, timeout, compensating actions, idempotency keys
- **Cron Orchestrator**: Central scheduling with resource locking, dead-letter queue, timeout enforcement
- **Audit Engine**: 19 audit types with frequency scheduling (1min→24h). Event-triggered audits on deploy/schema/migration/taxonomy
- **Quality Gate**: Blocks on critical conflicts, broken invariants, stale heartbeats. 9 checkpoints (build/deploy/migration/import/taxonomy/media/banner/route/schema)
- **Incident Engine**: Auto-open, dedup, recurring detection, severity tracking, category filtering
- **Telemetry Engine**: Event emission, metric gauges/counters, system snapshots
- **Scoring Engine**: Weighted global score (health 20%, conflict 20%, audit 15%, invariant 15%, incidents 10%, engines 10%, quality gate 10%)
- **Report Engine**: Full 10-section final report (A→J as per spec): engine inventory, cron inventory, flow health, source-of-truth map, conflict report, page health, security health, maintenance health, global scores, verdict

### Invariant Engine
9 built-in invariants: GLOBAL_001-004 (heartbeat, cron, pages, source-of-truth), TAXONOMY_001-002 (path validity, alias conflicts), DASHBOARD_001 (card compliance), SEO_001-002 (metadata, duplicates)

### Database (16 tables in `sentinel` schema)
engine_registry, cron_registry, source_of_truth_registry, invariant_registry, conflict_log, audit_runs, engine_health_snapshots, job_runs, incident_log, healing_actions, workflow_registry, workflow_runs, taxonomy_registry, taxonomy_aliases, page_registry, card_registry

### Verification Master Block (`src/core/sentinel/verification/`)
8-phase proof system (1,394 lines, 3 files). Executes: IDENTITY CHECK → POLICY CHECK → START DURABLE WORKFLOW → EMIT TRACES/METRICS/LOGS → QUALITY GATE → CONTROLLED RELEASE → CONTINUOUS RE-AUDIT → SAFE AUTO-HEAL. Produces full A-through-Q report (17 sections). Features: 11 state machine definitions, 20 E2E flow definitions, 25 domain coverage, conflict injection tests, validation acceptance/rejection tests, healing safe/unsafe tests, page/card/CTA registration + audit, SEO/perf/security scoring. `verificationRunner.runFullVerification()` returns `VerificationFinalReport`. Wired into `sentinelCore.runVerification()`.

### Master Orchestrator (`sentinel-core.ts`)
Boots all registries, registers 31 engines + 14 source-of-truth mappings + 9 invariants + 25 cron jobs. Heartbeat every 30s with auto-degradation. Initial audit at boot+8s. Pipeline: VALIDATE → CHECK INVARIANTS → START DURABLE WORKFLOW → EMIT TELEMETRY → APPLY QUALITY GATE → PUBLISH → CONTINUOUS RE-AUDIT → SAFE AUTO-HEAL. Exposes `runVerification()` for full proof report generation.

## Omega Intelligence Core — Central Brain (`src/core/omega/`)
Total intelligence layer. 14 files, 2,570 lines. 10 engines + master orchestrator + type system + persistence layer. Boots deferred at 28s after app start (t8 stage). Intelligence loop runs every 60s. Full DB persistence: all 10 engines write through `omega-persistence.ts` (11 tables) and restore from DB at boot. Strict typed interfaces throughout (no `Record<string,unknown>`).

**Motto: SEE → UNDERSTAND → PROVE → DECIDE → BLOCK → HEAL → OPTIMIZE → PREDICT → EVOLVE → RE-AUDIT**

### Engines (10 engines)
- **Knowledge Graph Engine** (`knowledge-graph/`): Universal graph with 39 node types (USER through OPPORTUNITY_SIGNAL) + 20 edge types (BELONGS_TO through RECOMMENDS). Path finding (BFS), orphan detection, broken edge detection, duplicate detection, type indexing. Bounded: 50K nodes / 200K edges with LRU eviction
- **Memory Engine** (`memory/`): System memory for audits, incidents, regressions, conflicts, optimizations, healing actions, patterns, root causes. Category + domain indexing, recurring pattern detection, root cause clustering, unstable domain identification, improvement history tracking, TTL-based expiry. Bounded: 5K entries
- **Decision Engine** (`decision/`): Central decision-making with weighted scoring (severity, criticality, user/business/performance/revenue impact, dependency reach, regression risk). 10 decisions: BLOCK_NOW, FIX_NOW, SAFE_AUTO_HEAL, ESCALATE, DEFER, OBSERVE, OPTIMIZE_NEXT, ROLLOUT_GRADUALLY, REJECT_CHANGE, REQUIRE_HUMAN_REVIEW. Bounded: 2K decisions
- **Priority Engine** (`priority/`): Weighted priority scoring formula (severity × user_impact × business_impact × recurrence × confidence × dependency_reach). 5 bands: now/next/later/observe/ignore. Top-N retrieval, recalculation, type filtering. Bounded: 2K items
- **Prediction Engine** (`prediction/`): 14 prediction types (engine_failure through payment_friction). Risk + confidence scoring, outcome tracking (confirmed/false_alarm), precision/recall metrics, high-risk filtering. Specialized predictors: engine failure, workflow timeout, demand spike. Bounded: 1K predictions
- **Business Opportunity Engine** (`business-opportunity/`): 9 signal types (high_demand_zone through launch_candidate). Geo priority maps, category scoring. Detectors: high demand zones, weak supply, high value categories, vertical expansion, content enrichment. Bounded: 1K signals
- **Adaptive UX Engine** (`adaptive-ux/`): 9 rule types (card_reorder through cta_focus). Context-driven adaptation with measurable/reversible/gradual constraints. Specialized: card ordering, dashboard adaptation, search ranking, preload strategy. Bounded: 500 rules
- **Self-Improvement Engine** (`self-improvement/`): Weakness reporting + clustering, 6-stage cycle (proposed → simulated → tested → applied/rolled_back/rejected). Safe-only auto-apply with before/after scoring + re-audit. Success rate tracking. Bounded: 500 cycles
- **Incident Response Engine** (`incident-response/`): Autonomous incident lifecycle (detected → classified → mitigating → re_auditing → resolved/escalated). 15 safe mitigations, 8 unsafe mitigations. Severity-based prioritization. Bounded: 1K actions
- **Code Evolution Engine** (`code-evolution/`): 15 issue types (complexity through stale_utility). Safe action classification, tech debt scoring. Suggestion lifecycle: proposed → approved → applied/rejected. Bounded: 500 suggestions

### Master Brain (`omega-core.ts`)
Boots all 10 engines, seeds knowledge graph with 25 domains + 37 system engines. Intelligence loop every 60s: memory cleanup, orphan detection, unstable domain escalation, incident classification, safe code suggestion auto-approval, health checks every 5 loops. `generateIntelligenceReport()` produces full scored report with sub-scores, verdict, and next actions. Weighted scoring: incident_response 15%, decision 12%, prediction 12%, priority 10%, self_improvement 10%, code_evolution 10%, knowledge_graph 8%, memory 8%, business_opportunity 8%, adaptive_ux 7%.

### Database (17 tables in `omega` schema)
knowledge_nodes, knowledge_edges, memory_entries, decision_log, prediction_log, priority_queue, opportunity_signals, adaptive_ux_rules, improvement_cycles, incident_response_actions, code_evolution_suggestions, intelligence_reports, regression_log, drift_log, release_registry, baseline_registry, optimization_runs, telemetry_index

## Universal Business Core (`src/lib/business-core/`)
Single source of truth for all business verticals (hotel, restaurant, service, delivery, real estate, shop, health, flight, grocery, pet, fitness).

### Types (`business-types.ts`)
BusinessCore entity with full identity/contact/location/media/operation/meta fields. Vertical types: HotelProfile, HotelRoom, HotelRatePlan, HotelAmenity, RestaurantProfile, MenuCategory, MenuItem, MenuModifier, DeliverySettings, ServiceProfile, ServiceItem, ServiceSlot, ProviderTeamMember. Supporting: PricingRule, BusinessPolicy, Review, TrustSignals, OnboardingStep, BusinessQualityScore, MediaAsset, AvailabilityCalendar. 14-step onboarding constant (ONBOARDING_STEPS), vertical module map (VERTICAL_MODULES).

### Services (`business-service.ts`)
7 service objects: businessService (CRUD + search + status), mediaService (entity linking, primary marking), availabilityService (calendar CRUD, blackouts, bulk update), reviewService (CRUD + averages), pricingService, policyService, trustSignalService, qualityScoreService.

### Onboarding Engine (`onboarding-engine.ts`)
14-step guided wizard with per-step validators. Steps: identity, location, media, category, catalog, pricing, availability, policies, contact, hours, team, verification, review, go_live. 6 required steps gate publication. Auto-save progress, validation errors, go-live check.

### Quality Score Engine (`quality-score-engine.ts`)
4-component weighted scoring: completeness (30%), media (25%), consistency (20%), trust (25%). Visibility tier mapping (boosted/normal/limited/degraded/hidden). Publish-ready threshold: overall >= 40, completeness >= 50.

## Trust / Ranking / Anti-Fake Engine (`src/lib/trust-engine/`)
Autonomous quality system: proves business quality, ranks intelligently, detects fake/scam, auto-corrects or blocks.

### Trust Score Engine (`trust-score-engine.ts`)
6-component weighted trust: data (20%), media (20%), behavior (20%), review (20%), reliability (10%), fraud_inverse (10%). Visibility auto-update on score change. 5 visibility levels with ranking weights.

### Ranking Engine (`ranking-engine.ts`)
6-factor ranking: trust (35%), proximity (20%), popularity (15%), availability (10%), response_speed (10%), freshness (10%). Haversine distance calculation. Batch ranking with sort.

### Anti-Fake Engine (`anti-fake-engine.ts`)
5 fraud detection modules: image fraud (mismatch, stock, duplicate), data anomaly (auto-generated names, short descriptions), behavior anomaly (artificial traffic), review fraud (burst detection, same-user patterns, identical ratings), duplicate business (same phone, same address). Auto-action by severity: low→warning, medium→visibility_downgrade, high→listing_limited, critical→immediate_block.

### Behavior Engine (`behavior-engine.ts`)
6 event types tracked: click, conversion, bounce, repeat, abandonment, cancellation. User signal processing with weighted trust/fraud impact.

### Proof Log Engine (`proof-log-engine.ts`)
Total traceability: trust changes, visibility changes, fraud actions, onboarding steps. Before/after state, triggered_by (system/user/admin), timestamped.

## Live System Monitor (`src/lib/live-monitor/`)
Real-time engine activity monitoring, proof system, zero silent failure.

### Engine Heartbeat (`engine-heartbeat.ts`)
Per-engine ping tracking. Status resolution: alive (<30s), slow (30-60s), dead (>60s). In-memory + DB dual storage. Global health check.

### Execution Log (`execution-log.ts`)
Per-action logging with engine name, action type, entity ID, status, duration. Error tracking. Stats aggregation (total/success/failed/avgDuration).

### System Metrics (`system-metrics.ts`)
5-min window metrics capture: requests, executions, avg latency, error rate, queue depth. History retrieval for graphing.

### Task Engine (`task-engine.ts`)
AI-driven task creation and execution. Priority levels (low/medium/high/critical). AI decisions with confidence scoring.

### Self Check (`self-check.ts`)
Per-engine self-verification: DB access, heartbeat status, memory usage. Batch self-check across all engines.

## Pro Back Office Console (`src/pages/pro/`)
Universal professional back office for all business verticals. 16 modules under `/pro/*` route with nested layout.

### Shell (`ProShell.tsx`)
Navy/Gold sidebar layout with 16 nav items, collapsible sidebar (240px↔64px), top bar with search + quick create + notifications + user menu. Business switcher ready.

### Modules (16 pages)
- **Dashboard** (`ProDashboard.tsx`): 10 widgets (revenue, orders, response time, profile score, media quality, availability, payouts, reviews, top items, alerts) + action cards + onboarding progress
- **Onboarding** (`ProOnboarding.tsx`): 14-step wizard with progress bar, step navigator, per-step validation, required/optional marking
- **Profile** (`ProProfile.tsx`): Full business profile editor (identity, contact, hours, location, settings) with completeness score + trust status
- **Media Studio** (`ProMedia.tsx`): Logo/cover upload, gallery management, quality scoring, category match warnings, 5 media sections
- **Catalog** (`ProCatalog.tsx`): Universal item builder with categories, search, quality scores, drag-reorder
- **Availability** (`ProAvailability.tsx`): Calendar view with month/week/day, blackout dates, peak pricing, capacity controls
- **Pricing** (`ProPricing.tsx`): Price list, dynamic rules, tax settings, promos, minimum order, client preview
- **Orders** (`ProOrders.tsx`): Incoming/in-progress/completed/cancelled with timeline, orbit link, revenue summary
- **Inbox** (`ProInbox.tsx`): Orbit-powered contextual messaging with quick replies, staff assignment, conversation threading
- **Reviews** (`ProReviews.tsx`): Rating breakdown, sentiment tags, response tools, trust metrics
- **Wallet** (`ProWallet.tsx`): Balance, payouts, transactions, commissions, refunds, multi-currency
- **Team** (`ProTeam.tsx`): Member management with 5 roles (Owner/Admin/Manager/Staff/Agent), permissions matrix
- **Analytics** (`ProAnalytics.tsx`): Revenue charts, top items, traffic sources, customer insights
- **Live Monitor** (`ProLiveMonitor.tsx`): Engine grid (12 engines), live activity stream, cron status (25 jobs), error panel, system metrics
- **Settings** (`ProSettings.tsx`): Notifications, integrations, localization, privacy/security, data/storage
- **Compliance** (`ProCompliance.tsx`): 6 verification steps, anti-scam protection, document upload

## God System — Self-Auditing Infrastructure (`src/lib/god/`)
Complete self-auditing, anti-conflict, auto-healing, continuous-monitoring infrastructure. 16 files, 5200+ lines. Boots deferred at 18s after app start via `useMasterAppBootstrap`.

### Core Systems (9 engines, all extend `BaseEngine`)
- **Canonical Content Graph** (`canonical-content-graph.ts`): 31 node types (USER through ENGINE_HEALTH), 14 edge types (BELONGS_TO through SYNCS_WITH), graph with orphan/broken-edge detection
- **Taxonomy God Engine** (`taxonomy-god-engine.ts`): Hierarchical taxonomy with dot-path notation (GLOBAL.FOOD.RESTAURANT.PIZZA.NEAPOLITAN), 13 families, 200+ paths, alias system, conflict detection, validation
- **State Machines** (`state-machines.ts`): 8 strict flow definitions — Listing, Order, Booking, Payment, Delivery, Message, Call, Ad Campaign. Transition validation, audit, dead-end/unreachable detection
- **Anti-Conflict Engine** (`anti-conflict-engine.ts`): Scans taxonomy conflicts, state machine integrity, source-of-truth violations, domain boundary overlaps, graph broken edges. 7 conflict modes (PREVENT → RELEASE)
- **Validation Pipeline** (`validation-pipeline.ts`): 11-stage pipeline: Normalize → Type → Taxonomy → Relation → Media → Geo → Time → State → Security → Quality → Conflict. Produces ACCEPTED/REJECTED/NEEDS_REVIEW verdict
- **Continuous Audit Engine** (`continuous-audit-engine.ts`): 7 built-in checks (health ping 1min, heartbeat 3min, conflict 5min, data integrity 10min, taxonomy 15min, graph 15min, state machines 20min). Event-triggered audits on deploy/schema/migration/taxonomy changes
- **Maintenance Engine** (`maintenance-engine.ts`): Safe auto-fix (slug, meta, index, banner expiry, thumbnail, cache) + unsafe review queue (record merge, bulk delete, payment). Dry-run + rollback support
- **Cron Orchestrator** (`cron-orchestrator.ts`): Central job registry with 25 pre-registered jobs. Dedup, resource locking, retry with exponential backoff, dead-letter queue, conflict prevention
- **Quality Gate Engine** (`quality-gate-engine.ts`): 10 checkpoint types (build/deploy/migration etc). Blocks on critical conflicts, broken state machines, failed audits. PASS/PASS_WITH_WARNINGS/BLOCKED verdict

### Omega Extensions
- **Observability Engine** (`observability-engine.ts`): God Score (weighted: taxonomy 15%, conflict 20%, state machines 15%, data integrity 15%, maintenance 5%, cron 10%, quality gate 10%, engines 10%). Incident management, system snapshots every 60s
- **Hyper Optimization Engine** (`hyper-optimization-engine.ts`): Performance budget enforcement, cache intelligence (multi-layer, hit rate, stale cleanup), optimization cycles with before/after scoring. 10 performance dimensions
- **Black Chamber** (`black-chamber.ts`): Worker identity management, policy enforcement (no-direct-db-write, no-multi-writer, no-unsafe-heal), proof trail, release gates
- **Past Control** (`past-control.ts`): Drift detection (9 categories), snapshot comparison, regression detection with threshold-based blocking

### Master Systems
- **God Audit** (`god-audit.ts`): Full 13-section audit report (health, engines, crons, taxonomy, data integrity, flows, pages, performance, SEO, security, conflicts, maintenance, verdict). Sections derive from live engine data
- **God Core** (`god-core.ts`): Master bootstrap orchestrating all 9 engines + 25 cron jobs. Continuous heartbeat (30s), auto-degradation detection, initial audit on boot (10s delay)
- **Index** (`index.ts`): Public API re-exporting all engines, types, and singletons

## Canonical Content Architecture (Strict Taxonomy + Media Truth)
- **Canonical Registry** (`src/lib/taxonomy/canonical-registry.ts`): 12 verticals (food, grocery, shops, services, health, fitness, property, stay, mobility, utility, beauty, experiences). Hierarchical: family → category → subcategory → canonical_type → canonical_subtype. Each type defines allowed media kinds, required/optional fields, allowed card templates, aliases. Index-backed lookups: `resolveAlias()`, `getNode()`, `isValidCategoryChain()`, `validateCanonicalNode()`, `getAllowedMediaKinds()`, `isCardTemplateAllowed()`.
- **Content Pipeline Types** (`src/domains/content-pipeline/types.ts`): Full pipeline stages: RawEntity → NormalizedEntity → CanonicalEntity → ValidatedEntity → PublishedEntity. 20+ enums: EntityLifecycleStatus, MediaLifecycleStatus, ConfidenceBand, ValidationGateId, LockType, QuarantineReason, JobStatus, AuditAction. Interfaces: MediaAsset, MediaAnalysisResult, QuarantineEntry, ReclassificationRequest, ReviewQueueItem, PipelineJob, AuditLogEntry, GateCheckOutput, PipelineResult, LegacyAuditResult.
- **Canonical Mapping Engine** (`src/services/canonical/mapping-engine.ts`): Raw → canonical mapping. Alias resolution first (high confidence), then vertical inference from signal patterns, then category/type inference. Outputs: vertical, category, subcategory, canonicalType, canonicalSubtype, canonicalPath, confidenceScore (0-1), confidenceBand (high ≥0.95, medium ≥0.80, low ≥0.50, rejected <0.50), ambiguityFlags, mapperVersion.
- **Alias Resolver** (`src/services/canonical/alias-resolver.ts`): 65+ source-label → canonical-path mappings. Handles ambiguous labels (wellness center, health center, restaurant & cafe). Deterministic, versioned, scored.
- **Media Truth Engine** (`src/services/media-truth/media-truth-engine.ts`): Per-vertical allowed media kinds. Validates: stock detection, watermark detection, format/size checks, media-kind classification, cross-vertical mismatch detection. `selectPrimaryMedia()` enforces: no stock as primary, no watermarked primary, no cross-vertical primary, preference for exterior/facade/listing_hero.
- **Multi-Gate Validation** (`src/services/validation/gate-runner.ts`): 7 sequential gates: schema, taxonomy, media, confidence, duplicate (Levenshtein + haversine geo), canonical_integrity, publish. `runAllGates()` produces PipelineResult with quarantine decisions.
- **Quarantine Engine** (`src/services/quarantine/quarantine-engine.ts`): Auto-quarantine on gate failure. Severity: critical (cross-vertical, canonical conflict), high (taxonomy, media mismatch), medium (low confidence, duplicate), low. Public exclusion for quarantined/rejected/raw/normalized statuses.
- **Lock Manager** (`src/services/locks/lock-manager.ts`): 6 lock types: taxonomy_lock, canonical_lock, media_lock, publish_lock, template_lock, relationship_lock. `canEditField()` checks field-level locks. Published entities get all 6 locks. Reclassification requires admin workflow when locks active.
- **Frontend Rendering Contracts** (`src/lib/rendering/contracts.ts`): `evaluateRenderContract()` checks vertical validity, canonical type, publish status, allowed templates. Type guards: `isRestaurantEntity()`, `isHotelEntity()`, `isClinicEntity()`, `isGymEntity()`, etc. `filterPublicEntities()` and `partitionEntities()` for list rendering.
- **Audit Logger** (`src/services/audit/audit-logger.ts`): Full audit trail: import, normalize, classify, validate, approve, reject, publish, quarantine, reclassify, media_assign/remove/lock, field_edit. Before/after state capture. Actor tracking (system/user/worker/admin).
- **Legacy Cleanup** (`src/services/legacy-cleanup/legacy-audit.ts`): `runLegacyAudit()` processes existing entities through full pipeline. Reports: passed, reclassified, quarantined, wrongMedia, duplicates, unresolved. Per-entity detail with old/new path comparison.
- **Database Migration** (`supabase/migrations/20260411_canonical_content_architecture.sql`): 20+ tables with enums, constraints, indexes, RLS. Tables: taxonomy_families/categories/subcategories, canonical_types/subtypes/aliases, raw/normalized/canonical_entities, entity_validation_results, entity_publish_states, media_assets/analysis/fingerprints, quarantine_queue, review_queue, reclassification_requests, pipeline_jobs, audit_logs. Views: public_published_entities, quarantined_entities, validation_dashboard. RLS: public reads only published+approved, service role full access.
- **ARCHITECTURE RULE**: No free-text categories anywhere. All taxonomy MUST come from canonical-registry.ts. No direct publish from raw/scraped data. Every entity must pass 7 gates before publication. Cross-vertical contamination is forbidden.

## Deep Sentry Observability (Atom-by-Atom)
- **Central Config** (`src/lib/analytics/sentry.ts`): DSN, smart tracesSampler (80% identity/wallet/orbit, 60% taxonomy/canonical, 40% navigation, 20% other), replay on error 100%, privacy scrubbing in beforeSend/beforeBreadcrumb (phone/email/OTP/token/card patterns), noise filtering (ResizeObserver, ChunkLoadError, NetworkError, AbortError)
- **Domain Helpers** (`src/lib/observability/sentry-helpers.ts`): `captureDomainError()`, `captureDomainWarning()`, `startDomainSpan()`, `addDomainBreadcrumb()`, `setDomainContext()`, `setSafeUserContext()`, `instrumentCriticalAction()`, `captureRenderMismatch()`, `captureInvalidRenderPath()`, `capturePipelineFailure()`, `scrubSensitiveData()`. 15 domains: identity, contacts, orbit, wallet, taxonomy, marketplace, radar, dashboard, provider, onboarding, public_seo, support, media, canonical, delivery
- **Domain Instrumentation** (`src/lib/observability/domain-instrumentation.ts`): Pre-built instrumentation for identity (OTP request/verify, login, session refresh), wallet (transfer, top-up, balance, checkout), orbit (message send, call start/end), contacts (sync), taxonomy (mapping, validation, publish), marketplace (listing import), provider (catalog update), radar (search)
- **Orbit Observability** (`src/lib/observability/orbit-observability.ts`): Now wired to Sentry — all orbit logs emit domain breadcrumbs, errors auto-capture to Sentry with orbit domain tag
- **Orbit Pipeline Resilience**: `ensureOrbitProfile` uses 8s timeout + catch-all with synthetic fallback (never blocks login). `fetchV2Conversations` throws on DB error so `Promise.allSettled` properly surfaces failures in UI. `safeCount` logs errors explicitly. RealtimeManager logs channel connection failures. Profile cache only set on successful upsert (transient failures auto-retry).
- **Orbit Message Dedup**: Three-layer fix: (1) `buildOptimisticTextMessage` accepts `_uiTempId` to reuse the UI-generated tempId instead of creating a second UUID, (2) `normalizeOrbitMessage` extracts `tempId` from `metadata._tempId` so realtime INSERT events can reconcile with the optimistic message, (3) `executeSendText` marks serverId as seen in dedup registry immediately after DB insert to prevent realtime echo duplication. `executeSendText` also skips store insert when the UI already inserted the optimistic message.
- **Render Contract Monitoring** (`src/lib/rendering/contracts.ts`): `validateCardRendering()` captures render mismatches and invalid render paths to Sentry with entity/vertical/template metadata
- **Pipeline Failure Capture** (`src/services/validation/gate-runner.ts`): `runAllGates()` captures pipeline failures with failed gate details to Sentry
- **Feature Error Boundary** (`src/components/FeatureErrorBoundary.tsx`): Enhanced with optional `domain` prop for domain-level tagging in Sentry error reports
- **Architecture Quality Gates** (`src/lib/observability/architecture-quality-gates.ts`): SSOT validation, domain boundary checks, bypass path detection — all gate failures emit Sentry warnings
- **Naming Convention**: `{domain}.{action}.{step}` — e.g. `identity.otp.verify`, `orbit.message.send`, `wallet.transfer.submit`, `taxonomy.entity.publish`
- **Privacy**: phone/email/OTP/token/card scrubbing in all Sentry events, breadcrumbs, and contexts. Sensitive field keys auto-redacted.

## Auto-Pilot Mondial Infrastructure
- **Structured Logger** (`src/lib/observability/structured-logger.ts`): JSON schema, 30+ `LogDomain` types, PII scrubbing, Sentry breadcrumbs/capture, `timed()` wrapper, domain-tagged, in-memory buffer. API: `structuredLogger.debug/info/warn/error/critical(domain, action, message, extra)`
- **Canonical Platform Event Bus** (`src/lib/platform-bus/index.ts`): Typed events, 60+ `PLATFORM_EVENTS` constants, pattern matching, history buffer, domain-to-log mapping. API: `platformBus.emit(name, domain, payload)` / `platformBus.on(pattern, handler)`
- **Legacy Platform Bus Bridge** (`src/lib/shared/platform-bus.ts`): Existing 240+ event types, notation bridge (dot↔colon), cross-module reactions (wallet↔orbit↔marketplace↔PM). Forward bridge to canonical bus for structured logging
- **Control Plane** (`src/lib/control-plane/`): Domain health scoring, incident engine (P0-P3), kill switches (19 defaults), feature flags (18 flags with rollout %), platform health summary
- **Domain Health** (`src/lib/control-plane/domain-health.ts`): Per-domain metrics (error rate, P95 latency, failing actions), 5-min sliding windows, health status (healthy/degraded/unhealthy/unknown), 25 tracked domains
- **Architecture Enforcement** (`src/lib/architecture/`): Domain boundary rules (7 domains, forbidden imports), 12 catalogued violations, architecture validator with grading (A-F), import boundary validation, domain coverage audit
- **Card Health Audit** (`src/domains/cards/card-health-audit.ts`): Card registry health monitoring, dead card detection, connection status computation, integration with domain-health and platform bus
- **Domain Error Boundaries** (`src/components/error-boundaries/DomainErrorBoundary.tsx`): 8 pillar-specific error boundaries with domain-tagged Sentry capture
- **Control Plane Admin** (`src/pages/admin/ControlPlanePage.tsx`): 6-tab admin dashboard (Health, Incidents, Kill Switches, Feature Flags, Architecture, Card Health). Route: `/admin/control-plane`
- **Audit Report**: `docs/AUDIT-AUTOPILOT.md` — 12 arch violations, 4 orphan cards, full P0/P1/P2/P3 classification

## Anti-Conflict Architecture Cleanup
- **Dead code removed**: `OrdersPage.tsx` (superseded by MyOrdersPage/CustomerActiveOrdersPage/MerchantOrdersPage), `NotificationPreferencesPage.tsx` (superseded by SettingsNotifications), `SettingsPaymentMethods.tsx` (superseded by SettingsWallet), `useOrbitComposerState.ts` (replaced by composerStore)
- **Deprecated code removed**: `sendTextMessage`, `loadConversationMessages`, `markMessageRead` removed from `messageService.ts` — all migrated to orbitDispatch pipeline. Only `sendSystemMessage` and `createCallSystemMessage` remain (system events bypass dispatch).
- **messageService.ts fixed**: Added missing `db` import from `src/services/db.ts`, removed unused supabase direct import
- **Composer index cleaned**: Removed commented-out `useOrbitComposerState` export reference
- **SSOT Rules enforced**: One source of truth per domain (identity=v2AuthStore, wallet=walletStore, orbit=orbitDispatch, taxonomy=canonical-registry, rendering=contracts.ts)

## Safe Auto-Healing System
- **Error Classifier** (`src/lib/auto-heal/error-classifier.ts`): Classifies errors by severity (critical/medium/minor) and domain (crash/payment/auth/network/ui/data). Determines action (rollback/fallback/retry/suggest/log/ignore). Filters ignorable patterns (ResizeObserver, ChunkLoadError, etc).
- **Runtime Healer** (`src/lib/auto-heal/runtime-healer.ts`): Deduplicates errors (5s window), logs to Sentry for criticals, provides `withAutoRetry()` for fetch operations (exponential backoff, 3 retries). Health report via `getHealerReport()`. Global listener via `installGlobalHealer()`.
- **FeatureErrorBoundary** (`src/components/FeatureErrorBoundary.tsx`): Wraps all 5 pillars. Auto-retries up to 2 times before showing fallback UI. Integrates with auto-heal system. Gold-themed "Try again" button.
- **Error Boundary Hierarchy**: `AppCrashBoundary` > `ChunkRecoveryBoundary` > `ErrorBoundary` > `FeatureErrorBoundary` (per pillar route).

## Component Library (src/components/ui/)
69 unified UI components. Key canonical components:
- **Button** (`button.tsx`): 8 variants (default/destructive/outline/secondary/ghost/link/premium/success), `loading` prop, `asChild` renders single-child Slot (no sibling spinner)
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
- **QR Pay** (`/pay/scan`): Scan user/shop/service QR → instant payment overlay
- **Orbit Chat Payments**: Send/Request buttons in chat, inline payment cards with live polling
- **Orbit Messaging Pipeline**: `orbitDispatch` → `executeSendText` → `insertMessage` → `chat_messages_v2`. Optimistic UI at T0+0ms, background DB persist + broadcast. Dual-channel realtime: broadcast (10-50ms) + postgres_changes (200-500ms). Real-time tables: `chat_messages_v2`, `conversations_v2`, `conversation_preferences` (all in `supabase_realtime` publication). Thread list auto-refreshes on `orbit:message_sent`, `orbit:message_received`, `orbit:thread_created`, `orbit:thread_updated` events + `conversations_v2` postgres changes.
- **Orbit Read Receipts**: `receipt.controller.ts` — flow-gate protected, throttled (2s), batch mark-read. Participants can mark-read via RLS policy `chat_messages_participant_mark_read` (uses `orbit_profiles_v2` join).
- **Orbit Message Actions**: Star, delete-for-sender, delete-for-all, hide-for-self, edit, disappearing messages. All mutations use read-merge-write pattern to preserve metadata.
- **Contact Picker**: `ContactPickerSheet` in `src/components/wallet/ContactPickerSheet.tsx`
  - Shows "On Easy Locs" contacts (with green badge) and "Phone Contacts" (with invite)
  - `InviteContactSheet` supports invite-only OR invite+send (pending payment link)
- **Resolution**: `resolvePayTarget` supports userId, orbitId, phone, walletId (email kept for backward compat but removed from UI)
- **Payment Links**: `src/lib/payments/payment-link-service.ts` — shareable links for send/request/invite
  - `createPaymentLink()` — creates link with QR + share URL
  - `createInvitePaymentLink()` — invite non-user with pending payment (held until registration)
  - `claimPaymentLink()` — atomic claim with status guard, phone validation, wallet transfer on claim
  - `cancelPaymentLink()` — creator can cancel pending links
- **QuickPay Sheet**: `src/components/wallet/QuickPaySheet.tsx` — 1-tap payment when recipient known
- **Smart Payment Hook**: `src/hooks/useSmartPayment.ts` — context-aware payment from any pillar
  - Sources: contact, orbit, qr, booking, service, shop, link
  - Auto-maps context type, builds PaymentRequest, routes through UnifiedPaymentSystem
- **Unified Payment System**: `src/payments/UnifiedPaymentSystem.tsx` — swipe-to-pay overlay
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

## Super App OS Architecture
The app operates as a modular operating system with 5 unified pillars:

### Core Infrastructure
- **Platform Bus** (`src/lib/shared/platform-bus.ts`): Central nervous system — 200+ event types, dot↔colon notation bridge, prefix listeners, global listeners, rolling event log
- **Super App Bridge** (`src/lib/super-app-bridge.ts`): Cross-pillar orchestrator — auto-invalidates React Query caches on any pillar event, installs Module Intelligence + Network Optimizer + Self-Pilot engines
- **Module Registry** (`src/lib/core/module-registry.ts`): Unified registry of all 14 modules across 5 pillars, tracks status/health/capabilities/dependencies per module
- **Data Pipeline** (`src/lib/core/data-pipeline.ts`): Generic runtime pipeline (input → normalize → validate → store → expose) with composable normalizers/validators
- **OS Status** (`src/lib/core/os-status.ts`): Aggregate health reporting, dependency graph, circular dependency detection

### Canonical Data Models (SSOT)
All domain types live in `src/domains/shared/canonical-types.ts`:
- **Identity**: `CanonicalOrbitProfile`, `CanonicalUserProfile`
- **Finance**: `CanonicalWalletState`, `CanonicalWalletTransaction`
- **Geo**: `CanonicalGeoPosition`, `CanonicalAddress`, `CanonicalRadarEntity`
- **Booking**: `CanonicalBooking` (food/hotel/service/property/event)
- **Communication**: `CanonicalMessage`, `CommunicationContext`
- **Dashboard**: `CanonicalDashboardSummary`, `DashboardActivityItem`
- **Status Machines**: `PaymentStatus`, `OrderStatus`, `DriverStatus`, `BookingStatus`
- Legacy barrel in `src/lib/types/domain.ts` re-exports all + deprecated aliases

### State Management (Zustand + React Context)
- `useWalletStore` — wallet balance, transactions, platformBus integration
- `useOrbitProfileStore` — canonical orbit identity
- `useRadarStore` — points of interest, map/list state
- `useLocationStore` — GPS, saved places, geolocation
- `useDiscoveryStore` — unified search/filter state
- `useAppStore` — persistent UI preferences
- `AuthContext` — Supabase session, organization, roles
- `RealtimeContext` — Supabase realtime subscriptions

### Smart Navigation
- **Navigation State Machine** (`src/stores/navigationStateMachine.ts`): FSM with pillar states, transition rules (soft/overlay/hard), context preservation per pillar
- **Smart Navigation Hook** (`src/hooks/useSmartNavigation.ts`): Intent-based navigation, overlay vs full-page transitions
- **Pillar Rules** (`src/lib/navigation/pillar-rules.ts`): Cross-pillar transition matrix
- **Return Origin** (`src/lib/navigation/return-origin.ts`): Smart back navigation across pillar boundaries

### Module Health Hooks
- `useModuleHealth(moduleId)` — single module health snapshot with live status updates
- `usePillarHealth(pillar)` — pillar-level aggregate health
- `useOSHealth()` — full OS health report with auto-refresh

### Core Engines (installed at boot via Super App Bridge)
- **Module Intelligence** (`src/engines/core/module-intelligence.ts`): Cross-module staleness tracking, deferred refresh for inactive modules
- **Self-Pilot** (`src/engines/core/self-pilot.ts`): Auto-healing — monitors query health, memory pressure, stale cache cleanup
- **Network Optimizer** (`src/engines/core/network-optimizer.ts`): Request dedup, adaptive caching, network-quality adaptation (2g/3g/4g)

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
- **Dubai Market Intelligence** (Task #190): `/real-estate/dubai-analytics` — DLD transaction analytics page with KPI hero cards, transaction heatmap by district, sortable district rankings, Recharts trend charts (price + volume), filters (period/type/district/price range), and district detail drawer. Data from hardcoded fallback (`src/data/fallback-dld-transactions.ts`) with seeded RNG (15 districts × 7 months). Service layer: `src/services/dld-analytics.service.ts` (edge-function-first pattern with fallback). Supabase migration stub: `supabase/migrations/20260416200000_dld_transactions_stub.sql` (`analytics.dld_transactions` table with district/date/type/amount indexes). Types: DLDTransaction, DLDDistrictSummary, DLDMarketKPI, DLDMonthlyTrend in canonical-types.ts. i18n: 60+ `dld.*` keys in EN/FR/AR (both translations.ts and i18n-canonical.ts). CTA links from PropertyHub and RealEstateMarketplace. Navy+gold theme.
- **Routes**: `/me/gestion-immo` redirects to `/me/properties`

## Quality Control System (`src/lib/quality/`)
Continuous audit system with 5 modules, all tested (17/17 vitest passing):
- **architecture-audit.ts**: Detects direct supabase usage in UI layer (pages/components). Classifies violations as data_query/realtime/auth/storage/functions/mixed. Exempts auth boundaries, service layer, stores, repositories, domains.
- **technical-leak-scanner.ts**: Detects `[object Object]`, `JSON.stringify` in render, backend tech names (postgres/supabase), stack traces, raw error messages, TODO/FIXME/PLACEHOLDER in user-facing text.
- **duplication-detector.ts**: Detects duplicate search bars, category chips, bottom sheets, sort bars, recommendation sections, weather widgets. Also detects duplicate useState declarations in same file.
- **i18n-validator.ts**: Detects hardcoded user-facing strings (>4 chars starting with uppercase), components with 3+ strings but no `t()` usage. Allows brand names (Easy-Locs, Google, Apple, etc.).
- **control-board.ts**: Generates live PASS/PARTIAL/FAIL/MISSING matrix for systems (Sentry/Playwright/Storybook/Chromatic/service-layer), routes (12), critical flows (6), and critical counts (crashes/duplicates/leaks/violations/unstable).
- **types.ts**: Shared types: AuditViolation, AuditResult, ControlBoardReport, SystemStatus, RouteStatus.

### Control Board Status (2026-04-10)
| System | Status |
|--------|--------|
| Sentry | PARTIAL (code ready, needs VITE_SENTRY_DSN) |
| Playwright | MISSING |
| Storybook | MISSING |
| Chromatic | MISSING |
| Service-layer | PASS (0 data-query violations in UI) |

### Sentry Configuration
- **Package**: `@sentry/react` v10.45.0
- **Boot**: `main.tsx` → immediate `initSentry()` import (no delay)
- **Config**: environment separation, release tagging, BrowserTracing, SessionReplay
- **Sampling**: Smart domain-based — 80% identity/wallet/orbit/payments, 60% taxonomy/canonical, 40% nav, 20% other
- **Replay**: 10% normal sessions, 100% on errors. maskAllText + maskAllInputs enabled
- **Filtering**: ResizeObserver/ChunkLoadError suppressed, browser extensions denied
- **Privacy**: Phone/email/OTP/token/card auto-redacted via scrubSensitiveData() in beforeSend + beforeBreadcrumb
- **Error boundaries**: AppCrashBoundary (top-level), ErrorBoundary (general), FeatureErrorBoundary (40+ routes)
- **Activation**: Set `VITE_SENTRY_DSN` env var to activate
- **Observability Helpers** (`src/lib/observability/sentry-helpers.ts`): 15 domains, captureDomainError/Warning/Span/Breadcrumb/Context, instrumentCriticalAction, captureRenderMismatch, capturePipelineFailure
- **Domain Instrumentation** (`src/lib/observability/domain-instrumentation.ts`): Pre-built instrumentation for OTP, login, wallet transfers, messaging, calls, taxonomy, media, search, checkout

### Auto-Protect System (`src/lib/auto-protect/`)
Full detect → classify → react → protect → verify → report cycle across 11 domains:
- **Domains covered**: UI, taxonomy, canonical, media, scraping, wallet, identity, orbit, public_seo, marketplace, rendering
- **Issue Detector** (`issue-detector.ts`): 12 detector functions — render mismatch, taxonomy mismatch, media issues, pipeline issues, import issues, wallet inconsistency, OTP abuse, suspicious auth, orbit corruption, public page invalid, card broken
- **Protection Reactor** (`protection-reactor.ts`): Domain-specific reactors with 11 action types — auto_fixed, blocked, quarantined, retried, fallback_rendered, rate_limited, challenged, frozen, hidden, escalated, review_queued
- **Safe Auto-Fix** (`safe-auto-fix.ts`): Only safe issues auto-fixed (UI fallback, normalization, missing defaults, template fallback). NEVER auto-fixes wallet/auth/canonical/cross-vertical issues
- **Rate Limiter** (`rate-limiter.ts`): Per-user rate limiting for OTP (5/5min), login (8/10min), wallet transfers (10/min), messages (60/min), calls (10/min). Non-mutating `peekRateLimit()` for status checks
- **Verification** (`verification.ts`): Auto-runs after every reaction — checks action_logged, severity_appropriate, auto_fix_safe, entity_isolated, flow_halted
- **Protection Logger** (`protection-logger.ts`): Full audit trail with Sentry integration. Critical/high → Sentry error events, medium/low → breadcrumbs. Stats: bySeverity, byAction, byDomain, healthStatus
- **Wiring**: Integrated into rendering contracts (auto-protect on invalid render), gate-runner (auto-protect on pipeline failure), FeatureErrorBoundary (card protection), auto-heal engine (health monitoring), domain-instrumentation (OTP/auth/wallet/orbit rate limiting + abuse detection)
- **Safety rules**: Never auto-fix critical issues, never suppress serious logic corruption, never weaken security, never allow public rendering of doubtful data, always log every action

## Phase 4B: Permanent Auto-Engines for Data Quality
- **Engine Architecture** (`src/lib/data-quality/`): 10 permanent autonomous engines extending `DataQualityEngine` base class, registered in `EngineRegistry`, with typed run logs, deduplication, batching, priority ordering
- **10 Engines** (`src/lib/data-quality/engines/`):
  1. **TaxonomyIntegrityEngine** — validates vertical/category/subcategory/entity-type against canonical taxonomy
  2. **MediaRelevanceEngine** — media-family alignment, broken/placeholder/cross-vertical media detection
  3. **DuplicateShadowEngine** — exact/semantic duplicates, legacy/mock/shadow data leakage
  4. **ReferenceIntegrityEngine** — orphans, broken routes, dead parent-child references
  5. **LiveSurfaceSanitizerEngine** — protects dashboard/stories/feeds/cards/carousels/category pages/discovery/search
  6. **SearchHygieneEngine** — cleans indexed content, excludes/downgrades quarantined/invalid from search
  7. **DataQualityScoringEngine** — quality scores (0-100), trust levels (canonical/high/medium/low/untrusted), surface readiness
  8. **SafeRemediationEngine** — deterministic low-risk auto-fixes via 10 typed remediation playbooks
  9. **QuarantineEngine** — isolates unsafe data with reason codes, restore paths, full traceability
  10. **AuditTrailEngine** — logs every detection/classification/auto-fix/quarantine/suppression with before/after evidence
- **Decision Tiers**: SAFE_AUTOFIX, SUPPRESS_FROM_SURFACE, QUARANTINE, REVIEW_NEEDED, IGNORE_WITH_REASON — standardized across all engines
- **Execution Modes**: DRY_RUN (scan only), SAFE_AUTO (deterministic fixes), QUARANTINE_PROTECT (isolate + protect), FULL_SWEEP (reset + scan all), INCREMENTAL (changed entities)
- **Surface Protector** (`surface-protector.ts`): Centralized `filterForSurface()`, `filterForSearch()`, `isEntitySafeForDisplay()` — used by all live surfaces. Protection rules per surface type (10 protected surfaces with individual policies)
- **Source Trust System** (`source-inventory.ts`): Each source has trustScore (0-100), mutationPolicy, visibilityPolicy, mayFeedLiveSurfaces, requiresSanitization
- **Remediation Playbooks**: 10 typed playbooks (wrong_taxonomy_remap, wrong_route_remap, exact_duplicate_suppress, legacy_mock_suppress, broken_reference_isolate, broken_media_suppress, missing_field_downgrade, shadow_dataset_exclude, search_index_cleanup, surface_rebuild)
- **17+ Reason Codes**: WRONG_VERTICAL, INVALID_CATEGORY, INVALID_SUBCATEGORY, WRONG_ENTITY_TYPE, ROUTE_MISMATCH, BROKEN_REFERENCE, BROKEN_MEDIA, PLACEHOLDER_MEDIA, DUPLICATE_EXACT, DUPLICATE_SEMANTIC, ORPHAN_ENTITY, LEGACY_SHADOW, MOCK_LEAKAGE, MISSING_REQUIRED_FIELDS, LOW_CONFIDENCE, CROSS_VERTICAL_CONTAMINATION, etc.
- **Entity Quality Model**: EntityQualityRecord with qualityScore, trustLevel, classification, issueCodes[], remediationState, quarantineState, surfaceVisibilityState, engineFindings[]
- **Scheduling**: Engines auto-start at boot via `runBootAudit()`, scheduled incremental sweeps every 10 minutes via `startScheduledSweeps()`, wired into God system CronOrchestrator `data_integrity_check` job
- **Live Surface Wiring**: `filterValidStories()` checks quarantine + surface suppression; `populateSearchIndex()` checks quarantine + search exclusion + surface suppression
- **Admin Page** (`/admin/data-quality`): 7 tabs — Overview, Engines (status/sweep logs/source trust), Findings, Sources (with trust scores), Quarantine, Remediations, Playbooks. Run mode selector (boot/dry/incremental/full sweep)
- **Key files**: `engine-base.ts`, `engine-registry.ts`, `execution-orchestrator.ts`, `surface-protector.ts`, `engines/*.ts`, `types.ts`, `quarantine.ts`, `source-inventory.ts`, `audit-runner.ts`, `AdminDataQualityPage.tsx`

## Autonomous Self-Repair Engine (Phases 1-4 + Phase A + Phase B)
- **Architecture** (`src/engines/core/`): 4-phase self-repair pipeline + Phase A (DOM/UI bridge) + Phase B (hardening)
- **Phase 1 (Safety Foundation)**: `repair-safety.ts` — storm detection (>50 repairs/10min), loop prevention (>3 same-issue/5min), SafeRepairContext tracking, abort triggers. `engine-feature-flags.ts` — typed platform flags with in-memory + DB persistence. `domain-health.ts` — per-domain health scoring. `types.ts` — repair system type definitions
- **Phase 2 (Pipeline + Proof)**: `repair-pipeline.ts` — 7-stage pipeline (detect → classify → localize → repair → validate → regress → accept_or_rollback), global on/off gate, execution reports. `proof-system.ts` — immutable proof records with mutation snapshots (before/after state), stage-level traceability, per-domain retrieval, stats aggregation, rejection tracking
- **Phase 3 (Domain Rules)**: `repair-actions.ts` — operation registry (invalidate/refresh/fallback/reset/reconnect/suppress) with allowlists per domain. `domain-activation-sheets.ts` — 9 domain activation sheets (dashboard/taxonomy/media/notification/marketplace/ui/text/i18n/layout). `domain-repair-rules.ts` — 20 typed rules mapping issue signatures to repair operations with priority, confidence thresholds, mutation cost, cooldown policies
- **Phase 4 (Live Taxonomy Rollout)**: `repair-bridge.ts` — platformBus subscriber for `taxonomy.conflict.detected` events with 500ms debounce, FIFO pending queue, per-event flag check
- **Phase A (DOM/UI Bridge)**: `ui-repair-bridge.ts` — DOM repair bridge listening for ui-engine:report, text/layout/i18n violation events. DOM executors (overflow fix, tap targets, text integrity, encoding, i18n patches, card normalize, overlap fix) with safety boundary enforcement (#root, data-repair-frozen, forbidden selectors). `repair-actions.ts` — DOM mutation cap=10 per run, WeakMap snapshots, rollback support
- **Phase B (Hardening)**: `repair-hardening.ts` — production-grade hardening layer:
  - **Priority System**: 5-level typed priority (critical_layout → cosmetic_layout), deterministic execution ordering
  - **Confidence Scoring**: 8-signal weighted scorer (detectorCertainty, elementVisibility, sizeSanity, domStability, selectorSpecificity, corroboratingSignals, priorSuccessRate, metricStrength). Per-rule minimum thresholds. Wrapper threshold=0.8
  - **Anti-Oscillation**: Per-element cooldown with escalation (1.5x-2x per repeat). State history tracking. Oscillation detection quarantines elements after 3+ toggling mutations
  - **Adaptive Budget**: Base=10, storm-adjusted (degraded=50%, storm=min3, quarantined=0). Per-rule mutation cost (1-5). Budget consumed by priority order
  - **Storm Control**: 4 levels (normal → degraded → storm → quarantined). Event counting + domain concentration + requeue + over-budget signals. Auto-recovery timers. Low-priority suppression in degraded/storm
  - **Wrapper Hardening**: Pre-mutation validation (sensitive ancestry, interactive descendants, animation risk, overflow confirmation). Post-mutation improvement check. Higher confidence threshold + cost + cooldown
  - **Pipeline Authority**: Single decision brain — confidence gate, priority ordering, cooldown check, budget check, storm check, wrapper validation all enforced in pipeline. Executors are bounded only
  - **Proof Upgrade**: ProofRecord includes ruleId, priority, confidence, confidenceThreshold, confidenceSignals, budgetCost, budgetRemaining, cooldownState, stormState, rejectionReason, elementId. "rejected" outcome type. Rejection reason breakdown in stats
  - **Rejection Reasons**: 14 typed reasons (insufficient_confidence, cooldown_active, budget_exceeded, storm_suppressed, oscillation_quarantined, wrapper_role_uncertain, interactive_descendants_present, layout_improvement_not_confirmed, sensitive_ancestry_detected, etc.)
- **Kill switch**: `togglePlatformFlag("enable_repair_pipeline", false)` → immediate in-memory + DB
- **Forbidden domains**: wallet, payment, billing, settlement, ledger, fraud (permanently blocked)
- **Forbidden selectors**: form[data-auth], [data-payment-form], [data-wallet-form], [role='dialog'], [data-modal], [data-overlay]
- **Key files**: `src/engines/core/repair-hardening.ts`, `src/engines/core/repair-pipeline.ts`, `src/engines/core/repair-actions.ts`, `src/engines/core/ui-repair-bridge.ts`, `src/engines/core/proof-system.ts`, `src/engines/core/domain-repair-rules.ts`, `src/engines/core/domain-activation-sheets.ts`, `src/engines/core/repair-safety.ts`, `src/engines/core/repair-bridge.ts`
- **Diag page**: `/repair-diag` — shows storm state, budget, cooldown entries, oscillation quarantines, rejection breakdowns, per-proof confidence/priority/budget details

## Engine Wiring Verification & Enforcement (WiringVerifier)

- **Module**: `src/engines/core/wiring-verifier.ts`
- **Admin UI**: `src/pages/admin/AdminWiringReportPage.tsx` — route `/admin/wiring-report`
- **Invocation**: Explicitly triggered via the Admin UI (user-initiated). NOT auto-triggered at boot. This prevents runtime side-effects (proof contamination, learning signal pollution) during normal operation.
- **Purpose**: Validates all 13 phase gates in strict sequential order. Any phase that FAILs blocks all subsequent phases (BLOCKED_BY_PREV_PHASE). Produces a WIRING_REPORT with per-phase PASS/FAIL/WARN/BLOCKED_BY_PREV_PHASE verdicts, evidence, and remediation actions.
- **ENGINE_MASTER_REGISTRY**: 6 consolidated engines with canonical IDs: `repair-engine` (self-healing + backend connectivity + full-stack linkage), `learning-engine` (analytics + recommendations), `taxonomy-engine` (adaptive taxonomy + category mapping + normalizers + runtime corrections), `ui-correction-engine` (media relevance + text integrity + page-open + search hygiene + dashboard cards), `flow-integrity-engine` (flow integrity + governance audit + publish gates + auto-publish/unpublish + data trust/completeness), `fraud-detection-engine` (unread integrity + sentinel conflict/validation/invariant scanning). All in `src/engines/consolidated/`.

## Dashboard Widgets & Live Data Engines (Task #71)
- **Dashboard widgets** (`src/components/dashboard/`): PrayerTimesWidget (next prayer + countdown + notification bell), ForexWidget (EUR/USD, EUR/MAD, EUR/AED live rates), EngineHealthWidget (pulse dot + engine count). All integrated into SmartHome.tsx.
- **Data services** (`src/services/data/`): `forex-data-service.ts` and `prayer-data-service.ts` — simple data services (not engines) for forex rates and prayer times. Both expose backward-compatible `getForexEngineCache()`/`getPrayerEngineCache()` aliases. Started as data services during boot via `startForexService()`/`startPrayerService()`. Both emit platform bus events (`forex.rates.updated`, `prayer.times.updated`).
- **Engine→Widget data flow**: `useForexRates` hook checks engine cache as third fallback (after edge function + Frankfurter). `usePrayerTimes` hook seeds from engine cache when geolocation fails. Engines start automatically at Stage 4 of boot (5s after app load).
- **Prayer notifications**: `PrayerNotificationProvider` mounted at app bootstrap level (always active). Uses `usePrayerNotifications` hook: browser Notification API, checks every 30s, fires once per prayer per day, respects per-prayer prefs from `adhan_notification_prefs` table. Permission requested when user has notifications enabled. Gated behind auth + enabled preference to avoid unnecessary geo/API work.
- **Islamic Section** (`/dashboard/islamic`): Complete Islamic module with 10 tabs: Prières (prayer times with 15 calculation methods + Hanafi/Shafi'i Asr + Sunrise/Sunset + mosque finder with directions), Qibla (compass with DeviceOrientation API + GPS fallback), Calendrier (monthly prayer calendar from Al-Adhan `/v1/calendar`), Ramadan (dynamic Suhoor/Iftar from Hijri calendar API, progress bar, day counter), Hijri (navigable Hijri calendar with Islamic events), Coran (114 surahs via Al-Quran Cloud API, Arabic + French translation, keyword search), Duas (8 categories of adhkar with repetition counters), Tasbih (digital counter with SubhanAllah/Alhamdulillah/Allahu Akbar presets + vibration + session history in localStorage), 99 Noms (Asma ul-Husna with Arabic, transliteration, French meaning), Zakat (calculator for Zakat al-Mal 2.5% + Zakat al-Fitr, Nisab based on gold price). Route: `/dashboard/islamic`, entry from PrayerTimesWidget on dashboard. Data files in `src/data/islamic/`. Dynamic Ramadan/Eid dates via `islamic-events-service.ts` + `setDynamicIslamicEvents()` in `global-context-engine.ts`.
- **Cross-currency wallet transfers**: New `atomic_wallet_transfer_fx` RPC (migration `20260414200000`) for dual-currency ledger settlement. Edge function routes cross-currency to `_fx` RPC, same-currency to original. `TransferInput` extended with `receiverCurrency`. 2% platform spread on FX transfers.
- **Remediation loop**: `runWiringRemediationPass()` applies auto-applicable remediations (sealManifest, enablePipeline) and re-runs verification up to 3 rounds until PASS or no progress.

| Phase | Gate | Hard-Fail Conditions |
|-------|------|----------------------|
| Phase 0 | Freeze | repair storm active, manifest not sealed, duplicate bus listeners >3, no kill switches |
| Phase 1 | Registry | engine missing from orchestrator, wrong domain, duplicate IDs, orphan/phantom entries |
| Phase 2 | Version Lock | v1/v2 coexistence per domain, versioned bus event names, auth/orbit domains degraded |
| Phase 3 | Taxonomy Lock | runTaxonomyGuard() throws/critical violations, runEntryGuards() throws/no guards active, alias conflicts |
| Phase 4 | Contracts | missing EngineContract, allowedInputs/allowedOutputs/forbiddenActions/deps validation errors, critical engines missing contract |
| Phase 5 | Orchestrator | not booted, <80% in RUNNING, lifecycle bypass (quarantined but running), circular repair loops |
| Phase 6 | Repair Pipeline | pipeline disabled, missing required stages, 10-stage spec uncovered (propose/simulate/apply = FAIL) |
| Phase 7 | Proof System | <70% proofs with root cause, <70% with confidence, rollback rate >30% |
| Phase 8 | Observability | zero orchestrator engines, zero observer tracking, zero engine health entries |
| Phase 9 | E2E Flows | >1 domain probe not "accepted" (executePipeline() = accepted only), >2 metadata flows missing |
| Phase 10 | Learning | running during repair storm, more low performers than high performers |
| Phase 11 | Optimization | duplicate/inactive flagged engines |
| Phase 12 | Hardening | storm active, circular loops, duplicate IDs, invalid proof rate >30% |

## Autonomous 24/7 Engine Systems (Task #79)
10 interconnected server-side systems for fully autonomous operation with zero browser dependency:
- **DB Migration**: `supabase/migrations/20260414300000_autonomous_engine_systems.sql` — 11 tables + pg_cron entries + helper SQL functions
- **Server-Side Cron**: `autonomous-cron-dispatcher` Edge Function + pg_cron entries replace ALL client-side `setInterval` scheduling. `sentinel-cron-orchestrator.ts` client intervals disabled; handler registry retained for dashboard on-demand invocation only.
- **Push Notifications**: `send-push-notification` Edge Function + `push_tokens` table + `registerPush.ts` (no fake tokens — fails gracefully if push unavailable). `push-event-bridge.ts` wired to payment/message/booking/order/degradation events.
- **Dead Letter Queue**: `dlq-processor` Edge Function with exponential backoff. Wired into: email-queue, orbit-message (executeSendText.ts), wallet-ops (settle/reverse/capture), orbit-payment (transfer_locs), autonomous-cron-dispatcher failures.
- **External Alerting**: `alert-dispatcher` Edge Function — email, Telegram, webhook channels. SMS explicitly marked as not-configured (returns failure). 15-min throttle.
- **Uptime Watchdog**: `watchdog-ping` (internal, authenticated) + `public-health` (external, unauthenticated). External health checks DLQ depth, job queue backlog, watchdog staleness. Supports `EXTERNAL_WATCHDOG_WEBHOOK_URL` env var for integration with UptimeRobot/BetterUptime.
- **Rate Limiting**: `_shared/server-rate-limiter.ts` applied to ALL 47 public-facing Edge Functions (send-otp, create-checkout, wallet-transfer, booking-*, orbit-payment, wallet-ops, ai-assistant, etc).
- **Job Queue**: `job-queue-worker` Edge Function processes unified `job_queue` table. `email-queue-process` now pulls from BOTH legacy `email_queue` AND unified `job_queue` (queue_name='email').
- **State Cache**: `cache-manager` Edge Function for server-side cache warming/invalidation.
- **Storage Backup**: `backup-storage` Edge Function for nightly backup manifests.
- **Autonomy Dashboard**: `/admin/autonomy` page — real-time system status, DLQ/job queue stats, uptime history chart, autonomy score.
- **RLS Security**: All operational tables restricted to service_role + admin-only read (via `is_admin()` function). No public SELECT access to system internals.
- **Auth**: All privileged Edge Functions enforce `requireServiceRole()` (403 for non-service-role tokens). `public-health` intentionally unauthenticated.
- **Client DLQ Helper**: `src/lib/dlq/dlq-client.ts` — `insertIntoDlq()` and `enqueueJob()` for client-side failure reporting.

## Restaurant Food Ordering System (Task #140)
- **Domain Service**: `src/domains/restaurant/` — ports.ts (FoodOrder, FoodOrderStatus state machine, RestaurantOrderRepository, DailyStats), events.ts (7 food order events: placed→cancelled), service.ts (createRestaurantService with accept/reject/prepare/ready/getActive/getDailyStats + seller ownership verification), adapters/supabase.adapter.ts.
- **State Machine**: pending→accepted→preparing→ready_for_pickup→dispatching→in_delivery→delivered. Terminal: delivered, cancelled. Cancel allowed from pending/accepted.
- **Menu Item Schema**: allergens (TEXT[]), dietary_labels (TEXT[]), spice_level (0-5), prep_time_minutes, calories_kcal, protein_g, carbs_g, fat_g on menu_items table.
- **Modifier Tables**: `menu_modifier_groups` (radio/checkbox, min/max selections, required flag, sort_order) + `menu_modifier_options` (price_adjustment, is_default, is_available, sort_order). RLS: SELECT open, write ops scoped to shop owner via menu_items→storefront_pages join.
- **Cart Modifiers**: `CartModifier` type (groupName/optionName/priceAdjustment). Cart total includes modifier price adjustments. Merge key = menuItemId + modifier selections + notes (items with different notes never merge).
- **Dish Customization**: `DishCustomizationSheet.tsx` — allergen badges, dietary labels, spice/calories/prep info, modifier group radio/checkbox UI, special instructions, live price calculation. State resets on open.
- **Merchant Editor**: `MerchantMenuItemEditorPage.tsx` — 14-allergen checklist, dietary label selection, spice slider (0-5), nutritional inputs, modifier group/option CRUD. Route: `/merchant/menu/edit/:itemId`.
- **Order Engine**: `orderEngine.ts` — subtotal/fingerprint/item rows all include modifier price adjustments. Item metadata stores modifiers/notes/allergens per line item.
- **Notification Events**: `mapFoodOrderEvent()` in notification-event-mapper.ts — 7 food order lifecycle events.
- **Order Detail**: `UnifiedOrderDetailPage.tsx` shows modifiers, notes, and allergen warnings per item.
- **Migration**: `20260415600000_restaurant_modifiers_allergens.sql`

## Engineering Audit (2026-04-10)
Full audit report: `docs/ENGINEERING_AUDIT.md`
- **Build**: production build fixed (checkPublishBlockers import + duplicate patisserie key)
- **TypeScript**: 0 errors confirmed
- **Known issues**: ~13 remaining supabase.channel() imports in UI (all realtime — exempt), 0 data-query violations in UI
- **Security**: Auth/RLS solid, CORS wildcard on Edge Functions needs restricting, CSP headers needed
- **Test coverage**: 83 test files (17 quality audit tests + 66 unit + 7 E2E)
- **Performance**: 462K lines, bundle needs splitting by pillar, 8 files >800 lines need decomposition

## Checkout Hardening (Cycle 2)
- **Card payment**: Real Stripe PaymentIntent via `create-stripe-intent` edge function. CardPayment component dynamically loads Stripe.js, mounts card element, confirms payment. Order created only after Stripe confirms success.
- **Wallet payment**: Pre-checks balance via `useWalletAccounts`. Executes atomic `executeWalletTransfer` (via `wallet-transfer` edge function) before order creation. Insufficient funds blocked at UI level.
- **Address validation**: Delivery orders require `selectedLocation` from `locationStore`. Checkout blocked with error if missing.
- **Cash (COD)**: Order created with `payment_status: "pending"` (correct for COD).
- **State machine**: `review` → `card_payment` (if card) → `processing` → `complete`. Double-click prevention via `placing` state.
- **Idempotency**: UUID idempotency key for every order + wallet transfer.
- **Files**: `CheckoutPage.tsx`, `CardPayment.tsx`, `orderEngine.ts` (added `updateOrderPaymentStatus`)

## Wallet Security (Cycle 3 — Phase 1)
- **Auth guards**: All wallet mutation functions now verify authenticated user via `supabase.auth.getUser()`
- **Amount validation**: Max single transaction limits, NaN/negative/zero rejection
- **Balance verification**: Debit operations check available balance before proceeding
- **Idempotency**: Client-side deduplication for ledger entries (reference-based keys)
- **Audit logging**: Every wallet mutation logged via `logger.info("[WALLET_AUDIT]")`
- **Security logging**: Cross-user access attempts, duplicate operations, insufficient funds all logged via `logger.error/warn("[WALLET_SECURITY]")`
- **Files hardened**: `ledger.ts`, `dispatch-wallet-bridge.ts`, `apply-wallet-credit.ts`
- **Downstream inheritors**: `orderSettlement.ts`, `checkoutPaymentPatch.ts`, `create-refund-request.ts`, `credit-policies.ts`
- **Remaining**: 92 direct Supabase imports in UI layer need service-layer migration (60 pages, 10 components, 15 hooks, 6 stores, 1 context)

## Biometric Authentication (WebAuthn + Face ID + Touch ID)
- **WebAuthn Backend**: 6 edge functions — `webauthn-registration-challenge`, `webauthn-registration-verify`, `webauthn-authentication-challenge`, `webauthn-authentication-verify`, `webauthn-login-challenge` (pre-auth), `webauthn-login-verify` (pre-auth)
- **Database**: `webauthn_credentials` table (credential storage with sign count tracking), `webauthn_challenges` table (time-limited challenge/response), `profiles.biometric_enabled` flag
- **Migration**: `supabase/migrations/20260414400000_webauthn_credentials.sql`
- **Frontend Libraries**:
  - `src/lib/auth/webauthn.ts` — WebAuthn browser API wrapper (registration + authentication ceremonies)
  - `src/lib/auth/biometric.ts` — Unified biometric service (WebAuthn for web, Capacitor BiometricAuth for native iOS/Android)
  - `src/repositories/biometric.repository.ts` — Edge function calls + credential CRUD
- **UI Integration**:
  - `src/components/wallet/WalletSecuritySettings.tsx` — Functional biometric toggle (enable/disable), credential list with delete, device-aware labeling (Face ID / Touch ID / Fingerprint)
  - `src/components/security/AppLockScreen.tsx` — Biometric unlock button on lock screen, auto-triggers on load if enabled
  - `src/lib/app-security.ts` — `biometric_unlock_enabled` config field, `isBiometricUnlockEnabled()` / `setBiometricUnlock()` helpers
- **Wallet Operation Guard**: `src/lib/wallet/wallet-biometric-guard.ts` — `guardSensitiveOperation()` enforces biometric before transfers (integrated in WalletTransferPage)
- **Shared Crypto**: `supabase/functions/_shared/webauthn-crypto.ts` — CBOR/COSE parsing, attestation extraction, assertion signature verification (ES256/RS256), RP ID hash validation
- **Fallback**: Graceful PIN fallback when biometrics unavailable or fails — no error, smooth degradation
- **Capacitor Native**: Detects Capacitor `BiometricAuth` plugin for iOS Face ID/Touch ID and Android Fingerprint/Face, gates native verification before WebAuthn ceremony

## SEO Ultra 2026 (Task #107)
- **Pre-Rendering Plugin** (`vite-plugin-prerender.ts`): Generates static HTML files for ~1,400+ SEO routes at build time. Each file is the SPA shell with title, description, canonical, og:image, hreflang alternates (en/fr/ar/x-default), and Twitter card meta injected into `<head>` before JS hydration. Registered in `vite.config.ts` as `prerenderPlugin()`.
- **Hreflang** (`seo-meta.pipeline.ts`): `buildHreflangAlternates(canonicalUrl)` generates `<link rel="alternate" hreflang>` for en, fr, ar, x-default. Pipeline now also injects og:image/twitter:image/og:url into DOM for every route change.
- **Sitemap single source** (`public/sitemap.xml` removed): Build-time `vite-plugin-sitemap.ts` is the sole source — generates sitemap index + 6 sub-sitemaps to `dist/`. Added canonical dedup check that throws fatal build error on duplicate URLs.
- **BreadcrumbNav** (`src/components/seo/BreadcrumbNav.tsx`): Visual breadcrumb with `itemScope/itemProp` microdata. Used in `SEOPageShell` (auto-renders when `breadcrumbs` prop passed), `CityHubPage`, `CountryHubPage`, `ServiceCitySEOPage`, `ActivityCitySEOPage`, `MarketplaceCityPage`.
- **SEOPageShell** enriched with `breadcrumbs`, `ogImage`, and `hreflangAlternates` props; auto-generates hreflang from canonical if not passed explicitly.

## Runtime Ultra-Stable — Durcissement Complet 2026 (Task #113)
- **Fast Path / Heavy Path Discipline** (`src/lib/runtime/path-discipline.ts`): Per-domain latency budgets (message=200ms, payment=500ms, booking=400ms, auth=150ms, etc.). `executeFastPath()` races business logic against budget timeout. Budget exceeded → degrade to heavy path queue. Heavy operations (enrichment, media processing, AI scoring, analytics) always deferred.
- **Queue Hardening** (`src/lib/queue/queue-hardening.ts`): Dedup by fingerprint with 5-minute sliding window. Structured exponential backoff with jitter. Poison message detection (5+ failures → quarantine). Per-domain pause/resume. Queue depth metrics with avg processing time tracking. Server-side dedup via `queue_dedup_window` table + `check_queue_dedup()` RPC.
- **State Machine Runtime Enforcement** (`src/lib/state-machines/runtime-enforcement.ts`): Guard conditions checked before every transition. Transition IDs for replay safety. Timeout rules with automatic escalation events. Rollback rules for reversible states. Full transition history with audit trail. Enforced machines: BOOKING, CHECKOUT, MESSAGE, AUTH_SESSION, CALL, REPAIR, SUBSCRIPTION, UPLOAD, SUPPORT_TICKET.
- **Boundary Validation** (`src/lib/validation/boundary-validators.ts`): Schema-based validation at every trust boundary: API responses, webhook payloads (Stripe, Supabase auth, booking, payment, delivery), queue consumer payloads, event bus payloads, cache restore, Zustand store mutations. Schema versioning with mismatch rejection. Failed payloads quarantined with correlation_id in `boundary_validation_quarantine` table.
- **Server-Persisted Kill Switches** (`src/lib/control-plane/server-persistence.ts`): Kill switches and feature flags migrated to Postgres (`kill_switches_server`, `feature_flags_server`). Every toggle persisted with actor, reason, timestamp, before/after state in `kill_switch_audit_log`. Browser subscribes via Supabase Realtime. `emergencyShutdownServer()` disables all domain features + quarantines domain. Per-domain degradation modes: normal, read_only, write_freeze, partial_disable, attachment_disable, background_pause, queue_pause, admin_only, quarantine.
- **Read Models** (`src/lib/runtime/read-models.ts`): Canonical dashboard cards persisted in `read_model_dashboard_cards`. Each card has owner query, freshness TTL, status (ok/warning/error/loading/empty/stale), error policy. Default cards: unread messages, engine health, queue depth, active bookings, kill switch summary, domain degradation summary. Admin dashboards rewired to consume read models.
- **Anomaly Detection** (`src/lib/runtime/anomaly-detection.ts`): Sliding window metrics per domain (60s windows): error velocity, p95/p99 latency, retry storm count, queue backlog, mutation rejection rate, reconnect frequency, invalid transition count, stale data frequency. Threshold breach → preemptive actions: pre_throttle, degrade_mode, freeze_writes, quarantine_engine, suppress_retries, disable_feature. Per-domain thresholds (wallet stricter than general).
- **DB Observability** (`src/lib/runtime/db-observability.ts`): Tracks queue depth, DLQ depth, event table growth, cron failure rates. Alerts on thresholds (connections>70%warn/85%crit, queue>500warn/1000crit, DLQ>25warn/50crit). Metrics persisted in `db_observability_metrics` table with alert events emitted via server event bus.
- **Stability Init** (`src/lib/runtime/stability-init.ts`): Central wiring — registers all enforced machines with timeout/rollback rules, boundary validators, read models, anomaly thresholds, and preemptive action callbacks.
- **Migration**: `supabase/migrations/20260414600000_runtime_stability_hardening.sql` — 15 new tables, 7 RPCs, 4 cron jobs, RLS policies.

## Multi-Agent Orchestrator (`orchestrator/`)
- **Purpose**: AI team of 6 specialized agents that process GitHub Issues, decompose tasks, create PRs, and validate changes with human approval gates.
- **Stack**: Node.js + TypeScript + Express + OpenAI API + Octokit (GitHub API)
- **Entry point**: `orchestrator/src/index.ts` — Express server with webhook endpoint
- **Agents**: Chief Architect (architecture review), Coding (implementation), QA Validation (testing/safety), Supabase (schema/RLS/Edge Functions), Deploy (Vercel deployment), Observability (health monitoring/incidents)
- **Repo Rules**: `.agents/rules/` — 6 markdown files encoding architecture conventions (ORBIT bus, pillar boundaries, engine contracts, DB schema map, file organization, coding standards). Injected as agent context.
- **Pipeline**: GitHub Issue → Task Decomposition (LLM) → Subtask routing → Agent execution → PR creation → Human approval gate
- **Endpoints**: `POST /webhooks/github` (webhook), `GET /health`, `GET /audit`, `GET /tasks`, `GET /cost`
- **Audit**: Every agent action logged with agent ID, timestamp, rationale, token usage
- **Cost Controls**: Per-model token cost tracking, daily/monthly budget caps, alerts at 80%/90% thresholds
- **Environment Variables**: `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, `GITHUB_OWNER`, `GITHUB_REPO`, `OPENAI_API_KEY`, `OPENAI_MODEL` (default: gpt-4o), `COST_DAILY_LIMIT_USD` (default: 10), `COST_MONTHLY_LIMIT_USD` (default: 200), `VERCEL_TOKEN` (optional), `SUPABASE_URL` (optional), `SUPABASE_SERVICE_ROLE_KEY` (optional)
