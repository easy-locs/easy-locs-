# Easy-Locs Super-App v3

## Overview
Easy-Locs is a world-class super-app built around 5 intelligently connected pillars:
**Dashboard · Radar · Orbit · Wallet · Me**

Built with React + Vite + TypeScript, backed by Supabase. Property management, marketplace, communication, digital wallet, and service discovery — unified under one roof.

## Architecture (Super-App v3)
- **Frontend**: React 18 + Vite + Tailwind CSS + Framer Motion
- **Backend**: Supabase (PostgreSQL + Auth + Storage + RPC)
- **State**: React Query, custom contexts (AuthContext, I18nContext)
- **i18n**: Custom i18n system — runtime in `src/lib/i18n.tsx` (~317 lines), translation data lazy-loaded from `src/lib/i18n-data.ts` (~4400+ lines, code-split). 31 locales supported. Super-app keys (home.*, radar.*, orbit.nav.*, wallet.*, dashboard.*) now fully translated for ES/DE/IT/PT/NL/TR/AR/JA (80 keys each). Merchant onboarding fully i18n'd with `mob.*` keys (90+ keys FR/EN).
- **Navigation**: 5-tab bottom nav via `src/config/navigation.ts`

## 5-Pillar Routing Structure (App.tsx)
App.tsx routes are organized into clean, labeled sections:
1. **AUTH** — Login, signup, onboarding
2. **DASHBOARD (Pillar 1)** — Home, SmartHome, property management (/dashboard/*)
3. **RADAR (Pillar 2)** — Discovery, browse, food, shops, travel, mobility (/radar, /browse/*, /food/*, /shop/*, /travel/*, /mobility/*)
4. **ORBIT (Pillar 3)** — Messaging, contacts, status (/orbit/*) — WhatsApp-grade UX
   - **Layout**: MainBottomNav hidden on /orbit. CommNavBar is the sole bottom nav on mobile, sidebar on desktop. Full-screen 100dvh layout. Back button in header to return to other pillars.
   - **5 Tabs**: Status (stories, default tab), Chats, Calls, Contacts, Settings (no duplicates)
   - **Color System**: Uses standard theme tokens (--primary, --foreground, --background, --card, --border). Semantic status colors use --hud-success/danger/warning.
   - **Status/Stories Feature**: Post text/photo/video stories with 24h TTL, gradient backgrounds, story viewer with progress bars. Videos auto-play in viewer. Stories also appear in Radar page via RadarStoryRail. Media uploads via db.storage (50MB video / 10MB image limits).
   - **In-Chat Search**: Inline search bar in ChatHeader with result navigation (up/down arrows, highlight)
   - **Swipe-to-Reply**: Both directions (own + received messages), visual reply indicator during swipe
   - **Media Type Indicators**: Conversation cards show camera/mic/file/location icons for last message type
   - **Animated Composer**: Spring-animated send/mic button transition, reply/edit banner with motion
   - **Typing Indicator**: Custom pulse animation with 3 dots
   - **Online Presence**: Animated ping indicator on avatar (header + card)
   - **Groups Navigation**: Uses `?thread=` query param for proper thread resolution
5. **WALLET (Pillar 4)** — Payments, orders, checkout (/wallet/*, /checkout/*, /orders/*)
6. **ME (Pillar 5)** — Complete user hub V2:
   - **Command Center** (`/me`): Quick stats (active orders, loyalty points, wallet balance), profile card with role badge, conditional merchant/property/driver sections
   - **Essentials**: Orders (`/my-orders` with quick nav to Active/Receipts/Insights), Favorites (`/favorites` with rating/category tags), Addresses (`/me/address-book` with Home/Work icons), Loyalty (`/me/loyalty-history` with tier progress Bronze→Silver→Gold→Platinum), Spending Insights (`/me/spending-insights` with monthly bar chart)
   - **Client Account**: Saved Cards (`/me/saved-cards` with credit card visuals), Receipts (`/me/order-receipts` with summary stats), Disputes (`/support/tickets`)
   - **Active Orders**: (`/my-orders/active`) Live tracking with step indicators and status pulse
   - **Gestion Immo** (`/me/gestion-immo`): Mobile-first property management hub with Bailleur/Locataire role selector, per-property KPIs, quick actions
     - Per-property detail (`/me/gestion-immo/:propertyId`): 5 tabs (Overview/Bail/Appels/Quittances/Paiements), auto-generate bail & quittances, mark payments
     - Tenant view (`/me/tenant-view`): Locataire dashboard with property info, lease details, payment history, quittance downloads
   - **Conditional Sections**: Property Management, My Shop, Driver Hub (shown based on user roles)
   - **Account**: Personal info, Security, Notifications, Preferences, Orbit, Wallet settings
   - **Support**: Help, Disputes/Tickets, Legal
7. **ADMIN** — Admin panel (/admin/*)
8. **DEEP LINKS / QR** — Public deep links, QR resolvers
9. **SEO / LEGAL** — Programmatic SEO pages, legal pages

## UX Optimizations (Améliore Pass)
- **Dashboard Quick Access**: ActiveCartBanner (resume cart in 1 tap), QuickAccessStrip (Reorder/Favorites/My Orders), time-aware smart actions
- **Express Checkout**: 1-tap order from CartSheet (wallet pay, auto-resolve seller, idempotent), with fallback to full checkout
- **Restaurant Page**: Haptic feedback on add-to-cart, animated quantity controls (framer-motion whileTap), navy/gold floating cart CTA with pulse animation
- **Service Booking**: Auto-fills name/email/phone from auth profile (PublicServiceBooking.tsx)
- **Hotel Booking**: Smart date defaults (tomorrow/day-after) so rooms show prices immediately without manual date selection
- **i18n keys**: home.qa_reorder, home.qa_favorites, home.qa_my_orders added to FR/EN

## Taxi / Rider / Delivery Premium Experience
Ultra-fluid mobility experience comparable to Uber/Careem/Deliveroo:
- **Taxi Page** (`/mobility/taxi`): Map-first with live nearby vehicles, Navy header, Gold accents. 5-step flow: search → preview → requesting → tracking → completed
- **TaxiSearchScreen**: Live Mapbox map with animated drivers, recent destinations for 1-click rebook, vehicle types (Standard/Premium/XL/Moto) with ETA badges, Now/Schedule toggle
- **TaxiPreviewScreen**: Route map with Mapbox Directions API polyline (Gold line on Navy shadow), fare card with Navy background, distance/ETA/wait stats, ride options, Confirm CTA
- **TaxiRequestingScreen**: Animated radar with Gold ripple rings, status messages with check animations, cancel option
- **TaxiTrackingScreen**: Real RideLiveMap with driver/pickup/dropoff markers, full driver card (photo/name/vehicle/plate/rating), Call/Chat/Share buttons (Orbit integration), 8-step timeline (searching→accepted→arriving→at_pickup→picked_up→in_progress→arriving_dropoff→completed), live speed display
- **TaxiCompletedScreen**: Fare summary, 5-star rating, tip flow (0/5/10/20/50), bottom-sheet receipt with route details
- **Delivery Page** (`/mobility/delivery`): Navy header, ActiveDeliveryTracker component per active job with progress bar + rider call/chat (Orbit integration), delivery statuses (finding→assigned→heading_to_pickup→at_pickup→picked_up→on_the_way→almost_there→delivered)
- **Dashboard Integration**: SuperServicesGrid shows active rides/deliveries banners with LIVE badge for quick access
- **MobilityLiveMap**: Mapbox Directions API route polyline between pickup/dropoff (Gold line), animated nearby vehicle markers, Navy/Gold markers
- **Design**: All Navy `hsl(220 40% 18%)` / Gold `hsl(38 65% 56%)` inline styles

## Intelligent Dispatch System (Uber/Careem-Level)
Complete Taxi/Rider/Delivery dispatch engine with real-time matching, anti-conflict, learning:

### Core Engine Files (`src/lib/mobility/`)
- **smart-dispatch-controller.ts**: Central brain — orchestrates scoring → pricing → zone → wave dispatch → offer tracking → escalation. <1s matching with progressive radius expansion (3→5→8→12→20km), 4-wave dispatch (precision→expanded→wide→emergency), integrated cron for expiry/escalation
- **unified-driver-scorer.ts**: 8-dimensional scoring (distance/acceptance/response/reliability/zone/activity/vehicle_fit/GPS quality) + 3 new intelligence signals: finishing-soon detection (riders about to complete → pre-assigned), time-of-day weighting, dynamic activity scoring (recency + experience)
- **unified-pricing-engine.ts**: Dynamic pricing with 6 multipliers: demand/supply surge, traffic, weather, service level, time-of-day (rush hour/late night), long-distance discount. Fare estimate with low/high confidence bands
- **dispatch-conflict-resolver.ts**: Atomic assignment with in-memory locking, offer.job_id cross-validation, affected-row verification, busy-rider detection, rollback on failure
- **delivery-batch-engine.ts**: Groups nearby deliveries (same pickup zone + dropoff cluster), nearest-neighbor route optimization, savings estimation. Max 4 jobs/batch, 2.5km pickup / 3km dropoff radius
- **smart-zone-manager.ts**: Real-time heat mapping (cold→warm→hot→surge), demand prediction with time multipliers (rush hour 1.8x), rider repositioning suggestions to hot zones, zone incentive bonuses, 30s cache TTL
- **dispatch-learning-engine.ts**: Continuous learning — records every outcome (dispatched/completed/failed), hourly metrics snapshots, auto-detects slow matching (>2s) / low success (<60%) / high failure (>30%), driver stats auto-update (acceptance rate, response time, completion rate)
- **dispatch-orbit-bridge.ts**: Auto-creates Orbit chat thread on rider assignment, sends system status messages at each trip phase, provides thread ID for customer↔rider communication
- **dispatch-wallet-bridge.ts**: Auto-charges customer wallet on completion (wallet → card fallback), auto-pays rider (80% net earning), idempotent via reference_id, earnings ledger per ride
- **dispatch-monitor.ts**: Health monitoring (healthy/degraded/critical), tracks active jobs, pending offers, online riders, failure rate, hot/surge zones. Alerts on critical status

### Dispatch Flow
1. Customer requests ride → `smartDispatch()` called
2. Zone intelligence fetched → demand/supply/traffic/weather assessed
3. Dynamic pricing computed (6 multipliers)
4. Driver scoring: 150 candidates max, 8 dimensions + 3 intelligence signals, finishing-soon riders included
5. Delivery batching (if applicable) → nearby orders grouped
6. Wave 1 dispatch: top 3 scored riders, 12s expiry
7. If no accept → Wave 2 (5 riders, 15s) → Wave 3 (8, 20s) → Wave 4 (12, 25s)
8. If all waves fail → radius expansion (3→20km) → `failed_no_rider`
9. On accept → conflict resolver validates atomically → Orbit chat created → tracking starts
10. On complete → Wallet auto-charge → rider paid → stats updated → learning cycle triggered

### Anti-Conflict Guarantees
- 1 job = 1 rider (atomic offer acceptance with affected-row checks)
- offer.job_id cross-validation prevents cross-job tampering
- In-memory lock prevents concurrent accept races
- Busy-rider detection blocks double-assignment
- Rollback on partial failure

## Key Directories
```
easy-locs-ea1eb0ed/
├── src/
│   ├── pages/           # Route pages organized by domain (admin/, food/, wallet/, merchant/, driver/, etc.)
│   ├── components/      # UI components (wallet/, orbit/, radar/, dashboard/, navigation/, etc.)
│   ├── app/             # app-route-registry.tsx (centralized lazy imports for all pages)
│   ├── lib/             # Core utilities (i18n.tsx, wallet/, orbit/, engines/)
│   ├── engines/         # 80+ autonomous engines (AI, self-healing, security, performance, data, UX, business, monetization)
│   │   ├── core/        # BaseEngine, EngineOrchestrator, EngineObserver, SelfPilot
│   │   ├── ai/          # AIAnalysis, CodeSuggestion, RuntimeAnomaly, PolicyGuard, AgentIntelligence, AutomationPipeline
│   │   └── ...          # security/, performance/, self-healing/, data/, uiux/, business/, observability/, release/
│   │   NOTE: Engine loading is tiered — Tier 1 (critical: self-healing, performance, realtime, wallet, security, orbit, calls, radar, data)
│   │         loads immediately; Tier 2 (architecture, code-quality, uiux, business, support, observability, release, AI analysis)
│   │         loads lazily 8s after boot to reduce initial CPU/bundle overhead.
│   ├── config/          # Navigation config (navigation.ts), app constants
│   ├── integrations/    # Supabase client
│   ├── services/        # SSOT service layer — all DB access centralized through db() function
│   │   ├── db.ts          # Central db(table) function — ONLY way to access Supabase tables
│   │   ├── storefront.service.ts  # Storefront pages, catalog, orders, menu items
│   │   ├── customer.service.ts    # Loyalty, profiles, wallet txns, orders
│   │   ├── admin-ops.service.ts   # Activity logs, notifications, ranking, debug, test batches
│   │   ├── merchant.service.ts    # Merchant CRUD, analytics, summaries
│   │   ├── fleet.service.ts       # Fleet management, rider presence
│   │   ├── property.service.ts    # Properties, leases, tenants, documents
│   │   ├── boost.service.ts       # Boost campaigns, creatives
│   │   ├── pos.service.ts         # Point of sale operations
│   │   └── (9 more: user, wallet, order, orbit, marketplace, revenue, referral, subscription)
│   └── repositories/    # Data access layer (all using centralized db() function)
├── supabase/migrations/ # SQL migration files (573 files)
└── public/              # Static assets
```

## Phone + OTP Identity Activation System
The app uses phone number + OTP as the root identity activation method. Phone is the default auth tab on both Login and Signup pages.

**Architecture**:
- `src/lib/auth/phone-identity.ts` — Phone verification service (send OTP, verify code, sign in/up)
- `src/lib/auth/identity-activation-pipeline.ts` — Post-OTP chain: account → orbit profile → wallet → contact sync offer
- `src/lib/contacts/contact-sync-service.ts` — Contact sync service for platform discovery (batch phone matching, native Contacts API)
- `src/components/auth/PhoneOTPFlow.tsx` — 3-step animated UI (phone input → 6-digit OTP → verified)
- `src/components/auth/ContactSyncPrompt.tsx` — Post-signup contact sync prompt with privacy notice

**Flow**:
1. User enters phone number → OTP sent via `send-otp` edge function + stored hash in `phone_otp_sessions`
2. User enters 6-digit code → SHA-256 hash compared, rate-limited (5 attempts, 10min expiry)
3. On verification: `signInOrSignUpWithPhone()` resolves existing user or creates new
4. `runIdentityActivation()` pipeline: ensure user profile → ensure orbit profile (phone_verified) → ensure wallet → emit platform event
5. New users get contact sync prompt before redirect; returning users redirect immediately

**Security**: Hash-based OTP (never stored plain), 5 sessions/30min rate limit, 5 attempt max per session, 10-minute expiry.

## Supabase Project
- **Project ID**: `ifvuvbolrmuuugtzxsfk`
- **Region**: `ap-southeast-1`
- **Tables**: 618+ including profiles, wallet_accounts, wallet_transfers, orbit_contacts_v2, orbit_identity_profiles, conversations_v2, chat_messages_v2, orbit_groups, orbit_device_keys, etc.
- **Migrations**: 573 files in `supabase/migrations/`
- **RPC Functions**: 40+ (ensure_wallet_account, atomic_wallet_transfer, has_role, etc.)
- **Storage Buckets**: 13 (avatars, chat-attachments, chat-media, property-photos, documents, vault, etc.)

## i18n Pattern
- Keys use dot notation: `wallet.txStatus`, `auth.signIn`, `orbit.messaging`
- Always add FR first, then EN in `src/lib/i18n.tsx`
- Bottom nav uses canonical i18n (`src/lib/i18n-canonical.ts`)
- Transaction types use `wallet.txType*` keys with fallback to humanized enum

## UI/UX Design Standards
- **Typography minimum**: Never use `text-[7px]` or `text-[8px]` in consumer-facing components. Labels minimum `text-[9px]`, interactive text minimum `text-[10px]`/`text-xs`.
- **Card minimum width**: Carousel cards `min-w-[170px]`, category icons `w-[72px]`; always use `shrink-0` on fixed-size items.
- **Text overflow handling**: All card titles need `line-clamp-2 break-words`, subtitles `line-clamp-1`/`line-clamp-2`, single-line elements use `truncate`. Long text in flex children always add `min-w-0`.
- **Spacing standard**: Dashboard sections `mb-4`, section headers `text-[13px] font-bold`. "See all" links must be `shrink-0` to prevent squishing.
- **Quick actions**: Minimum `h-11` with `text-[11px]` labels and `min-w-0 truncate` for overflow safety.
- **Stats grid**: Labels minimum `text-[9px]`, values minimum `text-xs`, icons minimum `h-4 w-4`.
- **Navy/Gold design tokens**: `--primary: 220 40% 18%` / gold `38 65% 56%`.
- **Bottom nav**: Height is 72px (`--mobile-bottom-nav-h`). Hidden on `/login`, `/signup`, `/orbit`, `/checkout`, `/pay/`, `/order/`. Fixed CTAs on pages WITH bottom nav must use `bottom: calc(var(--mobile-bottom-nav-h, 72px) + env(safe-area-inset-bottom) + 8px)`.
- **Page shell**: Use `app-mobile-page` class alone (provides min-height, safe-area padding, bottom padding). Do NOT add `app-mobile-content` redundantly — it sets the same padding-bottom.
- **Non-standard Tailwind values**: `h-13` is NOT in the default spacing scale. Use `h-[3.25rem]` instead.

## Dashboard Taxonomy & Service Sections
The home screen (SmartHome) has 3 distinct service sections, each covering a unique set of categories with zero overlap:

1. **SuperServicesGrid** (8 cards, 4-col grid): Food, Taxi, Delivery, Hotel, Flights, Seasonal, Real Estate, Services
   - Routes: `/food`, `/mobility/taxi`, `/mobility/delivery`, `/travel/stays`, `/travel/flights`, `/seasonal-rentals`, `/property`, `/services-hub`

2. **EssentialServicesStrip** (8 POI icons, horizontal scroll): Hospital, Pharmacy, Police, Fire, Park, ATM, Fuel, Parking
   - All route to `/radar?category=utility&subcategory=X` where X matches canonical taxonomy values
   - Subcategory values: `hospital`, `pharmacy`, `police_station`, `fire_station`, `park`, `atm`, `fuel_station`, `parking`

3. **CategoryGrid** (5-col grid): Shows ONLY categories NOT in SuperServices — Grocery, Shops, Pharmacy, Beauty, Utility
   - Exclusion managed in `smart-home-engine.ts` via `SUPER_SERVICE_KEYS` set
   - Routes use canonical `/browse/:vertical` pattern

**Canonical taxonomy**: `src/lib/taxonomy/category-tree.ts` (12 primaries, 110+ subcategories incl. fine_dining, pakistani, boutique, hostel, apartment_hotel, premium, bike)
**Adapter layer**: `src/lib/taxonomy/world-class-taxonomy.ts` (backward-compat, radar category mapping, service mode + time relevance enrichment for ALL subcategories)
**Classification engine**: `src/lib/taxonomy/classification-engine.ts` — 70+ brand dictionary entries (food, stay, mobility, property, healthcare chains)

## Story Taxonomy
- **story-taxonomy.ts** auto-derives MEDIA_FAMILY and INTENT mappings from category-tree.ts (zero manual gaps)
- **story-types.ts** — StoryType includes `service`, `grocery`, `shops`; StoryEntityType includes `parking`, `pharmacy`, `hospital`, `fleet`, `vehicle`, `provider`
- `getTaxonomyCoverage()` audit function verifies zero unmapped subcategories
- Cross-domain contamination checks prevent property stories in food feeds, etc.

## Import Engine (Pre-Import Validation)
- **Scrape Decision Gate** (`src/lib/import-engine/scrape-decision-gate.ts`): Pre-import validation that runs BEFORE the pipeline
  - Blocks: no_name, gibberish_name, invalid_gps, exact_duplicate
  - Warns: no_location, gps_ocean, low_classification_confidence, vertical_mismatch, placeholder_image, no_contact, suspicious_phone, empty_catalog
  - `evaluateBatchScrapeDecisions()` processes batches with cross-record dedup
  - Integrated into orchestrator as Step 0 (skippable with `options.skipScrapeGate`)
- Pipeline: SCRAPE_GATE → DEDUP → MERGE → ENRICH → QUALITY → PUBLISH_GATE → OUTPUT

## Discovery Engines (V2)
Three specialized engines power the Radar discovery experience:

### Hyper Radar Engine (`src/lib/engines/hyper-radar-engine.ts`)
- Time-slot detection with caching, category matching via `CATEGORY_SETS`
- Weighted guidance scoring (rating × distance), multi-type guidance (suggestion/discovery/trending)
- `computeRadarStats()` for real-time discovery statistics
- `matchesLayer()` for unified category-to-layer matching

### Vibe & Density Engine (`src/lib/engines/vibe-density-engine.ts`)
- 8 vibe classifications: calm, active, nightlife, business, family, luxury, trendy, cultural
- Peak status tracking (off_peak/building/peak/winding_down)
- Result caching (60s TTL, LRU 100 entries) for instant re-renders
- Rich metadata: vibeEmoji, vibeLabel, tags, peakStatus

### Behavior Pattern Engine (`src/lib/engines/behavior-pattern-engine.ts`)
- 9 zone activity categories with seasonal awareness
- Richer flow predictions with `alternativeActions`
- Expanded complementary place connections (25 max, 60 entity limit)
- Zone rhythm with emoji + transition hints

## Wallet Currency System
- Centralized in `src/lib/wallet/wallet-config.ts`
- Precedence: stored app_country → browser locale → EUR fallback
- Country-currency mapping in `src/lib/geo/country-currency-map.ts` (shared, no React dependency)
- All wallet files use `getWalletDefaultCurrency()` / `WALLET_FALLBACK_CURRENCY`

## Design System V3 — Unified Harmony Layer

### Token Source of Truth: `src/config/ui.ts`
All components must use design tokens from this file instead of ad-hoc values:
- **SPACING**: 2xs through 2xl, maps to CSS vars
- **RADIUS**: sm (8px) to full (9999px)
- **SHADOW**: card, cardHover, elevated, gold
- **TOUCH**: min (44px iOS standard), navItem (56px), bottomNav (72px)
- **ICON_SIZE**: 2xs (12) to 2xl (32)
- **Z**: z-index scale — base(0), dropdown(10), sticky(20), overlay(30), modal(40), popover(50), toast(60), tooltip(70), topNav(80), bottomNav(90), max(100)
- **MOTION**: animation presets — fast/normal/slow durations, spring configs, enter animations
- **BREAKPOINT**: xs(340), sm(640), md(768), lg(1024), xl(1280), 2xl(1400)
- **TEXT**: 20+ semantic typography presets (pageTitle, cardTitle, subtitle, caption, badge, stat, etc.)
- **CARD_STYLES**: base, interactive, carousel, carouselWide, settings, elevated, glass
- **BTN**: primary, secondary, ghost, icon, quickAction
- **CAROUSEL**: container, containerSnap, item, itemWidth, itemWidthWide
- **SECTION**: container, header, headerTitle, headerAction
- **CATEGORY**: card, label, icon, strip, stripLabel
- **STATE**: disabled, loading, error, success, active, hover
- **EMPTY_STATE**: container, icon, title, description
- **PAGE**: container, containerWide, containerFull, header, section, sectionCompact

### CSS Component Classes (`index.css`)

**Pillar-shared classes (app-*):**
- **Page headers**: `.app-page-header`, `.app-page-header-btn` (36px, rounded-xl, blurred muted bg)
- **Typography**: `.app-page-title`, `.app-page-title-icon`, `.app-section-label`, `.app-section-link`
- **Tabs & Filters**: `.app-tab-bar` + `.app-tab[data-active]`, `.app-filter-bar` + `.app-filter-btn[data-active]`
- **Cards & Lists**: `.app-card` (glassmorphic card), `.app-list-row` + `.app-list-row-icon`, `.app-list-divider`
- **Stats & Actions**: `.app-stat-chip` (bordered stat tile), `.app-quick-action` + `.app-quick-action-icon` + `.app-quick-action-label`
- **Insights**: `.app-insight-card` (gradient border card with shimmer support)

**Design System utility classes (ds-*):**
- **Carousels**: `.ds-carousel` (proximity snap), `.ds-carousel-snap` (mandatory snap) — auto-applies shrink-0 + snap-align to children
- **Sections**: `.ds-section-header`, `.ds-section-title`, `.ds-section-action`
- **Category cards**: `.ds-category-card` (72px width, 74px min-height), `.ds-category-label` (2-line clamp)
- **Essential strip**: `.ds-strip-item`, `.ds-strip-icon`, `.ds-strip-label`
- **Quick actions**: `.ds-quick-action`, `.ds-quick-action-label` (truncated)
- **Stats**: `.ds-stat-item`, `.ds-stat-value`, `.ds-stat-label`
- **Empty states**: `.ds-empty`, `.ds-empty-icon`, `.ds-empty-title`, `.ds-empty-desc`
- **Skeletons**: `.ds-skeleton`, `.ds-skeleton-text`, `.ds-skeleton-title`, `.ds-skeleton-card`
- **Errors**: `.ds-error`, `.ds-error-title`, `.ds-error-desc`

**Glass & banner classes**: `.glass-card`, `.glass-card-strong`, `.banner-premium`, `.banner-highlight`
- `.fullscreen-view` for 100dvh immersive layouts
- `.section-divider`, `.pulse-ring`, `.nav-active-glow`

### CSS Custom Properties (`:root`)
- Z-index scale: `--z-base` through `--z-max` (0-100)
- Animation timing: `--duration-fast/normal/slow`, `--ease-default/spring/bounce`
- Mobile nav: `--mobile-bottom-nav-h: 72px`

## Super-App Engine System
The app runs 3 autonomous engines (deferred-loaded 3s after first paint):

### Module Intelligence (`src/engines/core/module-intelligence.ts`)
- Tracks which of the 5 modules (Dashboard/Radar/Orbit/Wallet/Me) is active
- Smart refresh: only invalidates data when you navigate TO a module, not continuously
- Cross-module event propagation: wallet transfers refresh dashboard + orbit automatically
- Stale data detection: marks modules dirty when cross-events fire, refreshes on next visit

### Network Optimizer (`src/engines/core/network-optimizer.ts`)
- Aggressive query caching: wallet-balance 30s, threads 30s, radar 120s, profile 5min
- Network-aware: detects 2g/slow connections → ultra-cache mode (5min stale, 0 retries)
- Request deduplication: prevents duplicate in-flight requests
- Saves battery and data on mobile

### Self-Pilot (`src/engines/core/self-pilot.ts`)
- Visibility-adaptive: 45s active / 120s hidden tab intervals (no wasted cycles)
- Auto-repairs: retries failed queries, garbage-collects stale cache
- Memory monitoring: surgical removal of inactive stale queries when heap > 80% (not full clear)
- Visibility-aware: runs check + reschedules on tab focus

## Cross-Section Bridge (`src/lib/super-app-bridge.ts`)
- Wallet→Dashboard: transfer completed → refresh live stats
- Wallet→Orbit: payment completed → refresh threads
- Marketplace→Dashboard: booking confirmed → refresh counters
- Orbit→Dashboard: message received → refresh unread count

## Module Isolation & Communication
Each pillar is designed to be SEPARATE with zero direct cross-imports between pillar domains.
All inter-pillar communication flows through:
1. **platformBus** (`src/lib/shared/platform-bus.ts`) — Event bus with dot/colon notation bridge
2. **NOTATION_BRIDGE** — Automatic dot↔colon event translation (wallet.payment.success ↔ wallet:payment_success)
3. **Architecture Guard** — Continuous monitoring (120s interval) validates pillar isolation, coupling score, SSOT, event integrity

The `event-init.ts` bridge maps platformBus events → eventBus handlers (one direction only, no amplification).
Colon-notation wallet events removed from BRIDGE_MAP to prevent double-processing via NOTATION_BRIDGE.

## Performance
- **Boot time**: ~490ms (optimized: i18n code-split, 20+ shell components lazy-loaded)
- **Provider stack**: Minimal eager providers (ThemeProvider, QueryClient, I18n, Tooltip, Auth, Call, Payment, AppLockGuard). Effect-only providers (GlobalExperience, UiQuality, BrowserTelemetry) converted to lazy `*Init` components inside Suspense — no wrapping overhead.
- **Removed dead wrappers**: SplashScreen (no-op pass-through), RealtimeProvider (empty context), AppHealthGuard (duplicate of AppHealthBanner in CanonicalShellRuntime)
- **Phase 0 (immediate)**: queryClient + orchestration + orbit cache + flow bridge
- **Phase 1 (2s)**: platform reactions + notifications + counters
- **Phase 2 (5s)**: all 13 domain cache listeners
- **Phase 3 (idle)**: E2EE warmup (requestIdleCallback, ~4s fallback)
- **Phase 4 (10s)**: flow registry + stale scanner + auto-repair + realtime health
- **Phase 5 (20s)**: full engine system boot
- **Phase 6 (30-45s)**: architecture guard + platform recovery
- **Production log stripping**: Vite esbuild.drop removes ALL console/debugger in prod builds
- **Dev-only logging**: All hot-path event bus, command bus, analytics, and handler logs guarded by `import.meta.env.DEV`
- **Monitoring init**: Deferred to `requestIdleCallback` (non-blocking)
- **Code splitting**: 10+ lazy chunks (templates, taxonomy, discovery, pdf-generator, real-estate, map-engine, engines, call-system, payment-system, orbit-system)
- **Deferred providers**: CallProvider and UnifiedPaymentProvider lazy-loaded 1.5s after mount (not needed for first paint)
- **Tier 2 engines dev-only**: 36 analysis/code-quality engines only load in development mode
- **Bundle reduction**: index.js 545KB → 412KB (24% smaller critical path)
- **Route prefetching**: Critical routes preloaded on idle (4s after boot)
- **Per-module prefetching**: Adjacent routes preloaded when entering a module
- **Lazy geo/permissions**: GeoBoot, PermissionBootstrap lazy-loaded
- **No SW/cache purge**: Removed forced purge on every boot for better repeat load perf
- **Stale files cleaned**: scripts/ directory, ORBIT_AUDIT.md, ARCHITECTURE.md removed

## GitHub
- **Repo**: `easy-locs/easy-locs-` (trailing dash)
- **Push**: Use `/tmp/gh_push.sh` (recreate via GitHub connection token if missing)

## Security
- E2EE on Orbit (Signal Protocol: X3DH + Double Ratchet)
- Supabase RLS on all tables
- Wallet identity binding (device fingerprint)
- Architecture Guard: 9-pass continuous monitoring (120s) — includes pillar isolation check
- **QR Anti-Spoofing**: QrPayResolver always resolves recipient name from database (never trusts URL `name` param). Shop QR resolves via `storefront_pages` lookup before payment.
- **Merchant QR Signatures**: Upgraded from basic XOR hash to FNV-1a + Murmur2 dual-hash with time-windowed salt (2-minute validity + backward compat for legacy `mqr_` prefixes)
- **Anti-Fraud Guard**: Rate limiting (10 tx/min, 3 orders/min), idempotency (5-minute TTL), velocity tracking (max 15 unique recipients/hour), rapid succession detection (max 3 tx in 5s), hourly volume cap (25K), risk scoring (0-100), temporary user blocking
- **Payment Security**: Pre-transaction fraud checks on all wallet transfers, QR payments, and orders. Post-transaction recording for idempotency.

## Smart Bridges (Cross-Module Communication)
- **Platform Bus**: Central nervous system — dot and colon notation events with NOTATION_BRIDGE for bi-directional mapping
- **Super App Bridge**: Consolidated cache invalidation — all query invalidation now flows through platformBus event reactions (no more direct `queryClient.invalidateQueries` bypassing events)
- **Dashboard Cascade Fix**: Dashboard events now refresh wallet + business + communication modules (was only business)
- **Payment Failed Handler**: `wallet:payment_failed` events now properly invalidate wallet balance/transaction caches
- **Order Events Harmonized**: Uses `marketplace:order_created` instead of legacy `ORDER_CREATED` uppercase

## Phase 3 System Audit (April 2026)

### Architecture
- **Service Layer**: 13 SSOT services in `src/services/` — all critical consumer + admin pages migrated from direct DB access
- **Data Flow**: Pages → Services → Supabase client. No `(supabase as any)` in migrated pages
- **Ownership Scoping**: All service mutations require userId/orgId parameter for IDOR prevention
- **Error Handling**: Full error boundary wraps entire app with retry + AI audit integration

### Stabilization Pass (April 2026)
- **Platform Bus Type Safety**: All 15 `as any` casts in storefront-reactions.ts replaced with typed payload interfaces (StorefrontOrderPayload, StorefrontCartPayload, etc.). v4-delivery-bridge.ts double-casts removed. engineConnectorHub.ts `as any` → `Record<string, unknown>`.
- **catch(e: any) Cleanup**: AuthContext, Login, Signup, CheckoutPage, Onboarding, POSPage, RiderLivePage, DocumentBuilder, BookingForm, ProviderStorefront, engineConnectorHub — all converted to `catch(e)` + `instanceof Error` pattern.
- **i18n Hardening**: SmartBottomSheet "Ouvert"/"Fermé" → t("common.open")/t("common.closed"), ClientMapCard, MessageList "Today"/"Yesterday", LocationViewerOverlay "Live Location"/"Sharing live", BookingAvailabilityCalendar "Select date"/"Unavailable"/"Selected" — all using t() keys. New canonical keys: common.results, common.select_date, common.live_location, common.location, common.sharing_live, common.open_in_maps, common.unavailable, common.selected (EN/FR/AR).
- **Quality Gates Enhanced**: 6 new architecture rules (no-catch-any, no-as-any-payloads, no-direct-supabase, error-boundary-required, no-usestate-any, suspense-fallback-required).
- **Delivery Bridge Bootstrap**: installDeliveryBridge() now wired in useMasterAppBootstrap stage-1 (was missing).
- **UI Robustness**: AIAssistant calc(100vh) → calc(100dvh), BookingForm price=0 fallback with Number() guard, useState<any> → Record<string, unknown> in ReviewsManagerPanel + ProviderStorefront.

### Startup Performance
- **Story audit deferred**: `fallback-stories.ts` audit IIFE moved to `setTimeout(5s)` gated by `import.meta.env.DEV` — zero startup cost in production
- **DNS prefetch corrected**: `index.html` preconnect/dns-prefetch now points to correct Supabase project (`ifvuvbolrmuuugtzxsfk`), removed unused `ai.gateway.lovable.dev`
- **Auth safety timeout**: `AuthContext` clears safety timeout once `getSession()` resolves — no more late-fire state clobbering
- **Guest flow**: Null sessions immediately set `profileLoaded(true)` — no safety timeout fires for guests
- **Realtime guards**: `useUnreadMessages` checks `user?.id` before creating channels — no 400 errors on guest pages

### Realtime
- **Central Factory**: `src/lib/realtime.ts` — all channels use `createRealtimeChannel`/`removeRealtimeChannel`
- **Hooks Standardized**: useReconAlerts, useWalletAccounts, AdminRealtimeControlPage use central factory
- **Cleanup**: All hooks return cleanup functions with proper channel removal

### State Management
- **Primary**: 50+ Zustand stores (orbitStore canonical, mapStore unified)
- **Infrastructure**: React contexts for auth, realtime, calls, navigation
- **Migration Status**: Orbit moving to mono-entry (orbitDispatch), geo stores fusing to unified mapStore

### Security
- **Service scoping**: fetchTicketById, updateTicket, deleteStatus, fetchById, updateStatus all require userId
- **Input sanitization**: walletService.fetchTransactionForUser sanitizes userId for PostgREST .or() filter
- **Error handling**: toggleFavorite checks errors on all 3 DB operations (select, delete, insert)

### Critical Column Naming Convention
- **wallet_accounts table**: Uses `owner_user_id` for user FK (NOT `user_id`)
- **wallet_balances_v2 view**: Uses `user_id` (normalized)
- **unified_wallet_transactions**: Uses `sender_id` / `recipient_id`
- **typed-queries.ts**: All wallet queries use correct column names

### Address Management
- **SettingsAddresses** (`/settings/addresses`): Real DB — reads/writes `user_addresses` table
- **CustomerAddressBookPage** (`/me/address-book`): Real DB — reads/writes `user_addresses` table (unified with SettingsAddresses)
- Both use `supabase.from("user_addresses")` pattern for CRUD

### Smart Cross-Section Bridge
- **Engine**: `src/lib/smart/smart-bridge.ts` — resolves contextual actions for any entity (merchant, contact, listing, service, hotel, property)
- **UI Component**: `src/components/smart/SmartEntityActions.tsx` — renders action pills/grid/compact buttons with loading states
- **Entity builders**: `buildEntityFromMerchant()`, `buildEntityFromContact()`, `buildEntityFromListing()`
- **Actions**: message, voice_call, video_call, phone_call, whatsapp, order, book, taxi_to, deliver_from, view_shop, pay, share, save_contact, navigate
- **Integrations**: ShopPage (merchant CTA row), CommContactsSection (contact detail sheet)
- **Route contract**: Shop links → `/s/{slug}`, Pay → `/wallet/transfer`, Taxi → `/mobility/taxi`
- **Platform bus events**: `mobility:set_destination` for taxi-to-entity, `orbit:contacts_updated` for save-contact

### RadarPage Map Integration
- `filtered` from radarStore is converted to GeoEntity format via `radarPointsToGeoEntities()` 
- Map entities are wired to UnifiedMap with click-to-navigate (slug → `/s/{slug}`)
- Categories filter via discovery store → fetchCanonicalDiscovery pipeline

### Supabase Import Convention
- **ALL files** using `supabase.from()`, `supabase.auth`, `supabase.storage`, `supabase.rpc` MUST import: `import { supabase } from "@/integrations/supabase/client"`
- The `db()` wrapper from `@/services/db.ts` is preferred for table queries (`db("table_name")`)
- 45+ repository and lib files fixed in April 2026 sweep to add missing supabase imports (was causing "Can't find variable: supabase" runtime crashes)

### Typography Minimum Standards
- **Minimum text size**: `text-[9px]` for labels, `text-[10px]` for interactive/body text, `text-xs` (12px) for standard content
- **NEVER use**: `text-[7px]` or `text-[8px]` — globally replaced in April 2026 sweep
- **Card labels**: Always `break-words` + `line-clamp-2` on constrained-width containers
- **Flex children**: Always `min-w-0` on text containers inside flex parents that use `truncate`
- **EssentialServicesStrip**: `w-[58px]` items, `text-[9px]` labels, `gap-2`
- **CategoryGrid**: `w-[76px]` cards, `text-[10px]` labels with `break-words`
