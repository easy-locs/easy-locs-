# Pillar Boundaries

## Domain Architecture
The Easy-Locs platform is organized into distinct domain pillars. Each pillar owns its UI, logic, and data layer. Cross-pillar communication happens exclusively through the ORBIT Platform Bus.

## Pillars

### 1. Wallet & Payments (`src/domains/wallet/`)
- Wallet balance, top-ups, transfers
- Stripe Checkout / SEPA integration
- LOCs token purchases
- Payment request lifecycle
- **Owns**: wallet-related Supabase tables, Stripe webhook handlers

### 2. Property Management (`src/domains/property/`)
- Lease management, rent collection
- Tenant records, documents
- Intervention/maintenance tracking
- Legal notice generation
- **Owns**: properties, tenants, leases tables

### 3. Marketplace (`src/domains/marketplace/`)
- Concierge service listings
- Booking flow (create → approve → pay → complete)
- Seasonal rental management
- **Owns**: concierge_services, concierge_orders, booking_requests tables

### 4. Communication / ORBIT (`src/domains/orbit/`)
- End-to-end encrypted messaging (X3DH + Double Ratchet)
- Voice/video calls (WebRTC with TURN)
- Thread management
- **Owns**: conversation_threads, messages tables

### 5. Real Estate / Deal Room (`src/domains/real-estate/`)
- Property listings for sale
- Negotiation rooms with offer/counter-offer
- Deal lifecycle management
- **Owns**: deal_rooms, deal_events tables

## Additional Domains
| Domain | Path | Purpose |
|--------|------|---------|
| Dashboard | `src/domains/dashboard/` | Aggregated views, KPIs |
| Admin | `src/domains/admin/` | Platform administration |
| Delivery | `src/domains/delivery/` | Delivery tracking |
| Cards | `src/domains/cards/` | Virtual/physical cards |
| Explore | `src/domains/explore/` | Discovery & search |
| Flight | `src/domains/flight/` | Flight booking |
| Ride | `src/domains/ride/` | Ride-hailing |
| QR | `src/domains/qr/` | QR payment |
| SEO | `src/domains/seo/` | SEO pages |
| Map | `src/domains/map/` | Map views |
| Content Pipeline | `src/domains/content-pipeline/` | Content management |
| i18n | `src/domains/i18n/` | Internationalization |
| Radar | `src/domains/radar/` | Analytics radar |
| Revenue | `src/domains/revenue/` | Revenue tracking |

## Boundary Rules for Agents
1. **No cross-pillar imports**: Domain A must never import directly from Domain B's internal modules
2. **Shared code goes to `src/lib/shared/`**: If two pillars need the same logic, extract to shared
3. **Bus-only communication**: Cross-pillar data flow must go through `platformBus.emit()` / `.on()`
4. **Type sharing via `src/lib/shared/types.ts`**: Common types live in the shared layer
5. **Each domain owns its routes**: No domain should define routes for another domain
6. **Store isolation**: Each domain has its own Zustand stores; never import another domain's store directly
