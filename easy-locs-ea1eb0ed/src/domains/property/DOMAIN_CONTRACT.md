# Domain Contract — Property

## Owner
Property & Real-Estate Team

## Purpose
The Property domain owns all real-estate asset management: properties, units, leases, tenants, rental payments, documents, fiscal reporting, and seasonal-rental bookings. It serves both landlord self-management and the real-estate marketplace listing surface.

## Canonical Invariants
- **A property belongs to exactly one landlord account** at any given time.
- **A unit can have at most one active lease** at any point in time.
- **Rental payments are immutable once recorded** — corrections are made via reversal entries, not overwrites.
- **All property mutations** route through the service layer (`src/services/db.ts` via domain repositories) — no direct Supabase calls from `.tsx` files.

## Key Aggregates
| Aggregate | Description |
|---|---|
| `Property` | A physical real-estate asset (building, villa, apartment) |
| `Unit` | A leasable sub-unit of a property |
| `Lease` | A binding rental agreement between landlord and tenant |
| `RentalPayment` | A payment record tied to a lease |
| `Tenant` | A person associated with one or more leases |
| `Document` | Uploaded file attached to any aggregate |

## Public Interface
Consumed via `src/services/db.ts` repository methods. There are no shared ports file yet — one must be created before adding new cross-domain integrations.

## Domain Events (to be formalised)
- `property.lease_created`
- `property.lease_terminated`
- `property.payment_recorded`
- `property.unit_listed`
- `property.unit_unlisted`

## Anti-Corruption Layer
- External listing platform data (Airbnb, Booking.com via Channel Manager) is normalised into `SeasonalRental` types before entering the domain.
- Property must not import from Orbit, Wallet, or Marketplace directly.

## UI Rule
- Dashboard views (`/dashboard`, sub-pages) are strictly read-only. They display aggregates but never write.
- Write operations (add property, record payment, sign lease) are initiated from dedicated form pages that call `db.ts` service methods.

## Data Ownership
Tables: `properties`, `units`, `leases`, `tenants`, `rental_payments`, `documents`, `seasonal_rentals` — owned exclusively by this domain.
