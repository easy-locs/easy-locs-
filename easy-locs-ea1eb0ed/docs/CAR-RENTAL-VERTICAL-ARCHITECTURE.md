# Car Rental Vertical — Architecture Document

> **Status**: Design-only. No code changes accompany this document.
> **Author**: Architecture team
> **Date**: 2026-04-12
> **Scope**: Defines the complete technical architecture for elevating Car Rental from a mobility subcategory to a first-class travel vertical within the Easy-Locs super-app.

---

## Table of Contents

1. [Mandatory Declaration](#1-mandatory-declaration)
2. [Current State Audit](#2-current-state-audit)
3. [Comparison: Car Rental vs Existing Verticals](#3-comparison-car-rental-vs-existing-verticals)
4. [Domain Boundaries](#4-domain-boundaries)
5. [Taxonomy Reclassification Recommendation](#5-taxonomy-reclassification-recommendation)
6. [Canonical Data Models](#6-canonical-data-models)
7. [Booking Lifecycle & State Machine](#7-booking-lifecycle--state-machine)
8. [Search, Discovery & Flow](#8-search-discovery--flow)
9. [5-Pillar Integration (Dashboard, Radar, Orbit, Wallet, Me)](#9-5-pillar-integration-dashboard-radar-orbit-wallet-me)
10. [Provider Adapter Architecture](#10-provider-adapter-architecture)
11. [Event Model & Platform Bus](#11-event-model--platform-bus)
12. [Anti-Conflict & Coexistence Rules](#12-anti-conflict--coexistence-rules)
13. [Taxonomy, Routing & Security](#13-taxonomy-routing--security)
14. [Migration Without Runtime Disruption](#14-migration-without-runtime-disruption)
15. [Multi-Provider Strategy, Phasing & Risks](#15-multi-provider-strategy-phasing--risks)
16. [Final Recommendation & Decision Matrix](#16-final-recommendation--decision-matrix)

---

## 1. Mandatory Declaration

This document is **architecture-only**. It prescribes no runtime code changes, no database migrations, and no file edits to any existing source. Every recommendation in this document MUST be implemented through a separate, tracked task with its own code review cycle.

All proposed types, state machines, wiring declarations, routes, and event schemas described herein are **design artifacts**. They represent the target state and carry no side effects on the running application.

---

## 2. Current State Audit

Car Rental currently exists as a **subcategory** nested under the `taxi` primary category in the mobility vertical. It appears in **5 canonical files** plus **3 derived contract surfaces** that must also be updated:

### Primary Files (Direct References)

| File | Location | Current Shape |
|------|----------|---------------|
| `category-tree.ts:526` | `CATEGORY_TREE[7].subcategories[2]` | `{ value: "car_rental", label: "Car Rental", emoji: "🚗", cluster: "transport" }` |
| `classification-engine.ts:133-135` | Brand rules | Maps Hertz, Avis, Sixt → `category: "taxi"`, `subcategory: "car_rental"` |
| `canonical-registry.ts:1244-1262` | `MOBILITY_FAMILY.categories[1]` | Own category key `"rental"` with single subcategory `car_rental` under MOBILITY_FAMILY |
| `world-class-taxonomy.ts:217` | `SERVICE_MODE_ENRICHMENT` | `car_rental: ["onsite"]` |
| `module-wiring.ts:452` | `taxi.dashboard.shortcuts` | Listed as `"car_rental"` shortcut alongside taxi, chauffeur, premium |

### Derived Contract Surfaces (Must Also Be Updated)

| File | Location | Issue |
|------|----------|-------|
| `category-tree.ts:22-32` | `ArchitectureType` union | Does NOT include `"rental_booking"` — new value must be added to the union |
| `category-tree.ts:34-43` | `FulfillmentType` union | Does NOT include `"rental_contract"` — new value must be added to the union |
| `world-class-taxonomy.ts:348-366` | `mapCategoryKeyToVertical()` | Hardcoded key map has no `car_rental` entry — would fallback to `"services"` |
| `module-wiring.ts:946-967` | `getVerticalForCategoryKey()` | Hardcoded key map has no `car_rental` entry — would return `null` |

### Inherited (Incorrect) Behaviors

Because `car_rental` inherits from the `taxi` primary, it currently receives:

| Dimension | Inherited Value | Correct Value for Car Rental |
|-----------|----------------|------------------------------|
| `architecture` | `mobility_taxi` | `calendar_booking` or `rental_booking` |
| `fulfillment` | `taxi` | `rental_contract` |
| `walletFlow` | `fare_hold` | `booking_deposit` |
| `orbitContext` | `job` | `booking` |
| `mapBehavior` | `live_tracking` | `listing_pins` |
| `billingType` | `per_ride` | `per_booking` |
| `entityLink` | `job` | `booking` |
| `previewWidget` | `orders` | `bookings` |
| `discoveryMode` | `proximity` (ETA-based) | `search` (date-range + location) |

**Conclusion**: Car Rental is fundamentally a **date-range booking** product (like Stay/Flights), not a **real-time dispatch** product (like Taxi). Every inherited behavior from the mobility/taxi vertical is semantically wrong.

---

## 3. Comparison: Car Rental vs Existing Verticals

### 3.1 Behavioral Affinity Matrix

| Dimension | Taxi | Flight | Stay | Services | **Car Rental** |
|-----------|------|--------|------|----------|---------------|
| Booking model | Real-time dispatch | Date-range search → book | Date-range search → book | Slot-based | **Date-range search → book** |
| Pricing model | Dynamic fare (distance + surge) | Fare classes + taxes | Nightly rate × nights | Quoted/fixed | **Daily rate × days + extras** |
| Inventory | Driver availability (live) | Seat inventory (GDS) | Room inventory (calendar) | Time slots | **Fleet inventory (calendar)** |
| Fulfillment | Ride (pickup → dropoff) | Ticket issuance | Check-in → check-out | Appointment | **Pickup → return** |
| Cancellation | Free until accepted | Fare rules (refundable/non) | Policy-based (free period) | Policy-based | **Policy-based (free period)** |
| Payment | Fare hold → capture | Full prepay or hold | Deposit → balance | Deposit → balance | **Deposit → balance at pickup** |
| Multi-provider | Single driver match | Amadeus, Sabre, etc. | Booking.com, direct | Single provider | **Hertz, Avis, Sixt, local** |
| Map behavior | Live tracking | None (airport pins) | Listing pins | Provider pins | **Location/branch pins** |
| Duration | Minutes | Hours (flight time) | Days (nights) | Hours | **Days (rental period)** |

### 3.2 Affinity Score

| Vertical | Affinity to Car Rental (0-10) | Reasoning |
|----------|-------------------------------|-----------|
| Taxi | 2 | Same "vehicle" concept, but completely different booking/fulfillment model |
| Flight | 7 | Multi-provider aggregation, date-range search, complex cancellation policies |
| Stay | 8 | Calendar-based inventory, daily pricing, deposit flow, check-in/check-out ≈ pickup/return |
| Services | 4 | Booking concept exists, but services are slot-based not date-range |

**Highest affinity: Stay (8/10), then Flight (7/10)**. Car Rental should share architectural patterns with Stay/Flight, not Taxi.

---

## 4. Domain Boundaries

### 4.1 Bounded Context: `car-rental`

```
src/domains/car-rental/
├── car-rental-types.ts          # Canonical types (§6)
├── car-rental-state-machine.ts  # Booking lifecycle (§7)
├── car-rental-provider.ts       # Provider adapter interface (§10)
├── car-rental-search.ts         # Search orchestration (§8)
├── car-rental-events.ts         # Event schemas (§11)
└── car-rental-wiring.ts         # 5-pillar wiring constants (§9)
```

### 4.2 What Car Rental OWNS

- Vehicle offer/quote model
- Rental booking lifecycle (state machine)
- Provider adapter interface (multi-provider)
- Search parameters (pickup location, dates, vehicle class)
- Rental-specific extras (insurance, GPS, child seat, additional driver)
- Pickup/return location management
- Rental agreement/contract document type

### 4.3 What Car Rental DOES NOT OWN (Shared Platform)

- Payment processing → Wallet vertical (`booking_deposit` flow)
- Messaging/support → Orbit vertical (`booking` entity link)
- User identity & documents → Me vertical
- Map rendering → Radar shared map layer (`listing_pins`)
- Notifications → Platform bus
- Currency/locale → Shared i18n
- Classification engine → Taxonomy layer
- State machine infrastructure → `Machine<S, E>` from `state-machines.ts`

### 4.4 Integration Seams

| Seam | Direction | Contract |
|------|-----------|----------|
| Car Rental → Wallet | Outbound | `booking_deposit` payment flow; `per_booking` billing |
| Car Rental → Orbit | Outbound | Thread type `rental_support`; entity link `booking` |
| Car Rental → Platform Bus | Bidirectional | Emits `car_rental.*` events; listens for `payment.*` reactions |
| Car Rental → Classification Engine | Inbound | Engine routes Hertz/Avis/Sixt to `travel:car_rental` |
| Car Rental → Radar | Outbound | Provides `rental_branch` entity type for map discovery |
| Car Rental → Dashboard | Outbound | `bookings` preview widget |
| Car Rental → Me | Outbound | `rental_history` history type |

---

## 5. Taxonomy Reclassification Recommendation

### 5.1 Option Analysis

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. Stay under `taxi`** | Keep as-is | Zero changes | All behaviors wrong; will confuse every consumer |
| **B. New subcategory under `travel`** | Add to existing `travel` primary | Natural fit with flights; `travel` already exists in `VerticalKey` | `travel` primary doesn't exist in `category-tree.ts` (flights are handled differently) |
| **C. New primary category `car_rental`** | Top-level primary in `CATEGORY_TREE` | Clean separation; own architecture/fulfillment/wallet | Proliferates primaries; may not justify standalone primary |
| **D. New primary under `travel` umbrella** | Create `travel_car_rental` primary, vertical `"travel"` | Shares `travel` vertical with flights; clean wiring | Requires adding category-tree entry; `VerticalKey` already has `"travel"` |

### 5.2 Recommendation: **Option D — New Primary Category, Travel Vertical**

Create a new `CATEGORY_TREE` entry.

> **Type Union Prerequisites**: Before this entry can be added, the `ArchitectureType` union in `category-tree.ts:22` must be extended with `| "rental_booking"`, and the `FulfillmentType` union at line 34 must be extended with `| "rental_contract"`. Without these additions, TypeScript will reject the new primary entry.

```typescript
{
  key: "car_rental",
  label: "Car Rental",
  emoji: "🚗",
  vertical: "travel",
  architecture: "rental_booking",   // NEW — must be added to ArchitectureType union
  fulfillment: "rental_contract",   // NEW — must be added to FulfillmentType union
  mobilityJobType: null,
  walletFlow: "booking_deposit",
  orbitContext: "booking",
  mapBehavior: "listing_pins",
  route: "/travel/car-rental",
  subtitle: "Rent a car anywhere",
  capabilities: {
    can_delivery: false,
    can_pickup: true,
    can_schedule: true,
    requires_ready_state: false,
    requires_parcel_details: false,
    requires_calendar: true,
    requires_menu: false,
    requires_catalog: true,
    requires_service_slots: false,
    requires_rooms: false,
    requires_inventory: true,
    supports_tracking: false,
  },
  subcategories: [
    { value: "economy_car", label: "Economy", emoji: "🚗", cluster: "vehicle_class", tags: ["compact", "economy", "budget"] },
    { value: "midsize_car", label: "Midsize", emoji: "🚙", cluster: "vehicle_class", tags: ["midsize", "sedan", "standard"] },
    { value: "suv", label: "SUV", emoji: "🚙", cluster: "vehicle_class", tags: ["suv", "crossover", "4x4"] },
    { value: "luxury_car", label: "Luxury", emoji: "🏎️", cluster: "vehicle_class", tags: ["luxury", "premium", "executive"] },
    { value: "van_minibus", label: "Van / Minibus", emoji: "🚐", cluster: "vehicle_class", tags: ["van", "minibus", "people carrier", "group"] },
    { value: "convertible", label: "Convertible", emoji: "🚗", cluster: "vehicle_class", tags: ["convertible", "cabriolet", "open top"] },
    { value: "electric_car", label: "Electric", emoji: "⚡", cluster: "vehicle_class", tags: ["electric", "ev", "hybrid", "green"] },
    { value: "pickup_truck", label: "Pickup Truck", emoji: "🛻", cluster: "vehicle_class", tags: ["truck", "pickup", "utility"] },
  ],
}
```

### 5.3 Files Requiring Taxonomy Updates (Implementation Phase Only)

All changes in this table MUST land in a single atomic PR (see §14, Phase M3).

| File | Change |
|------|--------|
| `category-tree.ts:22-32` | Extend `ArchitectureType` union: add `\| "rental_booking"` |
| `category-tree.ts:34-43` | Extend `FulfillmentType` union: add `\| "rental_contract"` |
| `category-tree.ts` (CATEGORY_TREE) | Add new primary entry (§5.2). Remove `car_rental` from `taxi.subcategories`. |
| `classification-engine.ts` | Update Hertz/Avis/Sixt brand rules: `category: "car_rental"` (not `"taxi"`). |
| `canonical-registry.ts` | Move `car_rental` from `MOBILITY_FAMILY` to new `CAR_RENTAL_FAMILY` (or `TRAVEL_FAMILY`). |
| `world-class-taxonomy.ts:348-366` | Add `car_rental: "experiences"` to `mapCategoryKeyToVertical()` key map (or better: map to a new `"car_rental"` Vertical if extending the Vertical type). Update `SERVICE_MODE_ENRICHMENT["car_rental"]` to `["onsite", "delivery"]`. |
| `module-wiring.ts:452` | Remove `"car_rental"` from `taxi.dashboard.shortcuts`. |
| `module-wiring.ts:946-967` | Add `car_rental: "travel"` to `getVerticalForCategoryKey()` key map. |

---

## 6. Canonical Data Models

### 6.1 Core Types

```typescript
type RentalBookingStatus =
  | "searching"
  | "quoted"
  | "selected"
  | "booking_pending"
  | "payment_pending"
  | "payment_confirmed"
  | "confirmed"
  | "pickup_ready"
  | "active"
  | "return_pending"
  | "completed"
  | "cancelled"
  | "failed"
  | "refund_pending"
  | "refunded";

type VehicleClass =
  | "economy" | "compact" | "midsize" | "standard"
  | "fullsize" | "premium" | "luxury" | "suv"
  | "minivan" | "van" | "convertible" | "electric"
  | "pickup_truck" | "sports";

type TransmissionType = "automatic" | "manual";

type FuelType = "petrol" | "diesel" | "electric" | "hybrid" | "plugin_hybrid";

type InsuranceType = "basic" | "standard" | "premium" | "full_coverage";

type MileagePolicy = "unlimited" | "limited";

type RentalExtra =
  | "gps" | "child_seat" | "additional_driver" | "wifi"
  | "snow_chains" | "roof_rack" | "roadside_assistance"
  | "full_insurance" | "young_driver_surcharge"
  | "cross_border" | "one_way_fee";

type PickupReturnType = "branch" | "airport" | "hotel_delivery" | "custom_address";

type PaymentMode = "platform" | "provider_direct" | "hybrid";
```

### 6.2 Search Parameters

```typescript
interface CarRentalSearchParams {
  pickupLocation: string;
  pickupLocationType: PickupReturnType;
  pickupCoordinates?: { lat: number; lng: number };
  returnLocation: string;
  returnLocationType: PickupReturnType;
  returnCoordinates?: { lat: number; lng: number };
  pickupDate: string;          // ISO 8601
  pickupTime: string;          // HH:mm
  returnDate: string;          // ISO 8601
  returnTime: string;          // HH:mm
  vehicleClass?: VehicleClass;
  transmission?: TransmissionType;
  fuelType?: FuelType;
  minSeats?: number;
  currency: string;
  locale?: string;
  driverAge?: number;
  extras?: RentalExtra[];
  providerIds?: string[];      // filter to specific providers
}
```

### 6.3 Vehicle Offer

```typescript
interface CarRentalOffer {
  offerId: string;
  providerId: string;
  providerOfferRef: string;
  vehicle: {
    vehicleClass: VehicleClass;
    make: string;
    model: string;
    year?: number;
    transmission: TransmissionType;
    fuelType: FuelType;
    seats: number;
    doors: number;
    bags: { large: number; small: number };
    airConditioning: boolean;
    imageUrl?: string;
  };
  pickup: {
    locationId: string;
    locationName: string;
    locationType: PickupReturnType;
    address: string;
    coordinates: { lat: number; lng: number };
    dateTime: string;
    instructions?: string;
  };
  return: {
    locationId: string;
    locationName: string;
    locationType: PickupReturnType;
    address: string;
    coordinates: { lat: number; lng: number };
    dateTime: string;
    instructions?: string;
  };
  pricing: {
    dailyRate: number;
    totalDays: number;
    subtotal: number;
    taxes: number;
    fees: number;
    extrasTotal: number;
    totalPrice: number;
    currency: string;
    depositAmount: number;
    includedExtras: RentalExtra[];
    availableExtras: { extra: RentalExtra; price: number }[];
  };
  insurance: {
    included: InsuranceType;
    excessAmount: number;
    upgradeOptions: { type: InsuranceType; additionalCost: number }[];
  };
  mileage: {
    policy: MileagePolicy;
    includedKm?: number;
    excessRatePerKm?: number;
  };
  cancellation: {
    freeCancellationUntil?: string;
    cancellationFee?: number;
    cancellationFeePct?: number;
    refundable: boolean;
  };
  validUntil: string;
  providerRating?: number;
  providerReviewCount?: number;
}
```

### 6.4 Rental Booking

```typescript
interface CarRentalBooking {
  bookingId: string;
  userId: string;
  status: RentalBookingStatus;
  providerId: string;
  providerBookingRef?: string;
  offer: CarRentalOffer;
  driver: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    licenseNumber: string;
    licenseCountry: string;
    licenseExpiry: string;
  };
  additionalDrivers?: {
    firstName: string;
    lastName: string;
    licenseNumber: string;
    licenseCountry: string;
  }[];
  selectedExtras: RentalExtra[];
  selectedInsurance: InsuranceType;
  paymentMode: PaymentMode;
  paymentRef?: string;
  depositAmount: number;
  totalAmount: number;
  currency: string;
  platformFee: number;
  providerAmount: number;
  holdExpiresAt?: string;
  confirmationNumber?: string;
  contractDocumentUrl?: string;
  failureReason?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}
```

### 6.5 Provider Configuration

```typescript
interface CarRentalProviderConfig {
  providerId: string;
  name: string;
  enabled: boolean;
  apiBaseUrl: string;
  supportedCountries?: string[];
  supportedCurrencies?: string[];
  paymentMode: PaymentMode;
  commissionPct: number;
  timeout: number;
  retryAttempts: number;
  webhookSecret?: string;
  priority: number;
  features: {
    supportsOneWay: boolean;
    supportsDelivery: boolean;
    supportsCrossBorder: boolean;
    supportsYoungDriver: boolean;
    minDriverAge: number;
    maxDriverAge?: number;
  };
}
```

---

## 7. Booking Lifecycle & State Machine

### 7.1 State Machine Definition

Following the canonical `Machine<S, E>` pattern from `src/domains/shared/state-machines.ts`:

```typescript
type RentalEvent =
  | "SEARCH"
  | "QUOTE"
  | "SELECT"
  | "SUBMIT_BOOKING"
  | "REQUEST_PAYMENT"
  | "CONFIRM_PAYMENT"
  | "CONFIRM_BOOKING"
  | "MARK_PICKUP_READY"
  | "ACTIVATE"
  | "INITIATE_RETURN"
  | "COMPLETE"
  | "CANCEL"
  | "FAIL"
  | "REQUEST_REFUND"
  | "PROCESS_REFUND";

const CAR_RENTAL_MACHINE: Machine<RentalBookingStatus, RentalEvent> = {
  searching:         { QUOTE: "quoted", FAIL: "failed", CANCEL: "cancelled" },
  quoted:            { SELECT: "selected", CANCEL: "cancelled" },
  selected:          { SUBMIT_BOOKING: "booking_pending", CANCEL: "cancelled" },
  booking_pending:   { REQUEST_PAYMENT: "payment_pending", FAIL: "failed", CANCEL: "cancelled" },
  payment_pending:   { CONFIRM_PAYMENT: "payment_confirmed", FAIL: "failed", CANCEL: "cancelled" },
  payment_confirmed: { CONFIRM_BOOKING: "confirmed", FAIL: "failed" },
  confirmed:         { MARK_PICKUP_READY: "pickup_ready", CANCEL: "cancelled" },
  pickup_ready:      { ACTIVATE: "active", CANCEL: "cancelled" },
  active:            { INITIATE_RETURN: "return_pending" },
  return_pending:    { COMPLETE: "completed" },
  completed:         { REQUEST_REFUND: "refund_pending" },
  cancelled:         {},
  failed:            {},
  refund_pending:    { PROCESS_REFUND: "refunded", FAIL: "failed" },
  refunded:          {},
};
```

### 7.2 State Diagram

```
searching → quoted → selected → booking_pending → payment_pending
                                                        ↓
                                               payment_confirmed
                                                        ↓
                                                    confirmed
                                                        ↓
                                                  pickup_ready
                                                        ↓
                                                      active
                                                        ↓
                                                 return_pending
                                                        ↓
                                                    completed → refund_pending → refunded
                                                    
Any non-terminal state → cancelled (via CANCEL)
Any pre-confirmation state → failed (via FAIL)
```

### 7.3 Terminal vs Near-Terminal States

**True Terminal States** (no outbound transitions):
- `cancelled` — Cancelled by user or provider
- `failed` — System/provider failure
- `refunded` — Refund processed after completion

**Near-Terminal State** (limited outbound):
- `completed` — Rental finished successfully. Has one outbound transition (`REQUEST_REFUND` → `refund_pending`) because post-completion refunds are a valid business flow. For `isTerminal()` purposes, `completed` should be registered as terminal since it represents successful fulfillment.

Register in `TERMINAL_STATES` (§7.6) as: `car_rental: new Set(["completed", "cancelled", "failed", "refunded"])`

### 7.4 Comparison with Flight Machine

| Aspect | Flight | Car Rental | Delta |
|--------|--------|------------|-------|
| Pre-booking states | `searching → priced → selected` | `searching → quoted → selected` | Semantic rename only |
| Payment flow | `payment_pending → payment_confirmed` | Same | Identical |
| Fulfillment | `ticketing_in_progress → ticketed` | `confirmed → pickup_ready → active → return_pending → completed` | Car Rental has richer post-confirmation lifecycle |
| Post-completion | `refund_pending → refunded` | Same | Identical |

### 7.5 Integration with `safeTransition`

> **Note**: The `Machine<S, E>` type and `createTransition` helper in `state-machines.ts` are file-local (not exported). The car rental state machine file (`car-rental-state-machine.ts`) must either:
> (a) Duplicate the `Machine<S, E>` type locally (small, acceptable duplication), or
> (b) Export the type from `state-machines.ts` in a preparatory PR.
>
> Option (b) is recommended for consistency. The `safeTransition` function IS exported and accepts any machine conforming to the `Record<S, Partial<Record<E, S>>>` shape.

```typescript
import { safeTransition } from "@/domains/shared/state-machines";

const result = safeTransition(
  CAR_RENTAL_MACHINE,
  `car-rental:${bookingId}`,
  currentStatus,
  event
);
```

### 7.6 TERMINAL_STATES Registration

Add to the `TERMINAL_STATES` record in `state-machines.ts`:

```typescript
car_rental: new Set(["completed", "cancelled", "failed", "refunded"]),
```

---

## 8. Search, Discovery & Flow

### 8.1 Search Flow Architecture

```
User Input (location, dates, class, extras)
        ↓
  CarRentalSearch.execute(params)
        ↓
  ┌─────────────────────────────────┐
  │  Provider Adapter Fan-Out       │
  │  ├── HertzAdapter.search()      │
  │  ├── AvisAdapter.search()       │
  │  ├── SixtAdapter.search()       │
  │  └── LocalFleetAdapter.search() │
  └─────────────────────────────────┘
        ↓
  Offer Normalization (→ CarRentalOffer[])
        ↓
  Deduplication & Ranking
        ↓
  Return sorted offers to UI
```

### 8.2 Search Orchestration Rules

1. **Parallel fan-out**: All enabled providers are queried simultaneously with individual timeouts.
2. **Partial results**: If Provider A responds and Provider B times out, return Provider A's results with a degradation notice.
3. **Normalization**: Every provider response is mapped to the canonical `CarRentalOffer` type before reaching the UI.
4. **Deduplication**: Same vehicle class + same pickup location + price within 2% tolerance = deduplicate, prefer higher-priority provider.
5. **Ranking**: Default sort by `totalPrice ASC`. Alternative sorts: `vehicleClass`, `providerRating`, `freeCancellation`.

### 8.3 Search vs Flight/Stay Comparison

| Dimension | Flight | Stay | Car Rental |
|-----------|--------|------|------------|
| Primary key | Origin + Destination + Dates | Location + Check-in/out | Pickup Location + Pickup/Return Dates |
| Secondary filters | Cabin class, stops, airlines | Star rating, amenities, property type | Vehicle class, transmission, fuel, extras |
| Inventory unit | Seat | Room-night | Vehicle-day |
| Multi-provider | Yes (GDS) | Yes (OTA + direct) | Yes (brand APIs + local) |
| Price model | Fare class | Nightly rate | Daily rate |

### 8.4 UI Flow (Route Sequence)

```
/travel/car-rental                    → CarRentalHub (search form)
/travel/car-rental/results            → CarRentalResults (offer list)
/travel/car-rental/offer/:offerId     → CarRentalOfferDetail (vehicle detail + extras)
/travel/car-rental/book/:offerId      → CarRentalDriverInfo (driver/license form)
/travel/car-rental/payment/:bookingId → CarRentalPayment (deposit payment)
/travel/car-rental/confirm/:bookingId → CarRentalConfirmation (booking confirmed)
```

---

## 9. 5-Pillar Integration (Dashboard, Radar, Orbit, Wallet, Me)

### 9.1 Proposed Module Wiring

Since car rental maps to the `"travel"` vertical (which already exists in `VerticalKey`), the question arises: how does car rental's wiring coexist with flights under a single `MODULE_WIRING["travel"]` entry?

**Resolution**: The current `MODULE_WIRING` is one entry per `VerticalKey`. Car rental and flights share the `"travel"` key but have fundamentally different pillar behaviors (flights have no map pins; car rental has branch pins; flights use ticket-based fulfillment; car rental uses calendar booking). Two approaches:

1. **Preferred — Add `"car_rental"` to `VerticalKey`**: This is cleanest. Add `"car_rental"` to the `VerticalKey` union in `module-wiring.ts:16-19` and create a dedicated `MODULE_WIRING["car_rental"]` entry. The `travel` key continues to serve flights/activities. This avoids overloading a single wiring entry with conflicting values.

2. **Alternative — Sub-wiring dispatch**: Keep single `travel` entry but add a `getSubVerticalWiring(categoryKey)` function that returns category-specific overrides. This is more complex and creates implicit coupling.

**Recommendation**: Option 1. Add `"car_rental"` to `VerticalKey`. The `getVerticalForCategoryKey("car_rental")` would return `"car_rental"` (not `"travel"`).

Below is the **car-rental-specific wiring entry** for `MODULE_WIRING["car_rental"]`:

```typescript
const CAR_RENTAL_WIRING = {
  dashboard: {
    shortcuts: ["economy_car", "suv", "luxury_car", "van_minibus"],
    recentItemType: "rental_booking",
    activeItemType: "rental",
    quickActions: [
      { icon: "🚗", label: "Rent a car", route: "/travel/car-rental" },
      { icon: "🔄", label: "My rentals", route: "/me/rentals" },
    ],
    showPromotions: true,
    showRecommendations: true,
    showActiveOrders: false,
    showUpcomingBookings: true,
    previewWidget: "bookings" as const,
  },

  radar: {
    discoveryMode: "search" as const,
    entityType: "rental_branch",
    primaryFilters: ["vehicle_class", "price", "pickup_date", "return_date", "transmission", "provider"],
    mapPinType: "poi" as const,
    showAvailability: true,
    showPricing: true,
    showRating: true,
    showDistance: true,
    showETA: false,
    defaultSortBy: "price",
    radarCategory: "services",
  },

  orbit: {
    threadTypes: ["rental_support", "booking_modification", "damage_report", "extension_request"],
    contactLabel: "Contact rental provider",
    entityLink: "booking" as const,
    supportsGroupThread: false,
    supportsAttachments: true,
    supportsLocation: true,
    supportsMeta: true,
  },

  wallet: {
    paymentFlow: "booking_deposit",
    supportsTips: false,
    supportsDeposit: true,
    supportsRefund: true,
    supportsInstallment: false,
    supportsSubscription: false,
    billingType: "per_booking" as const,
    currencyAware: true,
  },

  me: {
    historyType: "rentals",
    favoritesType: "rental_providers",
    preferencesKeys: [
      "preferred_vehicle_class",
      "preferred_transmission",
      "preferred_insurance",
      "license_info",
      "frequent_renter_numbers",
    ],
    documentsType: "rental_documents",
    addressRelevance: "travel" as const,
    showInProfile: true,
  },
};
```

### 9.2 Pillar Behavior Summary

| Pillar | Car Rental Behavior |
|--------|-------------------|
| **Dashboard** | Shows upcoming rental bookings in the `bookings` widget. Quick action to "Rent a car" → `/travel/car-rental`. |
| **Radar** | Search-mode discovery (not proximity). Map shows rental branch pins. Filters by date range, vehicle class, price. |
| **Orbit** | `booking` entity link (like Stay, not `job` like Taxi). Thread types for support, modifications, damage reports, extensions. |
| **Wallet** | `booking_deposit` flow (deposit at booking, balance at pickup). `per_booking` billing. Supports refund. No tips. |
| **Me** | `rentals` history. Stores license info, frequent renter numbers, preferred vehicle class. `rental_documents` document type for contracts/receipts. |

### 9.3 Comparison with Current Taxi Wiring vs Proposed

| Field | Taxi (current, inherited) | Car Rental (proposed) | Changed? |
|-------|--------------------------|----------------------|----------|
| `walletFlow` | `fare_hold` | `booking_deposit` | Yes |
| `orbitContext` / `entityLink` | `job` | `booking` | Yes |
| `discoveryMode` | `proximity` | `search` | Yes |
| `mapPinType` | `vehicle` | `poi` | Yes |
| `showETA` | `true` | `false` | Yes |
| `billingType` | `per_ride` | `per_booking` | Yes |
| `previewWidget` | `orders` | `bookings` | Yes |
| `addressRelevance` | `none` | `travel` | Yes |
| `documentsType` | `null` | `rental_documents` | Yes |

**Every single pillar behavior changes.** This confirms the reclassification is architecturally necessary.

---

## 10. Provider Adapter Architecture

### 10.1 Adapter Interface

Following the Flight vertical's `FlightProviderConfig` pattern:

```typescript
interface CarRentalProviderAdapter {
  readonly providerId: string;
  readonly priority: number;

  search(params: CarRentalSearchParams): Promise<CarRentalOffer[]>;

  getOfferDetail(offerId: string): Promise<CarRentalOffer | null>;

  priceCheck(offerId: string): Promise<{
    available: boolean;
    priceChanged: boolean;
    oldPrice: number;
    newPrice: number;
    validUntil: string;
  }>;

  createBooking(
    offer: CarRentalOffer,
    driver: CarRentalBooking["driver"],
    extras: RentalExtra[],
    insurance: InsuranceType
  ): Promise<{ providerBookingRef: string; confirmationNumber: string }>;

  cancelBooking(providerBookingRef: string): Promise<{
    success: boolean;
    cancellationFee: number;
    refundAmount: number;
  }>;

  modifyBooking(
    providerBookingRef: string,
    modifications: Partial<{ returnDate: string; returnTime: string; extras: RentalExtra[] }>
  ): Promise<{ success: boolean; priceDifference: number }>;

  getBookingStatus(providerBookingRef: string): Promise<{
    providerStatus: string;
    mappedStatus: RentalBookingStatus;
  }>;
}
```

### 10.2 Provider Adapter Implementations (Planned)

| Provider | API Type | Coverage | Priority |
|----------|----------|----------|----------|
| **Hertz** | REST API | Global (150+ countries) | 1 |
| **Avis/Budget** | REST API | Global (180+ countries) | 2 |
| **Sixt** | REST API | Europe + Americas | 3 |
| **Europcar** | REST API | Europe + Africa + Asia | 4 |
| **Local Fleet** | Internal API | Per-market direct partners | 5 |
| **CarTrawler** | Aggregator API | Global aggregation (backup) | 10 |

### 10.3 Adapter Orchestration

```
CarRentalSearch.execute(params)
    │
    ├── Filter: enabled providers for pickup country
    ├── Fan-out: Promise.allSettled(adapters.map(a => a.search(params)))
    ├── Timeout: per-provider (from CarRentalProviderConfig.timeout)
    ├── Normalize: map each result to CarRentalOffer[]
    ├── Merge: flatten + deduplicate
    ├── Rank: sort by user preference (default: price)
    └── Return: { offers: CarRentalOffer[], providers: { id, status }[] }
```

### 10.4 Error Handling per Provider

| Scenario | Behavior |
|----------|----------|
| Provider timeout | Exclude from results, log warning, include in `providers` status array |
| Provider API error | Exclude from results, log error, retry up to `retryAttempts` |
| Provider returns 0 results | Include in status as `no_availability`, surface to UI as "Provider X has no cars for these dates" |
| All providers fail | Return empty results with error status, emit `car_rental.search.all_providers_failed` event |

---

## 11. Event Model & Platform Bus

### 11.1 Event Naming Convention

Following platform bus conventions (dot notation for canonical events, colon notation for platform reactions):

```
car_rental.search.initiated
car_rental.search.completed
car_rental.search.all_providers_failed
car_rental.offer.selected
car_rental.offer.price_changed
car_rental.booking.created
car_rental.booking.payment_pending
car_rental.booking.payment_confirmed
car_rental.booking.confirmed
car_rental.booking.pickup_ready
car_rental.booking.activated
car_rental.booking.return_pending
car_rental.booking.completed
car_rental.booking.cancelled
car_rental.booking.failed
car_rental.refund.requested
car_rental.refund.processed
car_rental.provider.webhook_received
car_rental.provider.status_sync
```

### 11.2 Platform Reactions (Colon Notation)

```
car_rental:notify_user          — Push notification on booking status change
car_rental:update_dashboard     — Refresh dashboard widget on booking change
car_rental:sync_wallet          — Trigger wallet sync on payment events
car_rental:log_analytics        — Log event to analytics pipeline
car_rental:send_confirmation    — Send email/SMS confirmation
```

### 11.3 Event Payload Schema

```typescript
interface CarRentalEvent {
  type: string;                    // e.g., "car_rental.booking.confirmed"
  bookingId: string;
  userId: string;
  providerId: string;
  status: RentalBookingStatus;
  timestamp: string;
  data: Record<string, unknown>;
  __bridged?: boolean;             // Prevents bridge loops (platform bus convention)
}
```

### 11.4 Cross-Vertical Event Listening

Car rental must listen to the **actual** platform bus event names (not hypothetical ones). Current bus event names from `platform-bus.ts`:

| Car Rental Listens To | Actual Bus Event Name | Purpose |
|----------------------|----------------------|---------|
| Payment captured | `commerce:payment_captured` | Transition booking from `payment_pending` → `payment_confirmed` |
| Payment failed | `wallet.payment.failed` | Transition booking to `failed` |
| Payment completed | `wallet.payment.completed` | Confirm payment flow completion |
| Payment reversed | `commerce:payment_reversed` | Handle refund/chargeback |

| Other Verticals Listen To | Purpose |
|--------------------------|---------|
| `car_rental.booking.confirmed` | Dashboard updates upcoming bookings widget |
| `car_rental.booking.completed` | Me vertical updates rental history |
| `car_rental.booking.cancelled` | Wallet triggers refund flow |

> **Important**: The bridge in `platform-bus.ts` auto-converts between dot and colon notation (e.g., `wallet.payment.completed` ↔ `wallet:payment_completed`). Car rental event handlers must check for `__bridged` flag to prevent infinite bridge loops.

### 11.5 Listener Budget

Per platform bus conventions: `MAX_LISTENERS_PER_EVENT = 50`, `MAX_GLOBAL_LISTENERS = 30`.

Car rental adds approximately 6 new event types with listeners. Current global listener count must be audited before implementation to ensure headroom.

---

## 12. Anti-Conflict & Coexistence Rules

### 12.1 Taxonomy Coexistence

During migration, `car_rental` will exist in TWO places temporarily:
1. **Old**: `taxi.subcategories[2]` in `category-tree.ts`
2. **New**: Top-level `car_rental` primary in `category-tree.ts`

**Rule**: The old entry MUST be removed in the same PR that adds the new entry. There must never be a deployed state where `car_rental` resolves to two different primaries simultaneously.

### 12.2 Classification Engine Conflict Prevention

The classification engine (`classification-engine.ts`) uses brand-matching rules. Current rules:

```typescript
// Lines 133-135
{ pattern: /hertz/i, category: "taxi", subcategory: "car_rental" },
{ pattern: /avis/i, category: "taxi", subcategory: "car_rental" },
{ pattern: /sixt/i, category: "taxi", subcategory: "car_rental" },
```

**Rule**: These rules MUST be updated atomically with the category-tree change:

```typescript
{ pattern: /hertz/i, category: "car_rental", subcategory: "economy_car" },
{ pattern: /avis/i, category: "car_rental", subcategory: "economy_car" },
{ pattern: /sixt/i, category: "car_rental", subcategory: "economy_car" },
```

The default subcategory `economy_car` is used because the classification engine operates on brand name alone (no vehicle-class signal at classification time). Proper subcategory assignment happens at search/offer time.

### 12.3 Canonical Registry Conflict Prevention

`MOBILITY_FAMILY` in `canonical-registry.ts` currently contains a `rental` category with `car_rental` subcategory. This MUST be removed when the new standalone family is added.

**Rule**: The canonical registry MUST NOT contain the same `key` in two families. The implementation PR must include a runtime assertion that no duplicate keys exist across families.

### 12.4 Module Wiring Conflict Prevention

The `taxi` wiring in `module-wiring.ts` currently lists `"car_rental"` in `dashboard.shortcuts`. This creates a false association.

**Rule**: Remove `"car_rental"` from `taxi.dashboard.shortcuts` in the same PR. The `travel` vertical wiring will carry car rental dashboard behavior.

### 12.5 Event Namespace Isolation

Car rental events MUST use the `car_rental.*` prefix exclusively. No event may use `mobility.car_rental.*` or `taxi.rental.*` to prevent confusion with the mobility vertical's event namespace.

### 12.6 Route Namespace Isolation

Car rental routes MUST live under `/travel/car-rental/*`. No routes under `/mobility/*` may reference car rental. If deep links currently point to `/mobility/car-rental`, a redirect must be implemented in the route registry.

---

## 13. Taxonomy, Routing & Security

### 13.1 Route Registry Entries

New entries for `app-route-registry.tsx`:

```typescript
// Radar — Travel / Car Rental
export const CarRentalHub = safeLazy(
  () => import("@/pages/travel/CarRentalHub"), "CarRentalHub"
);
export const CarRentalResults = safeLazy(
  () => import("@/pages/travel/CarRentalResults"), "CarRentalResults"
);
export const CarRentalOfferDetail = safeLazy(
  () => import("@/pages/travel/CarRentalOfferDetail"), "CarRentalOfferDetail"
);
export const CarRentalDriverInfo = safeLazy(
  () => import("@/pages/travel/CarRentalDriverInfo"), "CarRentalDriverInfo"
);
export const CarRentalPayment = safeLazy(
  () => import("@/pages/travel/CarRentalPayment"), "CarRentalPayment"
);
export const CarRentalConfirmation = safeLazy(
  () => import("@/pages/travel/CarRentalConfirmation"), "CarRentalConfirmation"
);
```

Route declarations (in router configuration):

```
/travel/car-rental                    → CarRentalHub
/travel/car-rental/results            → CarRentalResults
/travel/car-rental/offer/:offerId     → CarRentalOfferDetail
/travel/car-rental/book/:offerId      → CarRentalDriverInfo
/travel/car-rental/payment/:bookingId → CarRentalPayment
/travel/car-rental/confirm/:bookingId → CarRentalConfirmation
```

### 13.2 Navigation Integration

The TravelHub (`/travel`) should gain a car rental entry card alongside flights and stays:

```
TravelHub
├── Flights  → /travel/flights
├── Stays    → /travel/stays
└── Car Rental → /travel/car-rental  [NEW]
```

### 13.3 Security Considerations

| Concern | Mitigation |
|---------|------------|
| **Driver license PII** | Encrypted at rest. License number and expiry stored in user's Me profile with `rental_documents` document type. Never logged in events. |
| **Payment data** | Handled entirely by Wallet vertical. Car rental domain never sees raw card numbers. |
| **Provider API keys** | Stored as environment secrets (never in code). Accessed via `CarRentalProviderConfig`. |
| **Cross-user booking access** | Booking queries MUST filter by `userId`. No admin endpoint bypasses this without explicit RBAC check. |
| **Provider webhook validation** | Each provider's `webhookSecret` used to validate HMAC signatures on inbound webhooks. Invalid signatures rejected with 401. |
| **Rate limiting** | Search endpoint rate-limited per user (e.g., 10 searches/minute) to prevent provider API abuse. |

### 13.4 i18n / Currency

- All prices stored in provider's quoted currency
- Display currency conversion handled by the shared i18n/currency layer
- Vehicle class labels, extras labels, and insurance descriptions must have translation keys in the i18n system
- 31 languages supported (platform-wide)

---

## 14. Migration Without Runtime Disruption

This section defines the **exact migration sequence** to reclassify car rental from `mobility/taxi` to `travel/car_rental` without breaking any running feature.

### 14.1 Migration Principles

1. **Atomic taxonomy swap**: The old subcategory removal and new primary addition happen in a single PR/deploy.
2. **No dual-resolution window**: At no point should `car_rental` resolve to two different verticals simultaneously.
3. **Backward-compatible classification**: Any data already classified as `category: "taxi", subcategory: "car_rental"` must remain queryable during and after migration.
4. **Zero downtime**: No migration step requires application restart or database downtime.
5. **Feature-flag gated**: New car rental UI routes are gated behind a feature flag until all backend wiring is validated.

### 14.2 Migration Phases

#### Phase M1: Domain Scaffolding (No Taxonomy Changes)

**Changes**:
- Add `CarRentalProviderAdapter` interface and types to `src/domains/car-rental/`
- Add `CAR_RENTAL_MACHINE` to `car-rental-state-machine.ts`
- Add car rental routes to `app-route-registry.tsx` (behind feature flag, routes return placeholder UI)

**Does NOT change**:
- NO taxonomy files touched (no category-tree, no classification engine, no canonical-registry, no world-class-taxonomy, no module-wiring)
- No `TERMINAL_STATES` update yet (machine not connected to production flows)

**Key principle**: No new `car_rental` primary key exists anywhere in the taxonomy. Zero dual-resolution risk.

**Validation**: Application boots, all existing tests pass, new domain types compile, feature-flagged routes render placeholder.

#### Phase M2: Provider Adapters + Search (Isolated)

**Changes**:
- Implement mock provider adapter conforming to `CarRentalProviderAdapter`
- Create search orchestrator (fan-out, normalize, rank)
- Wire feature-flagged UI pages to search orchestrator
- Car rental events registered in platform bus (but only emitted from feature-flagged code paths)

**Does NOT change**:
- NO taxonomy files touched
- Classification engine unchanged
- Module wiring unchanged
- Existing mobility flows unaffected

**Validation**: Behind feature flag, car rental search returns mock results. Booking lifecycle works end-to-end with mock provider.

#### Phase M3: Atomic Taxonomy Cutover (Single PR, Single Deploy)

**All changes in a SINGLE PR — this is the critical migration step**:

1. Extend `ArchitectureType` union: add `| "rental_booking"`
2. Extend `FulfillmentType` union: add `| "rental_contract"`
3. Add new `car_rental` primary entry to `CATEGORY_TREE` (§5.2)
4. **Simultaneously** remove `car_rental` from `taxi.subcategories` in `category-tree.ts`
5. Remove `car_rental` from `MOBILITY_FAMILY` in `canonical-registry.ts`; add to new `CAR_RENTAL_FAMILY`
6. Update classification engine rules: `category: "taxi"` → `category: "car_rental"` for Hertz/Avis/Sixt
7. Add `car_rental: "car_rental"` to `mapCategoryKeyToVertical()` in `world-class-taxonomy.ts`
8. Add `"car_rental"` to `VerticalKey` union in `module-wiring.ts`
9. Add `MODULE_WIRING["car_rental"]` entry (§9.1)
10. Add `car_rental: "car_rental"` to `getVerticalForCategoryKey()` in `module-wiring.ts`
11. Remove `"car_rental"` from `taxi.dashboard.shortcuts` in `module-wiring.ts`
12. Add `car_rental` to `TERMINAL_STATES` in `state-machines.ts`
13. Add data migration to re-classify any existing records with `category: "taxi", subcategory: "car_rental"` to `category: "car_rental"`

**Why atomic**: Steps 3 and 4 MUST be in the same commit. If only step 3 lands, `resolveSubcategory("car_rental")` finds two primaries. If only step 4 lands, `car_rental` disappears from the taxonomy entirely. The single-PR constraint eliminates any dual-resolution window.

**Validation**: 
- `resolveSubcategory("car_rental")` returns the new primary, not taxi
- `getVerticalForCategoryKey("car_rental")` returns `"car_rental"`
- `mapCategoryKeyToVertical("car_rental")` returns correct vertical
- Classification engine routes Hertz → `car_rental` primary
- No `car_rental` reference remains in mobility/taxi taxonomy
- Existing taxi flows unaffected (taxi, chauffeur, premium, bike, scooter still work)
- TypeScript compiles cleanly (no type errors from new union members)

#### Phase M4: Remove Feature Flag & Go Live

**Changes**:
- Remove feature flag gate on car rental routes
- Add car rental card to TravelHub
- Enable real provider adapters (Hertz, Avis, etc.)
- Monitor event bus for listener budget compliance

**Validation**: Full end-to-end user flow works in production. Search → select → book → pay → confirm → pickup → return → complete.

### 14.3 Rollback Plan

| Phase | Rollback |
|-------|----------|
| M1 | Remove new domain files. No taxonomy impact, no data impact. |
| M2 | Disable feature flag. Remove provider adapters and search orchestrator. No taxonomy impact, no data impact. |
| M3 | Revert single PR. `car_rental` returns to `taxi.subcategories`. Type unions revert. Key maps revert. Re-classify any migrated records back to `category: "taxi", subcategory: "car_rental"`. |
| M4 | Re-enable feature flag (hide routes). Disable provider adapters. Taxonomy remains (M3 is not reverted). |

### 14.4 Data Migration Details

If any records exist in the database with `category = 'taxi'` AND `subcategory = 'car_rental'`:

```sql
-- Phase M3 migration (run as part of deploy)
UPDATE listings
SET category = 'car_rental',
    subcategory = 'economy_car',
    vertical = 'travel'
WHERE category = 'taxi'
  AND subcategory = 'car_rental';
```

This query must be:
- Idempotent (safe to run multiple times)
- Audited (log count of affected rows)
- Reversible (store old values in metadata or audit table before update)

---

## 15. Multi-Provider Strategy, Phasing & Risks

### 15.1 Provider Integration Phases

| Phase | Providers | Timeline Estimate | Description |
|-------|-----------|-------------------|-------------|
| P1 | Mock Adapter | Week 1-2 | Full lifecycle with simulated responses. Validates state machine, events, UI flow. |
| P2 | Single Real Provider (Hertz or CarTrawler) | Week 3-6 | First real API integration. Validates normalization, error handling, payment flow. |
| P3 | Multi-Provider (2-3 providers) | Week 7-10 | Fan-out search, deduplication, ranking. Validates orchestration layer. |
| P4 | Full Provider Suite | Week 11+ | All planned providers. Local fleet partners. Market-specific providers. |

### 15.2 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Provider API instability** | Medium | High | Per-provider circuit breaker with fallback to cached results. Retry with exponential backoff. |
| **Price discrepancy at booking** | High | Medium | Mandatory `priceCheck()` call before `createBooking()`. If price changed >5%, require user re-confirmation. |
| **Taxonomy dual-resolution** | Low (if Phase M3 is atomic) | Critical | Single-PR atomic swap. CI test that asserts no duplicate keys across primaries. |
| **Platform bus listener overflow** | Low | Medium | Audit current listener count before adding car rental events. Car rental adds ~6 event types, well within budget. |
| **Driver license validation** | Medium | Medium | License validation is provider-side. Platform stores but does not validate license numbers. Provider rejection surfaces as booking failure. |
| **Cross-border rental complexity** | Medium | Low | `supportsCrossBorder` flag in provider config. If not supported, hide cross-border option in UI for that provider. |
| **Currency mismatch** | Low | Medium | Provider quotes in their currency. Platform converts at display time. Booking amount locked in provider currency at selection time. |
| **Existing `car_rental` data orphaned** | Low | High | Phase M3 includes explicit data migration query. Rollback plan includes reverse migration. |

### 15.3 Monitoring & Observability

| Metric | Source | Alert Threshold |
|--------|--------|----------------|
| Search success rate | `car_rental.search.completed` vs `car_rental.search.all_providers_failed` | <90% success → warning |
| Booking conversion rate | `car_rental.offer.selected` → `car_rental.booking.confirmed` | <20% conversion → investigate |
| Provider response time (p95) | Per-provider timer in adapter | >5s p95 → warning |
| Payment failure rate | `car_rental.booking.failed` with payment reason | >5% → critical |
| State machine violations | `safeTransition` blocked=true count | >0/hour → investigate |

---

## 16. Final Recommendation & Decision Matrix

### 16.1 Architectural Decision Record

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Vertical placement** | Own `VerticalKey` `"car_rental"` (not under `mobility` or shared `travel`) | Car rental needs dedicated 5-pillar wiring incompatible with both taxi (dispatch) and flight (ticket-based) patterns. Own `VerticalKey` is cleanest. |
| **Category-tree treatment** | New top-level primary `car_rental` with `vertical: "travel"` | Own architecture (`rental_booking`), fulfillment (`rental_contract`), wallet flow, orbit context. Cannot share taxi's settings. |
| **State machine** | `Machine<RentalBookingStatus, RentalEvent>` | Follows canonical pattern from `state-machines.ts`. 14 states, 15 events. |
| **Wallet flow** | `booking_deposit` | Deposit at booking, balance at pickup. Same as Stay/Services. |
| **Orbit context** | `booking` entity link | Same as Stay/Services/Beauty/Health. Not `job` (taxi). |
| **Discovery mode** | `search` (date-range) | Not `proximity` (ETA-based). Users search by date range + location. |
| **Provider pattern** | Adapter interface with fan-out orchestration | Same multi-provider pattern as Flight. Provider-agnostic canonical types. |
| **Event namespace** | `car_rental.*` | Clean separation from `mobility.*` namespace. |
| **Route namespace** | `/travel/car-rental/*` | Under travel umbrella with flights and stays. |
| **Migration strategy** | 4-phase with atomic taxonomy swap (M3) | Zero downtime. Feature-flag gated. Atomic to prevent dual-resolution. |

### 16.2 Implementation Priority

1. **Types & State Machine** — Foundation for everything else
2. **Provider Adapter Interface** — Enables mock and real provider work in parallel
3. **Taxonomy Reclassification** — Must happen before UI work (atomic swap)
4. **Search Orchestration** — Core user-facing feature
5. **5-Pillar Wiring** — Dashboard, Radar, Orbit, Wallet, Me integration
6. **UI Routes & Pages** — User-facing flow
7. **Real Provider Integration** — Hertz/Avis/Sixt adapters
8. **Observability & Monitoring** — Production readiness

### 16.3 Non-Goals (Explicitly Out of Scope)

- **Peer-to-peer car sharing** (e.g., Turo model) — Different business model, different architecture. Separate vertical if needed.
- **Long-term leasing** (30+ days) — Different contract structure, different payment cadence. May be a future extension.
- **Vehicle purchase** — Belongs in shops/marketplace vertical.
- **Chauffeur-driven rentals** — Remains in mobility/taxi vertical (real-time dispatch model applies).
- **Motorcycle/scooter rental** — Could be a future subcategory under car rental, but not in initial scope.

---

## Appendix A: Type Cross-Reference

| Car Rental Type | Analogous Flight Type | Analogous Stay Type |
|----------------|----------------------|---------------------|
| `CarRentalSearchParams` | `FlightSearchParams` | (hotel search params) |
| `CarRentalOffer` | `FlightOffer` | (hotel room offer) |
| `CarRentalBooking` | `FlightBooking` | (hotel booking) |
| `CarRentalProviderConfig` | `FlightProviderConfig` | — |
| `RentalBookingStatus` | `FlightStatus` | — |
| `CarRentalProviderAdapter` | (flight provider interface) | — |

## Appendix B: Event Catalog

| Event | Emitter | Listeners |
|-------|---------|-----------|
| `car_rental.search.initiated` | Search orchestrator | Analytics |
| `car_rental.search.completed` | Search orchestrator | Analytics, Dashboard |
| `car_rental.offer.selected` | UI/Booking flow | Analytics |
| `car_rental.offer.price_changed` | Price check | UI notification |
| `car_rental.booking.created` | Booking service | Analytics, Orbit |
| `car_rental.booking.payment_pending` | Booking service | Wallet |
| `car_rental.booking.payment_confirmed` | Wallet (via payment.captured) | Booking service |
| `car_rental.booking.confirmed` | Booking service | Dashboard, Me, Notification |
| `car_rental.booking.pickup_ready` | Provider webhook | Notification |
| `car_rental.booking.activated` | Provider webhook | Dashboard |
| `car_rental.booking.return_pending` | Provider webhook | Dashboard |
| `car_rental.booking.completed` | Booking service | Me, Analytics, Dashboard |
| `car_rental.booking.cancelled` | Booking service | Wallet, Dashboard, Notification |
| `car_rental.booking.failed` | Booking service | Notification, Analytics |
| `car_rental.refund.requested` | User/Support | Wallet |
| `car_rental.refund.processed` | Wallet | Notification, Me |

---

*End of Architecture Document*
