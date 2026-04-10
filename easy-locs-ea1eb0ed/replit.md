# Easy-Locs Super App

## Overview
Easy-Locs is a worldwide super-app (190+ countries, 120+ currencies, 31 languages) built with React + Vite + TypeScript + Supabase. Five main pillars: Dashboard, Radar, Orbit, Wallet, Me.

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
