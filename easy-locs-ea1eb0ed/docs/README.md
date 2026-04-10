# Easy-Locs — Technical Documentation

> **Super-App modulaire** de gestion immobilière, marketplace et conciergerie.  
> Stack : React 18 + Vite + TypeScript + Tailwind CSS + Lovable Cloud (Supabase)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Project Structure](#project-structure)
4. [Core Modules](#core-modules)
5. [Design System](#design-system)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Related Documentation](#related-documentation)

---

## Quick Start

```bash
# Install dependencies
npm install   # or bun install

# Start dev server
npm run dev

# Run tests
npx vitest run

# Build for production
npm run build
```

Environment variables are managed automatically by Lovable Cloud (`.env` is auto-generated).

---

## Architecture Overview

Easy-Locs follows the **ORBIT** architecture — a central nervous system connecting all modules:

```
┌──────────────────────────────────────────────────────┐
│                    Platform Bus                       │
│  (wallet · orbit · marketplace · property · deal)    │
├──────────┬──────────┬───────────┬───────────┬────────┤
│  Wallet  │  Orbit   │Marketplace│ Property  │  Deal  │
│  Engine  │  Comms   │  Engine   │ Mgmt      │ Engine │
├──────────┴──────────┴───────────┴───────────┴────────┤
│              Shared Services Layer                    │
│  notification · deep-link · payment · sync · comms   │
├──────────────────────────────────────────────────────┤
│           Lovable Cloud (Supabase)                   │
│  database · auth · storage · edge functions · realtime│
└──────────────────────────────────────────────────────┘
```

### Data Flow (mandatory pattern)

```
UI → Hook → Service → API/Edge Function → DB → Realtime → Platform Bus → UI Refresh
```

---

## Project Structure

```
src/
├── components/          # React UI components (shadcn/ui + custom)
├── hooks/               # Custom React hooks
├── integrations/        # Auto-generated Supabase client & types
├── lib/                 # Core business logic
│   ├── ai-audit/        # 15-engine quality audit system
│   ├── orbit-payments/  # ORBIT payment processing
│   ├── seo/             # SEO generation (sitemaps, meta, JSON-LD)
│   ├── shared/          # Cross-module architecture (see ARCHITECTURE.md)
│   └── templates/       # Document templates
├── pages/               # Route pages
├── test/                # Vitest test suites (450+ tests)
└── styles/              # Global styles & design tokens

supabase/
├── functions/           # 45 edge functions (see API.md)
├── migrations/          # Database migrations (read-only)
└── config.toml          # Auto-managed config

docs/
├── README.md            # This file
├── ARCHITECTURE.md      # Platform Bus, ORBIT, shared modules
└── API.md               # Edge functions reference
```

---

## Core Modules

| Module | Description | Key Files |
|--------|-------------|-----------|
| **Property Management** | Long-term leases, tenants, rents, documents | `pages/Dashboard*`, `lib/accounting-rules.ts` |
| **Seasonal / Booking** | Short-term rentals, booking requests, iCal sync | `pages/Seasonal*`, `lib/shared/sync-engine.ts` |
| **Marketplace** | Concierge services, public listings, deal rooms | `pages/Marketplace*`, `lib/shared/payment-request.ts` |
| **ORBIT Communication** | Encrypted messaging, calls, WebRTC, groups | `lib/orbit-*.ts`, `lib/shared/communication-pipeline.ts` |
| **Wallet** | LOCS token, payments, transfers, SEPA | `lib/locs-wallet.ts`, `lib/orbit-payments/` |
| **AI Audit** | 15-engine quality scoring (SEO, UX, security…) | `lib/ai-audit/` |
| **Security** | Input sanitization, rate limiting, CSRF tokens | `lib/security-utils.ts` |

---

## Design System

- **Tokens**: All colors defined as HSL in `src/index.css` via CSS custom properties
- **Components**: shadcn/ui with custom variants in `src/components/ui/`
- **Usage**: Always use semantic classes (`bg-primary`, `text-muted-foreground`) — never raw colors
- **Dark mode**: Supported via `.dark` class toggle

---

## Testing

```bash
npx vitest run          # Run all tests
npx vitest run --watch  # Watch mode
npx vitest run src/test/security-utils.test.ts  # Single file
```

**Coverage**: 450+ tests across 35 files covering:
- Security utilities (XSS, sanitization, rate limiting)
- SEO generation (sitemaps, meta tags)
- CSV export/import
- Core module integrity
- Performance utilities (debounce, throttle)

---

## Deployment

- **Frontend**: Click "Publish" → "Update" in Lovable editor
- **Backend**: Edge functions deploy automatically on save
- **Database**: Migrations applied through Lovable Cloud
- **Domain**: `easy-locs.com` (custom domain via Lovable settings)

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Platform Bus, ORBIT engine, shared module design
- [API.md](./API.md) — All 45 edge functions with endpoints and payloads
