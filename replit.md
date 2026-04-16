# Easy-Locs Super-App v3

## Overview
Easy-Locs is a world-class super-app built around 5 intelligently connected pillars:
**Dashboard · Radar · Orbit · Wallet · Me**

## Internal Factory Labs (Task #473)
8 internal laboratories for self-sufficient development operations:
- **Developer CLI** (`scripts/el-cli.ts`, npm script `el`) — Scaffolds domains, components, pages, Edge Functions, services with boilerplate
- **Performance Lab** (`scripts/perf-audit.ts`, admin page `/admin/performance-lab`) — Web Vitals tracking, bundle size regression, per-pillar scores
- **Data Lab** (admin page `/admin/data-lab`) — Master Data Pipeline visualization, entity lifecycle tracing, failure rates
- **Security Lab** (`scripts/security-scan.ts`, admin page `/admin/security-lab`) — Dependency vulnerability scanning, fraud detection, security events
- **Release Factory** (`scripts/changelog-generator.ts`, `scripts/version-bump.ts`, admin page `/admin/release-history`) — Auto-changelog, semantic versioning, release timeline
- **Notification Lab** (admin page `/admin/notification-lab`) — Email template preview, language switching, delivery analytics, test send
- **Experiment Lab** (admin page `/admin/experiment-lab`) — A/B testing dashboard, variant analysis, chi-squared significance, lifecycle management
- **API Factory** (`scripts/api-doc-generator.ts`, `scripts/sdk-generator.ts`, page `/developer-portal/docs`) — Auto-generated OpenAPI spec, TypeScript SDK, webhook catalog
- **Architecture Lab** (admin page `/admin/architecture-lab`) — Import boundary audit, domain ownership map, architecture grade, historical trends
- **Lab Hub** (admin page `/admin/lab-hub`) — Central hub linking all labs with health indicators and Factory Score

Built with React + Vite + TypeScript, backed by Supabase. Property management, marketplace, communication, digital wallet, and service discovery — unified under one roof.

## DLD API Integration (Task #530)
The market intelligence page connects to the live Dubai Land Department (DLD) REST API for real-time transaction data.

### Architecture
- **DLD API Client**: `supabase/functions/_shared/dld-api-client.ts` - Shared module for fetching and normalizing DLD API responses
- **Edge Function**: `supabase/functions/dld-analytics/index.ts` - Multi-endpoint router that:
  1. Tries to fetch fresh data from the live DLD API (when `DLD_API_KEY` is configured)
  2. Upserts fetched data into `analytics.dld_transactions` Supabase table
  3. Serves analytics queries from the database
- **Frontend Service**: `src/services/dld-analytics.service.ts` - Calls edge functions first, falls back to hardcoded demo data only when edge functions are unavailable
- **Fallback Data**: `src/data/fallback-dld-transactions.ts` - Realistic generated data used only when live API and database are both unavailable

### Environment Variables
- `DLD_API_KEY` - API key for the DLD REST API (required for live data)
- `DLD_API_URL` - Base URL for DLD API (defaults to `https://gateway.dubailand.gov.ae/open-data`)
- `VITE_SUPABASE_EDGE_URL` - Base URL for Supabase edge functions (frontend)

### Endpoints
- `sync` - Triggers a data sync from DLD API into Supabase
- `status` - Returns current data source configuration and record counts
- `kpis`, `districts`, `trends`, `transactions`, `top-transactions`, `building-history`, `comparables`, `buildings`, `summary` - Analytics query endpoints

### Data Flow
```
DLD REST API -> Edge Function (fetch + normalize) -> Supabase DB -> Edge Function (query) -> Frontend
                                                                                         |
                                                                           Fallback Demo Data (if edge function unavailable)
```

## Phase 2 Feature Expansion Engine

### ML Recommendation Engine (`src/engines/recommendations/recommendation-engine.ts`)
- pgvector cosine similarity RPC via `vector-similarity-search` edge function
- Open-Meteo weather API contextual signals (rainy/hot/cold/sunny boosts)
- Recency decay (7-day half-life exponential decay)
- `scoreRecommendationsAsync()` for async pgvector + weather pipeline
- Synchronous `scoreRecommendations()` fallback preserved

### Bank Linking — Plaid (`src/services/plaid.service.ts`, `src/components/payments/BankLinking.tsx`)
- Link token creation, public token exchange, ACH transfers
- Income verification via edge function
- UI: account cards, balance display, inline top-up with amount input

### E-Signatures (`src/services/e-signature.service.ts`, `src/components/payments/ESignatureFlow.tsx`)
- Signing envelope creation (landlord + tenant parties)
- Canvas signature pad with touch/mouse drawing
- Party-level status tracking (pending/signed/declined)
- Signed document download

### OCR for KYC (`src/services/ocr.service.ts`, `src/components/payments/KycDocumentScanner.tsx`)
- Tesseract.js worker integration with confidence scoring
- Field extraction: name, DOB, document number, expiry, nationality, gender
- Document type detection (passport, ID card, driver's license)
- Camera capture + file upload, editable review with re-scan

### LiveKit Video Infrastructure (`src/hooks/useLiveKitRoom.ts`, `src/lib/webrtc/peer.ts`)
- `useLiveKitRoom` hook: connect/disconnect, mute/camera/screen share toggles, recording
- `createLiveKitConnection()` and `connectToRoom()` with graceful fallback to raw WebRTC
- Adaptive streaming, dynacast, multi-participant support
- Env var: `VITE_LIVEKIT_WS_URL`

### BNPL Checkout (`src/components/payments/BnplCheckout.tsx`)
- Eligibility check, installment count selector (3/6/12)
- Payment schedule preview with date/amount breakdown
- 0% interest badge, expandable UI

### Micro-Insurance (`src/components/payments/MicroInsurance.tsx`)
- Toggle switch for package/trip protection at checkout
- Dynamic premium calculation based on order amount
- Coverage details accordion with line items

### Search Resolver Upgrade (`src/lib/search-engine/search-resolver.ts`)
- Meilisearch primary via `meilisearch-query` edge function
- Faceted filters (vertical, subcategory, city)
- Sort: price_asc/desc, rating, newest
- Graceful fallback: Meilisearch → search-global FTS → client-side

### i18n Expansion (`src/lib/i18n-data/translations-super-app.ts`)
- New feature keys for esign, OCR, bank, video, BNPL in 6 languages (en, fr, ar, es, pt, tr)
- Language selector component (`src/components/i18n/LanguageSelector.tsx`) with Intl.DisplayNames
- RTL support via `dir` attribute on document root + CSS logical properties (`-end`/`-start`)

### Social Graph Enrichment
- Mutual friend badge with `UserCheck` icon overlay on avatars
- i18n-aware `FollowersList` and `FollowingFeed` components
- Activity type label keys for feed items

## Frontend Speed Engine (Phase 1B)
... (rest of the file)
