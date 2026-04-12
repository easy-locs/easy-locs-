# Car Rental Vertical — Architecture Document

> **Status**: Architecture-only. No code changes, no runtime modifications, no schema activations accompany this document.
> **Author**: Architecture team
> **Date**: 2026-04-12
> **Scope**: Complete technical architecture for introducing Car Rental as a first-class Travel booking vertical in the Easy-Locs super-app.

---

## Table of Contents

1. [Mandatory Declaration & Executive Summary](#1-mandatory-declaration--executive-summary)
2. [Domain Positioning with Comparison Tables](#2-domain-positioning-with-comparison-tables)
3. [Domain Boundaries](#3-domain-boundaries)
4. [Canonical Vertical Recommendation](#4-canonical-vertical-recommendation)
5. [Canonical Model Designs](#5-canonical-model-designs)
6. [Entity Lifecycle & Booking State Model](#6-entity-lifecycle--booking-state-model)
7. [Search/Discovery Position & End-to-End Flow](#7-searchdiscovery-position--end-to-end-flow)
8. [Wallet/Orbit/Dashboard Integration Points](#8-walletorbitdashboard-integration-points)
9. [Provider Adapter Architecture](#9-provider-adapter-architecture)
10. [Data Ownership, Event Model & Platform Bus Alignment](#10-data-ownership-event-model--platform-bus-alignment)
11. [Anti-Conflict Rules](#11-anti-conflict-rules)
12. [Taxonomy/Routing Guardrails & Security Boundary](#12-taxonomyrouting-guardrails--security-boundary)
13. [Migration Without Runtime Disruption](#13-migration-without-runtime-disruption)
14. [Multi-Provider Strategy, Implementation Phasing & Risks](#14-multi-provider-strategy-implementation-phasing--risks)
15. [Final Recommendation & Closing Declaration](#15-final-recommendation--closing-declaration)

---

## 1. Mandatory Declaration & Executive Summary

**This document is architecture-only.** It prescribes no runtime code changes, no database migrations, no file edits, no feature flag activations, no event emissions, no route exposures, and no provider API integrations. Every recommendation herein is a design artifact. Implementation requires separate, tracked tasks with their own code review cycles.

**No implementation has been performed.** This document describes the target state only.

### Executive Summary

Car Rental is a **date-range booking product** — users search by pickup/return dates and locations, compare offers from multiple providers (Hertz, Avis, Sixt, local fleets), and book a vehicle for a multi-day period. This is fundamentally a **Travel booking** pattern, identical in structure to Flights and Stays, and categorically different from the **real-time dispatch** pattern used by Taxi/Mobility.

Car Rental currently lives as a subcategory under `mobility/taxi` across 5 taxonomy files plus 3 derived contract surfaces. Every inherited behavior (fare hold, job context, live tracking, per-ride billing, proximity discovery) is semantically incorrect. This document defines the architecture for reclassifying Car Rental as a first-class vertical with its own `VerticalKey`, canonical models, state machine, provider adapter layer, and 5-pillar wiring.

---

## 2. Domain Positioning with Comparison Tables

### 2.1 Current State Audit

Car Rental appears in **5 primary files** and **3 derived contract surfaces**:

| File | Location | Current Shape |
|------|----------|---------------|
| `category-tree.ts:526` | `CATEGORY_TREE[7].subcategories[2]` | `{ value: "car_rental", label: "Car Rental", emoji: "🚗", cluster: "transport" }` under taxi primary |
| `classification-engine.ts:133-135` | Brand rules | Maps Hertz, Avis, Sixt → `category: "taxi"`, `subcategory: "car_rental"` |
| `canonical-registry.ts:1244-1262` | `MOBILITY_FAMILY.categories[1]` | Own category key `"rental"` with subcategory `car_rental` under MOBILITY_FAMILY |
| `world-class-taxonomy.ts:217` | `SERVICE_MODE_ENRICHMENT` | `car_rental: ["onsite"]` |
| `module-wiring.ts:452` | `taxi.dashboard.shortcuts` | `"car_rental"` listed alongside taxi, chauffeur, premium |

Derived contract surfaces requiring update:

| File | Location | Issue |
|------|----------|-------|
| `category-tree.ts:22-32` | `ArchitectureType` union | Missing `"rental_booking"` value |
| `category-tree.ts:34-43` | `FulfillmentType` union | Missing `"rental_contract"` value |
| `world-class-taxonomy.ts:348-366` | `mapCategoryKeyToVertical()` | No `car_rental` key — falls back to `"services"` |
| `module-wiring.ts:946-967` | `getVerticalForCategoryKey()` | No `car_rental` key — returns `null` |

### 2.2 Strict Comparison: Car Rental vs Mobility (Taxi)

| Dimension | Mobility / Taxi | Car Rental | Hard Separation |
|-----------|----------------|------------|-----------------|
| **User intent** | "Get me from A to B now" | "Rent a vehicle for N days starting on date X" | Car Rental is NOT a ride request. It is NOT dispatched. |
| **Inventory type** | Available drivers (live GPS pool) | Fleet vehicles (calendar availability) | Car Rental has NO driver pool and NO real-time matching. |
| **Fulfillment model** | Dispatch → pickup → ride → dropoff (minutes) | Reserve → pickup → self-drive → return (days) | Car Rental users DRIVE THEMSELVES. No driver is assigned. |
| **Pricing model** | Dynamic fare (distance + time + surge) | Daily rate × days + extras + insurance | Car Rental has NO surge pricing and NO distance-based fares. |
| **Booking behavior** | Real-time, no advance search | Date-range search, days/weeks in advance | Car Rental is ALWAYS pre-booked. Never on-demand. |
| **State model** | `draft → searching → accepted → picked_up → completed` | `draft → booking_started → payment_authorized → confirmed → active → completed` | Car Rental has NO driver acceptance step. |
| **Provider relationship** | Platform assigns from driver pool | Multi-provider aggregation (Hertz, Avis, Sixt) | Car Rental aggregates EXTERNAL providers. Not internal pool. |
| **Map behavior** | Live vehicle tracking | Branch/pickup location pins | Car Rental has NO live tracking. |
| **Wallet flow** | `fare_hold` (real-time capture) | `booking_deposit` (deposit + balance at pickup) | Car Rental NEVER uses fare hold. |
| **Orbit context** | `job` entity link | `booking` entity link | Car Rental threads are bookings, NOT jobs. |

**Hard separation**: Car Rental MUST NOT inherit any behavior from the Mobility vertical. It MUST NOT use `mobility_taxi` architecture, `taxi` fulfillment, `fare_hold` wallet flow, `job` orbit context, `vehicle` map pins, or `per_ride` billing.

### 2.3 Strict Comparison: Car Rental vs Hotel/Stay

| Dimension | Hotel / Stay | Car Rental | Separation |
|-----------|-------------|------------|------------|
| **User intent** | "Book accommodation for N nights" | "Rent a vehicle for N days" | Different asset type; same booking pattern |
| **Inventory type** | Room-night calendar | Vehicle-day calendar | Structurally identical (calendar-based) |
| **Fulfillment model** | Check-in → stay → check-out | Pickup → self-drive → return | Same shape: start-date fulfillment → end-date return |
| **Pricing model** | Nightly rate × nights + taxes | Daily rate × days + extras + insurance | Nearly identical; Car Rental adds extras/insurance layer |
| **Provider relationship** | OTA + direct booking | Multi-provider aggregation | Similar pattern |
| **Wallet flow** | `booking_deposit` | `booking_deposit` | Identical |
| **Orbit context** | `booking` | `booking` | Identical |

**Relationship**: Car Rental and Stay share the **highest structural affinity** (8/10). They use the same booking pattern, wallet flow, orbit context, and calendar-based inventory. They differ in asset type (room vs vehicle) and extras model.

### 2.4 Strict Comparison: Car Rental vs Seasonal Rental

| Dimension | Seasonal Rental (Long-term property) | Car Rental | Hard Separation |
|-----------|-------------------------------------|------------|-----------------|
| **User intent** | "Lease a property for months/years" | "Rent a vehicle for days/weeks" | Different asset, different duration, different legal framework |
| **Inventory type** | Property units (lease calendar) | Fleet vehicles (daily calendar) | Seasonal Rental is property-based with lease contracts |
| **Fulfillment model** | Lease signing → move-in → occupancy → move-out | Reserve → pickup → self-drive → return | Seasonal Rental has legal lease contracts, deposits, maintenance |
| **Pricing model** | Monthly rent + deposit + agency fees | Daily rate × days + insurance + extras | Seasonal Rental operates on monthly billing cycles |
| **Duration** | Months to years | Days to weeks (rarely >30 days) | Car Rental is SHORT-TERM. Seasonal is LONG-TERM. |
| **Legal framework** | Tenancy law, lease agreements, property law | Rental agreement, insurance, traffic law | Completely different legal domains |
| **State model** | `draft → pending_signature → active → late → terminated → expired` | `draft → booking_started → confirmed → active → completed` | Seasonal has lease-specific states (late, terminated) |

**Hard separation**: Car Rental MUST NOT share state models, billing types, or document types with Seasonal/Property Rental. They operate in entirely different legal and temporal domains. Car Rental is a Travel booking; Seasonal Rental is a Property management function.

### 2.5 Strict Comparison: Car Rental vs Flight

| Dimension | Flight | Car Rental | Separation |
|-----------|--------|------------|------------|
| **User intent** | "Fly from A to B on date X" | "Rent a vehicle at location A for N days" | Different asset; both are Travel bookings |
| **Inventory type** | Seat inventory (GDS) | Fleet inventory (calendar) | Both calendar-bounded; different granularity |
| **Fulfillment model** | Ticket issuance → check-in → board → fly | Reserve → pickup → self-drive → return | Flight fulfillment is ticket-based; Car Rental is possession-based |
| **Provider relationship** | GDS/NDC aggregation (Amadeus, Sabre) | Brand API aggregation (Hertz, Avis, Sixt) | Same multi-provider adapter pattern |
| **Pricing model** | Fare classes + taxes + baggage | Daily rate × days + extras + insurance | Both have complex pricing with add-ons |
| **Cancellation** | Fare rules (refundable/non) | Policy-based (free cancellation window) | Similar pattern; different specifics |
| **Payment** | Full prepay or hold | Deposit + balance at pickup | Different payment timing |

**Relationship**: Car Rental and Flight share 7/10 affinity. Both are Travel bookings with multi-provider aggregation, complex cancellation policies, and date-range search. They differ in fulfillment (ticket vs possession) and payment timing.

### 2.6 Affinity Summary

| Vertical | Affinity Score | Key Pattern Match |
|----------|---------------|-------------------|
| Stay | 8/10 | Calendar inventory, daily pricing, deposit flow, check-in/check-out pattern |
| Flight | 7/10 | Multi-provider aggregation, date-range search, cancellation policies |
| Services | 4/10 | Booking concept exists but slot-based, not date-range |
| Seasonal Rental | 3/10 | Both involve "renting" but different asset, duration, legal framework |
| Taxi/Mobility | 2/10 | Same "vehicle" concept but completely different in every other dimension |

---

## 3. Domain Boundaries

### 3.1 Bounded Context: `car-rental`

```
src/domains/car-rental/
├── car-rental-types.ts          # Canonical types (§5)
├── car-rental-state-machine.ts  # Booking lifecycle (§6)
├── car-rental-provider.ts       # Provider adapter interface (§9)
├── car-rental-search.ts         # Search orchestration (§7)
├── car-rental-events.ts         # Event schemas (§10)
└── car-rental-wiring.ts         # 5-pillar wiring constants (§8)
```

### 3.2 What Car Rental OWNS

- `CanonicalCarRentalOffer` — normalized vehicle offer from any provider
- `CanonicalCarRentalBooking` — booking entity with full lifecycle
- `CanonicalCarRentalSearchIntent` — search parameters and context
- `CanonicalCarRentalBookingSummary` — lightweight projection for Dashboard/Me
- `CanonicalCarRentalPolicySnapshot` — immutable snapshot of cancellation/insurance/mileage policies at booking time
- Provider adapter interface (multi-provider aggregation)
- Vehicle class taxonomy (within the `car_rental` primary category)
- Rental-specific extras model (insurance, GPS, child seat, additional driver)
- Pickup/return location management
- Rental agreement/contract document type

### 3.3 What Car Rental DOES NOT OWN (Shared Platform)

- Payment processing → Wallet vertical (`booking_deposit` flow, `per_booking` billing)
- Messaging/support → Orbit vertical (`booking` entity link)
- User identity, documents, preferences → Me vertical
- Map rendering → Radar shared map layer (`listing_pins`)
- Notifications → Platform bus notification reactions
- Currency/locale/i18n → Shared i18n infrastructure
- Classification engine → `classification-engine.ts` (Car Rental provides rules; engine executes)
- State machine infrastructure → `safeTransition` from `state-machines.ts`
- Auth/RBAC → Shared auth layer

### 3.4 What Car Rental MUST NEVER OWN

- Taxi/ride dispatch logic
- Driver pool management or driver assignment
- Surge/dynamic pricing calculations
- Hotel room inventory or property lease management
- Flight ticketing or GDS integration
- Raw payment card processing (Wallet handles this)
- Provider API credentials storage (environment secrets only)

### 3.5 Integration Seams

| Seam | Direction | Contract |
|------|-----------|----------|
| Car Rental → Wallet | Outbound | `booking_deposit` payment flow; `per_booking` billing. Sends deposit request, receives `commerce:payment_captured` / `wallet.payment.failed`. |
| Car Rental → Orbit | Outbound | Thread types: `rental_support`, `booking_modification`, `damage_report`, `extension_request`. Entity link: `booking`. |
| Car Rental → Platform Bus | Bidirectional | Emits `car_rental.*` events (§10). Listens for `commerce:payment_captured`, `wallet.payment.failed`, `commerce:payment_reversed`. |
| Car Rental → Classification Engine | Inbound | Engine routes Hertz/Avis/Sixt brands to `category: "car_rental"`. |
| Car Rental → Radar | Outbound | Provides `rental_branch` entity type for map discovery. |
| Car Rental → Dashboard | Outbound | `CanonicalCarRentalBookingSummary` for upcoming bookings widget. |
| Car Rental → Me | Outbound | Rental history, favorite providers, license info, frequent renter numbers. |

---

## 4. Canonical Vertical Recommendation

### 4.1 Firm Recommendation

Car Rental MUST be a **first-class vertical** with its own `VerticalKey` of `"car_rental"` and a new top-level primary category in `CATEGORY_TREE`.

This is NOT negotiable for the following reasons:
1. Every pillar wiring value (wallet, orbit, radar, dashboard, me) differs from both `taxi` and `travel`
2. The current `MODULE_WIRING` model is one entry per `VerticalKey` — car rental cannot share the `"travel"` key with flights because they have incompatible wiring (flights have no map pins; car rental has branch pins; flights use ticket fulfillment; car rental uses calendar booking)
3. The `getVerticalForCategoryKey()` function returns a single `VerticalKey` per category key — car rental needs its own mapping

### 4.2 Taxonomy Placement

**Category-tree primary entry** (design only — not yet added):

> **Type Union Prerequisites**: `ArchitectureType` union (`category-tree.ts:22`) must be extended with `| "rental_booking"`. `FulfillmentType` union (`category-tree.ts:34`) must be extended with `| "rental_contract"`. `VerticalKey` union (`module-wiring.ts:16`) must be extended with `| "car_rental"`.

```typescript
{
  key: "car_rental",
  label: "Car Rental",
  emoji: "🚗",
  vertical: "travel",
  architecture: "rental_booking",
  fulfillment: "rental_contract",
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

### 4.3 Entity Families

| Entity | Canonical Name | Role |
|--------|---------------|------|
| Search parameters | `CanonicalCarRentalSearchIntent` | Captures user search context: locations, dates, preferences |
| Vehicle offer | `CanonicalCarRentalOffer` | Normalized offer from any provider |
| Booking | `CanonicalCarRentalBooking` | Full booking entity with lifecycle state |
| Booking summary | `CanonicalCarRentalBookingSummary` | Lightweight projection for Dashboard/Me/history |
| Policy snapshot | `CanonicalCarRentalPolicySnapshot` | Immutable snapshot of policies at booking time |
| Provider | `CarRentalProviderConfig` | Provider configuration and capabilities |

### 4.4 Files Requiring Updates (Implementation Phase Only)

All changes MUST land in a single atomic PR (see §13, Phase M3).

| File | Change |
|------|--------|
| `category-tree.ts:22-32` | Extend `ArchitectureType`: add `\| "rental_booking"` |
| `category-tree.ts:34-43` | Extend `FulfillmentType`: add `\| "rental_contract"` |
| `category-tree.ts` (CATEGORY_TREE) | Add new primary entry (§4.2). Remove `car_rental` from `taxi.subcategories`. |
| `classification-engine.ts:133-135` | Update brand rules: `category: "car_rental"` (not `"taxi"`) for Hertz/Avis/Sixt |
| `canonical-registry.ts:1244-1262` | Remove `car_rental` from `MOBILITY_FAMILY`. Add new `CAR_RENTAL_FAMILY`. |
| `world-class-taxonomy.ts:217` | Update `SERVICE_MODE_ENRICHMENT["car_rental"]` to `["onsite", "delivery"]` |
| `world-class-taxonomy.ts:348-366` | Add `car_rental: "car_rental"` to `mapCategoryKeyToVertical()` (requires extending `Vertical` type with `"car_rental"`) |
| `module-wiring.ts:16-19` | Add `"car_rental"` to `VerticalKey` union |
| `module-wiring.ts:452` | Remove `"car_rental"` from `taxi.dashboard.shortcuts` |
| `module-wiring.ts:946-967` | Add `car_rental: "car_rental"` to `getVerticalForCategoryKey()` |
| `module-wiring.ts` (MODULE_WIRING) | Add `MODULE_WIRING["car_rental"]` entry (§8) |

---

## 5. Canonical Model Designs

### 5.1 CanonicalCarRentalSearchIntent

**Purpose**: Captures the user's search context. Created at search time, referenced throughout the booking flow. Immutable after creation.

**Lifecycle role**: Created at Step 1 (search). Referenced by offers. Stored in booking for traceability.

```typescript
interface CanonicalCarRentalSearchIntent {
  // Required — immutable after creation
  readonly intentId: string;
  readonly userId: string;
  readonly pickupLocation: string;
  readonly pickupLocationType: PickupReturnType;
  readonly pickupCoordinates: { lat: number; lng: number };
  readonly returnLocation: string;
  readonly returnLocationType: PickupReturnType;
  readonly returnCoordinates: { lat: number; lng: number };
  readonly pickupDate: string;           // ISO 8601
  readonly pickupTime: string;           // HH:mm
  readonly returnDate: string;           // ISO 8601
  readonly returnTime: string;           // HH:mm
  readonly currency: string;
  readonly createdAt: string;

  // Optional — immutable after creation
  readonly vehicleClass?: VehicleClass;
  readonly transmission?: TransmissionType;
  readonly fuelType?: FuelType;
  readonly minSeats?: number;
  readonly locale?: string;
  readonly driverAge?: number;
  readonly extras?: RentalExtra[];
  readonly providerIds?: string[];
}
```

**Forbidden provider leaks**: No provider-specific search parameters. All provider API peculiarities are handled by adapters.

### 5.2 CanonicalCarRentalOffer

**Purpose**: Normalized vehicle offer from any provider. Provider-agnostic — no raw provider data leaks to consumers.

**Lifecycle role**: Created by provider adapters during search. Selected by user. Embedded (snapshotted) in booking.

```typescript
interface CanonicalCarRentalOffer {
  // Required — immutable
  readonly offerId: string;
  readonly providerId: string;
  readonly providerOfferRef: string;        // opaque ref for provider communication
  readonly vehicle: {
    readonly vehicleClass: VehicleClass;
    readonly make: string;
    readonly model: string;
    readonly transmission: TransmissionType;
    readonly fuelType: FuelType;
    readonly seats: number;
    readonly doors: number;
    readonly bags: { large: number; small: number };
    readonly airConditioning: boolean;
  };
  readonly pickup: {
    readonly locationId: string;
    readonly locationName: string;
    readonly locationType: PickupReturnType;
    readonly address: string;
    readonly coordinates: { lat: number; lng: number };
    readonly dateTime: string;
  };
  readonly return: {
    readonly locationId: string;
    readonly locationName: string;
    readonly locationType: PickupReturnType;
    readonly address: string;
    readonly coordinates: { lat: number; lng: number };
    readonly dateTime: string;
  };
  readonly pricing: {
    readonly dailyRate: number;
    readonly totalDays: number;
    readonly subtotal: number;
    readonly taxes: number;
    readonly fees: number;
    readonly extrasTotal: number;
    readonly totalPrice: number;
    readonly currency: string;
    readonly depositAmount: number;
    readonly includedExtras: RentalExtra[];
    readonly availableExtras: { extra: RentalExtra; price: number }[];
  };
  readonly validUntil: string;

  // Optional — immutable
  readonly vehicle_year?: number;
  readonly vehicle_imageUrl?: string;
  readonly pickup_instructions?: string;
  readonly return_instructions?: string;
  readonly providerRating?: number;
  readonly providerReviewCount?: number;
}
```

**Forbidden provider leaks**: No raw provider JSON, no provider-specific IDs in public fields (only `providerOfferRef` which is opaque), no provider error codes, no provider session tokens.

**Relationship to shared layers**: `currency` field uses the shared `CurrencyCode` type. `coordinates` uses the shared `GeoPoint` pattern. `VehicleClass`, `RentalExtra`, etc. are car-rental-owned types.

### 5.3 CanonicalCarRentalBooking

**Purpose**: The primary booking entity. Tracks the full lifecycle from creation to completion/cancellation.

**Lifecycle role**: Created at booking submission. Mutated through state machine transitions. Contains immutable offer snapshot and mutable status/payment fields.

```typescript
interface CanonicalCarRentalBooking {
  // Required — immutable after creation
  readonly bookingId: string;
  readonly userId: string;
  readonly providerId: string;
  readonly offer: CanonicalCarRentalOffer;           // snapshot at booking time
  readonly searchIntent: CanonicalCarRentalSearchIntent;  // original search context
  readonly policySnapshot: CanonicalCarRentalPolicySnapshot;  // policies frozen at booking
  readonly driver: {
    readonly firstName: string;
    readonly lastName: string;
    readonly email: string;
    readonly phone: string;
    readonly dateOfBirth: string;
    readonly licenseNumber: string;
    readonly licenseCountry: string;
    readonly licenseExpiry: string;
  };
  readonly selectedExtras: RentalExtra[];
  readonly selectedInsurance: InsuranceType;
  readonly paymentMode: PaymentMode;
  readonly totalAmount: number;
  readonly depositAmount: number;
  readonly currency: string;
  readonly platformFee: number;
  readonly providerAmount: number;
  readonly createdAt: string;

  // Mutable — updated through lifecycle
  status: CarRentalBookingStatus;
  providerBookingRef?: string;
  paymentRef?: string;
  holdExpiresAt?: string;
  confirmationNumber?: string;
  contractDocumentUrl?: string;
  failureReason?: string;
  retryCount: number;
  updatedAt: string;

  // Optional — mutable
  additionalDrivers?: {
    firstName: string;
    lastName: string;
    licenseNumber: string;
    licenseCountry: string;
  }[];
  metadata?: Record<string, unknown>;
}
```

**Forbidden provider leaks**: `providerBookingRef` is opaque. No raw provider status strings, no provider session IDs, no provider API keys in metadata.

### 5.4 CanonicalCarRentalBookingSummary

**Purpose**: Lightweight projection of a booking for Dashboard upcoming-bookings widget, Me history list, and Orbit thread context. Contains only display-relevant fields.

**Lifecycle role**: Derived from `CanonicalCarRentalBooking`. Read-only projection. Never written to directly.

```typescript
interface CanonicalCarRentalBookingSummary {
  readonly bookingId: string;
  readonly status: CarRentalBookingStatus;
  readonly vehicleClass: VehicleClass;
  readonly vehicleMake: string;
  readonly vehicleModel: string;
  readonly pickupLocationName: string;
  readonly pickupDateTime: string;
  readonly returnLocationName: string;
  readonly returnDateTime: string;
  readonly totalPrice: number;
  readonly currency: string;
  readonly providerName: string;
  readonly confirmationNumber?: string;
  readonly createdAt: string;
}
```

**Relationship to Dashboard/Me**: This is the shape that Dashboard's `bookings` preview widget and Me's `rentals` history list consume. No full offer or driver PII in this projection.

### 5.5 CanonicalCarRentalPolicySnapshot

**Purpose**: Immutable snapshot of all policies (cancellation, insurance, mileage) at the moment of booking. Protects against retroactive policy changes by the provider.

**Lifecycle role**: Created at booking time from the selected offer. NEVER modified after creation. Used for dispute resolution, refund calculations, and customer support.

```typescript
interface CanonicalCarRentalPolicySnapshot {
  // All fields immutable — frozen at booking time
  readonly snapshotId: string;
  readonly bookingId: string;
  readonly capturedAt: string;

  readonly cancellation: {
    readonly freeCancellationUntil: string | null;
    readonly cancellationFee: number | null;
    readonly cancellationFeePct: number | null;
    readonly refundable: boolean;
  };

  readonly insurance: {
    readonly selectedType: InsuranceType;
    readonly excessAmount: number;
    readonly coverageDescription: string;
  };

  readonly mileage: {
    readonly policy: MileagePolicy;
    readonly includedKm: number | null;
    readonly excessRatePerKm: number | null;
  };

  readonly pricing: {
    readonly dailyRate: number;
    readonly totalDays: number;
    readonly totalPrice: number;
    readonly depositAmount: number;
    readonly currency: string;
  };

  readonly providerTermsUrl?: string;
}
```

**Forbidden mutations**: Once created, no field may be updated. If a provider changes their terms after booking, the snapshot remains authoritative for that booking. This is critical for refund disputes.

---

## 6. Entity Lifecycle & Booking State Model

### 6.1 State Machine Definition

Following the canonical `Machine<S, E>` pattern from `src/domains/shared/state-machines.ts`.

> **Implementation note**: The `Machine<S, E>` type in `state-machines.ts` is file-local (not exported). Implementation must either (a) duplicate the type locally, or (b) export it from `state-machines.ts` in a preparatory PR. Option (b) is recommended. The `safeTransition` function IS exported and works with any conforming machine.

```typescript
type CarRentalBookingStatus =
  | "draft"
  | "booking_started"
  | "payment_pending"
  | "payment_authorized"
  | "provider_confirmation_pending"
  | "confirmed"
  | "modification_pending"
  | "pickup_ready"
  | "active"
  | "return_pending"
  | "completed"
  | "cancelled"
  | "failed"
  | "refund_pending"
  | "refunded";

type CarRentalEvent =
  | "START_BOOKING"
  | "REQUEST_PAYMENT"
  | "AUTHORIZE_PAYMENT"
  | "SEND_TO_PROVIDER"
  | "PROVIDER_CONFIRM"
  | "PROVIDER_REJECT"
  | "MARK_PICKUP_READY"
  | "ACTIVATE"
  | "INITIATE_RETURN"
  | "COMPLETE"
  | "REQUEST_MODIFICATION"
  | "CONFIRM_MODIFICATION"
  | "REJECT_MODIFICATION"
  | "CANCEL"
  | "FAIL"
  | "TIMEOUT"
  | "REQUEST_REFUND"
  | "PROCESS_REFUND";

const CAR_RENTAL_MACHINE: Machine<CarRentalBookingStatus, CarRentalEvent> = {
  draft:                          { START_BOOKING: "booking_started", CANCEL: "cancelled" },
  booking_started:                { REQUEST_PAYMENT: "payment_pending", CANCEL: "cancelled", FAIL: "failed" },
  payment_pending:                { AUTHORIZE_PAYMENT: "payment_authorized", FAIL: "failed", CANCEL: "cancelled", TIMEOUT: "failed" },
  payment_authorized:             { SEND_TO_PROVIDER: "provider_confirmation_pending", FAIL: "failed" },
  provider_confirmation_pending:  { PROVIDER_CONFIRM: "confirmed", PROVIDER_REJECT: "failed", TIMEOUT: "failed" },
  confirmed:                      { MARK_PICKUP_READY: "pickup_ready", REQUEST_MODIFICATION: "modification_pending", CANCEL: "cancelled" },
  modification_pending:           { CONFIRM_MODIFICATION: "confirmed", REJECT_MODIFICATION: "confirmed", TIMEOUT: "confirmed", CANCEL: "cancelled" },
  pickup_ready:                   { ACTIVATE: "active", CANCEL: "cancelled" },
  active:                         { INITIATE_RETURN: "return_pending" },
  return_pending:                 { COMPLETE: "completed" },
  completed:                      { REQUEST_REFUND: "refund_pending" },
  cancelled:                      {},
  failed:                         {},
  refund_pending:                 { PROCESS_REFUND: "refunded", FAIL: "failed" },
  refunded:                       {},
};
```

### 6.2 Critical Rule: Payment Success ≠ Booking Confirmed

**`payment_authorized` → `provider_confirmation_pending` → `confirmed`**

After the Wallet captures payment, Car Rental MUST send the booking to the provider for confirmation. Only when the provider confirms availability does the booking transition to `confirmed`. If the provider rejects (vehicle no longer available), the booking transitions to `failed` and a refund is initiated.

This is the same pattern as Flight (`payment_confirmed` → `ticketing_in_progress` → `ticketed`). Payment capture alone does NOT guarantee fulfillment.

### 6.3 Forbidden Transitions

The following transitions are explicitly **forbidden** and must never be added to the machine:

| From | To | Why Forbidden |
|------|----|---------------|
| `draft` | `confirmed` | Cannot skip payment and provider confirmation |
| `draft` | `active` | Cannot skip entire booking flow |
| `payment_pending` | `confirmed` | Cannot skip payment authorization and provider confirmation |
| `payment_authorized` | `confirmed` | Cannot skip provider confirmation (see §6.2) |
| `active` | `cancelled` | Cannot cancel after vehicle pickup (use modification/return instead) |
| `active` | `draft` | Cannot revert to draft after activation |
| `completed` | `active` | Cannot reactivate a completed rental |
| `cancelled` | Any state | Terminal. No resurrection. |
| `failed` | Any state | Terminal. No resurrection. |
| `refunded` | Any state | Terminal. No resurrection. |

### 6.4 Timeout Points

| State | Timeout | Action |
|-------|---------|--------|
| `payment_pending` | 15 minutes | If no payment authorization received, `TIMEOUT` → `failed`. Release hold. |
| `provider_confirmation_pending` | 5 minutes | If no provider response, `TIMEOUT` → `failed`. Initiate refund. |
| `modification_pending` | 10 minutes | If no provider response to modification, `TIMEOUT` → `confirmed` (revert to original). |
| `pickup_ready` | 24 hours after scheduled pickup | If user doesn't pick up, system may auto-`CANCEL` (no-show policy). |

### 6.5 Snapshot vs Operational State

| Aspect | Snapshot (Immutable) | Operational (Mutable) |
|--------|---------------------|-----------------------|
| Offer details | `CanonicalCarRentalOffer` embedded in booking | — |
| Policies | `CanonicalCarRentalPolicySnapshot` | — |
| Search context | `CanonicalCarRentalSearchIntent` | — |
| Driver info | `driver` in booking | — |
| Booking status | — | `status: CarRentalBookingStatus` |
| Payment ref | — | `paymentRef`, `holdExpiresAt` |
| Provider ref | — | `providerBookingRef`, `confirmationNumber` |
| Failure info | — | `failureReason`, `retryCount` |

### 6.6 TERMINAL_STATES Registration

Add to the `TERMINAL_STATES` record in `state-machines.ts`:

```typescript
car_rental: new Set(["completed", "cancelled", "failed", "refunded"]),
```

Note: `completed` is registered as terminal for `isTerminal()` purposes (it represents successful fulfillment), even though it has one outbound transition (`REQUEST_REFUND` → `refund_pending`) for post-completion refund flows.

### 6.7 Integration with `safeTransition`

```typescript
import { safeTransition } from "@/domains/shared/state-machines";

const result = safeTransition(
  CAR_RENTAL_MACHINE,
  `car-rental:${bookingId}`,
  currentStatus,
  event
);
// result: { next: CarRentalBookingStatus | null; blocked: boolean; reason?: string }
```

---

## 7. Search/Discovery Position & End-to-End Flow

### 7.1 Where Car Rental Appears

| Surface | Appears? | How |
|---------|----------|-----|
| Travel Hub (`/travel`) | Yes | Card alongside Flights and Stays |
| Travel Search | Yes | Own search form at `/travel/car-rental` |
| Dashboard — upcoming bookings | Yes | `CanonicalCarRentalBookingSummary` in bookings widget |
| Me — booking history | Yes | Past rentals in `rentals` history type |
| Radar — map view | Yes | Rental branch pins (pickup locations) |
| Mobility surfaces | **NO** | Never appears in taxi/delivery/mobility UI |
| Hotel/Stay surfaces | **NO** | Never appears in hotel search or stay results |
| Property/Seasonal surfaces | **NO** | Never appears in property listings |
| Dispatch/driver surfaces | **NO** | Never appears in driver matching or ride tracking |

### 7.2 End-to-End Flow (14 Steps)

| Step | Screen/Action | Responsible Domain | Inputs | Outputs | State Transition |
|------|--------------|-------------------|--------|---------|-----------------|
| 1 | User opens Car Rental search | Car Rental UI | — | Search form rendered | — |
| 2 | User fills search form and submits | Car Rental UI → Search | Pickup/return location + dates + preferences | `CanonicalCarRentalSearchIntent` created | — |
| 3 | Fan-out to providers | Car Rental Search | `CanonicalCarRentalSearchIntent` | Raw provider responses | Emit `car_rental.search.requested` |
| 4 | Normalize and rank offers | Car Rental Search | Raw provider responses | `CanonicalCarRentalOffer[]` | Emit `car_rental.search.completed` |
| 5 | Display offer list | Car Rental UI | `CanonicalCarRentalOffer[]` | User sees sorted offers | — |
| 6 | User selects offer | Car Rental UI | Selected offer ID | Offer detail page | Emit `car_rental.offer.selected` |
| 7 | User fills driver info and extras | Car Rental UI | Driver details, extras, insurance | Booking input assembled | — |
| 8 | Submit booking | Car Rental Booking | All booking inputs | `CanonicalCarRentalBooking` created | `draft` → `booking_started` |
| 9 | Request payment | Car Rental → Wallet | Deposit amount, currency | Payment intent | `booking_started` → `payment_pending` |
| 10 | Payment authorized | Wallet → Car Rental | Payment confirmation | Payment ref stored | `payment_pending` → `payment_authorized` |
| 11 | Send to provider | Car Rental → Provider Adapter | Booking details | Provider booking ref | `payment_authorized` → `provider_confirmation_pending` |
| 12 | Provider confirms | Provider → Car Rental (webhook) | Confirmation number | Booking confirmed | `provider_confirmation_pending` → `confirmed` |
| 13 | Pickup & rental period | Car Rental Booking | Provider signals or user action | Active rental | `confirmed` → `pickup_ready` → `active` |
| 14 | Return & completion | Car Rental Booking | Return confirmation | Booking complete | `active` → `return_pending` → `completed` |

### 7.3 Search Architecture

```
User Input (location, dates, class, extras)
        ↓
  CarRentalSearch.execute(searchIntent)
        ↓
  ┌─────────────────────────────────┐
  │  Provider Adapter Fan-Out       │
  │  ├── HertzAdapter.search()      │
  │  ├── AvisAdapter.search()       │
  │  ├── SixtAdapter.search()       │
  │  └── LocalFleetAdapter.search() │
  └─────────────────────────────────┘
        ↓
  Offer Normalization (→ CanonicalCarRentalOffer[])
        ↓
  Deduplication & Ranking
        ↓
  Return sorted offers to UI
```

**Rules**:
1. Parallel fan-out with individual per-provider timeouts
2. Partial results accepted (if Provider A responds and B times out, show A's results)
3. Every provider response normalized to `CanonicalCarRentalOffer` before reaching UI
4. Deduplication: same vehicle class + same pickup + price within 2% = deduplicate, prefer higher-priority provider
5. Default sort: `totalPrice ASC`. Alternatives: `vehicleClass`, `providerRating`, `freeCancellation`

### 7.4 UI Route Sequence

```
/travel/car-rental                    → CarRentalHub (search form)
/travel/car-rental/results            → CarRentalResults (offer list)
/travel/car-rental/offer/:offerId     → CarRentalOfferDetail (vehicle + extras)
/travel/car-rental/book/:offerId      → CarRentalDriverInfo (driver/license)
/travel/car-rental/payment/:bookingId → CarRentalPayment (deposit payment)
/travel/car-rental/confirm/:bookingId → CarRentalConfirmation (confirmed)
```

---

## 8. Wallet/Orbit/Dashboard Integration Points

### 8.1 Wallet Integration

**What Car Rental sends to Wallet**:
- Deposit payment request at `booking_started` → `payment_pending`: `{ amount: depositAmount, currency, bookingId, vertical: "car_rental", billingType: "per_booking" }`
- Refund request on cancellation or post-completion: `{ bookingId, refundAmount, reason }`

**What Car Rental receives from Wallet**:
- `commerce:payment_captured` → triggers `AUTHORIZE_PAYMENT` event on booking
- `wallet.payment.failed` → triggers `FAIL` event on booking
- `commerce:payment_reversed` → triggers `PROCESS_REFUND` on refund_pending bookings

**Payment flow**: `booking_deposit` (same as Stay/Services). Deposit at booking, balance at pickup (handled by provider directly or via platform depending on `paymentMode`).

### 8.2 Orbit Integration

**Thread types**:
- `rental_support` — General booking support
- `booking_modification` — Date/vehicle change requests
- `damage_report` — Post-rental damage documentation
- `extension_request` — Extend rental period

**Entity link**: `booking` (same as Stay/Services/Beauty/Health, NOT `job` like Taxi)

**Use cases**:
- User contacts provider about pickup instructions → `rental_support` thread linked to `booking:{bookingId}`
- User requests date change → `booking_modification` thread, triggers `REQUEST_MODIFICATION` on state machine
- User reports damage after return → `damage_report` thread with attachment support

### 8.3 Dashboard Integration

**Booking summary projection shape** (`CanonicalCarRentalBookingSummary`):
- Displayed in Dashboard's `bookings` preview widget alongside Stay and Flight bookings
- Shows: vehicle class, pickup location, pickup date, return date, status, provider name, confirmation number
- Quick action: "Manage rental" → `/travel/car-rental/confirm/{bookingId}`
- Active indicator: bookings in `confirmed`, `pickup_ready`, or `active` status

### 8.4 Proposed Module Wiring Entry

```typescript
// In MODULE_WIRING, key: "car_rental"
{
  vertical: "car_rental",
  label: "Car Rental",
  emoji: "🚗",
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
    previewWidget: "bookings",
  },
  radar: {
    discoveryMode: "search",
    entityType: "rental_branch",
    primaryFilters: ["vehicle_class", "price", "pickup_date", "return_date", "transmission", "provider"],
    mapPinType: "poi",
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
    entityLink: "booking",
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
    billingType: "per_booking",
    currencyAware: true,
  },
  me: {
    historyType: "rentals",
    favoritesType: "rental_providers",
    preferencesKeys: ["preferred_vehicle_class", "preferred_transmission", "preferred_insurance", "license_info", "frequent_renter_numbers"],
    documentsType: "rental_documents",
    addressRelevance: "travel",
    showInProfile: true,
  },
}
```

---

## 9. Provider Adapter Architecture

### 9.1 Adapter Interface (Amadeus-Style)

```typescript
interface CarRentalProviderAdapter {
  readonly providerId: string;
  readonly priority: number;

  search(params: CanonicalCarRentalSearchIntent): Promise<CanonicalCarRentalOffer[]>;

  getOfferDetail(offerId: string): Promise<CanonicalCarRentalOffer | null>;

  priceCheck(offerId: string): Promise<{
    available: boolean;
    priceChanged: boolean;
    oldPrice: number;
    newPrice: number;
    validUntil: string;
  }>;

  createBooking(
    offer: CanonicalCarRentalOffer,
    driver: CanonicalCarRentalBooking["driver"],
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
    mappedStatus: CarRentalBookingStatus;
  }>;
}
```

### 9.2 Adapter Responsibilities

| Responsibility | Adapter | Platform |
|---------------|---------|----------|
| Translate search params to provider format | Adapter | — |
| Call provider API with credentials | Adapter | Credentials from env secrets |
| Map provider response to `CanonicalCarRentalOffer` | Adapter (canonical mapper) | — |
| Handle provider-specific error codes | Adapter (error normalizer) | — |
| Store provider booking reference | Adapter returns ref | Platform stores in booking |
| Validate webhook signatures | — | Platform validates HMAC |
| Rate limiting per provider | Adapter | — |
| Retry on transient failures | Adapter | Config from `CarRentalProviderConfig` |

### 9.3 Backend-Only Secret Boundary

Provider API credentials MUST be stored as environment secrets and accessed only on the server side. The adapter layer is a **backend-only** component.

**Forbidden patterns**:
- Provider API keys in client-side code
- Provider API keys in any TypeScript import accessible from browser bundles
- Provider session tokens passed to the frontend
- Provider webhook secrets in client-accessible configuration
- Raw provider error messages exposed to users (normalize to canonical error types)
- Provider-specific data structures leaking past the adapter boundary

### 9.4 Canonical Mapper

Each adapter implements a canonical mapper that converts provider-specific types to `CanonicalCarRentalOffer`. The mapper:

1. Maps provider vehicle categories to `VehicleClass` enum
2. Converts provider pricing to canonical `pricing` structure (daily rate, taxes, fees, extras)
3. Normalizes location data to canonical pickup/return format
4. Maps provider cancellation policies to canonical `cancellation` structure
5. Strips provider-internal fields (session IDs, tracking codes, affiliate data)

### 9.5 Error Normalization

Provider errors are mapped to canonical error types:

| Provider Error | Canonical Error | User-Facing Message |
|---------------|----------------|---------------------|
| HTTP 404 / No availability | `no_availability` | "No vehicles available for these dates" |
| HTTP 400 / Invalid params | `invalid_search` | "Please check your search details" |
| HTTP 401 / Auth failure | `provider_error` | "This provider is temporarily unavailable" |
| HTTP 500 / Server error | `provider_error` | "This provider is temporarily unavailable" |
| Timeout | `provider_timeout` | "This provider took too long to respond" |
| Price changed | `price_changed` | "The price has changed since your search" |
| Booking rejected | `booking_rejected` | "The provider could not confirm this booking" |

### 9.6 Multi-Provider Expansion

| Provider | API Type | Coverage | Priority |
|----------|----------|----------|----------|
| Hertz | REST API | Global (150+ countries) | 1 |
| Avis/Budget | REST API | Global (180+ countries) | 2 |
| Sixt | REST API | Europe + Americas | 3 |
| Europcar | REST API | Europe + Africa + Asia | 4 |
| Local Fleet | Internal API | Per-market direct partners | 5 |
| CarTrawler | Aggregator API | Global (backup aggregator) | 10 |

### 9.7 Provider Reference Storage

The `providerBookingRef` stored in `CanonicalCarRentalBooking` is an opaque string. It encodes whatever the provider needs for future API calls (booking ID, confirmation code, etc.). The platform never parses, validates, or logs this reference beyond storing it.

---

## 10. Data Ownership, Event Model & Platform Bus Alignment

### 10.1 Data Source of Truth

| Data Domain | Source of Truth | Secondary Stores |
|-------------|----------------|------------------|
| Search intents | Car Rental domain (in-memory or short-lived cache) | Analytics pipeline |
| Offers | Provider adapters (ephemeral, expires per `validUntil`) | — |
| Bookings | Car Rental domain (`car_rental_bookings` table via `db()`) | Dashboard summary cache |
| Policy snapshots | Car Rental domain (immutable, co-located with booking) | — |
| Payment state | Wallet domain | Car Rental mirrors via events |
| User preferences | Me domain | Car Rental reads via Me API |
| Provider config | Environment secrets + config | — |

### 10.2 Complete Event Set

Following platform bus conventions: dot notation for canonical events, colon notation for platform reactions, `__bridged` flag prevents bridge loops.

| Event | Emitter | Payload Concept | Correlation ID | Downstream Consumers |
|-------|---------|----------------|----------------|---------------------|
| `car_rental.search.requested` | Search orchestrator | `{ intentId, userId, pickupLocation, dates }` | `intentId` | Analytics |
| `car_rental.search.completed` | Search orchestrator | `{ intentId, offerCount, providerStatuses }` | `intentId` | Analytics, Dashboard |
| `car_rental.search.failed` | Search orchestrator | `{ intentId, reason, failedProviders }` | `intentId` | Analytics, Monitoring |
| `car_rental.offer.selected` | Booking flow | `{ offerId, bookingId, providerId }` | `bookingId` | Analytics |
| `car_rental.offer.price_changed` | Price check | `{ offerId, oldPrice, newPrice }` | `offerId` | UI notification |
| `car_rental.booking.created` | Booking service | `{ bookingId, userId, providerId, status }` | `bookingId` | Analytics, Orbit |
| `car_rental.booking.payment_pending` | Booking service | `{ bookingId, depositAmount, currency }` | `bookingId` | Wallet |
| `car_rental.booking.payment_authorized` | Booking service | `{ bookingId, paymentRef }` | `bookingId` | Analytics |
| `car_rental.booking.provider_pending` | Booking service | `{ bookingId, providerId }` | `bookingId` | Monitoring |
| `car_rental.booking.confirmed` | Booking service | `{ bookingId, confirmationNumber }` | `bookingId` | Dashboard, Me, Notification |
| `car_rental.booking.modification_requested` | Booking service | `{ bookingId, modifications }` | `bookingId` | Provider adapter |
| `car_rental.booking.pickup_ready` | Provider webhook | `{ bookingId }` | `bookingId` | Notification |
| `car_rental.booking.activated` | Booking service | `{ bookingId }` | `bookingId` | Dashboard |
| `car_rental.booking.return_pending` | Booking service | `{ bookingId }` | `bookingId` | Dashboard |
| `car_rental.booking.completed` | Booking service | `{ bookingId, finalAmount }` | `bookingId` | Me, Analytics, Dashboard |
| `car_rental.booking.cancelled` | Booking service | `{ bookingId, reason, refundAmount }` | `bookingId` | Wallet, Dashboard, Notification |
| `car_rental.booking.failed` | Booking service | `{ bookingId, reason }` | `bookingId` | Notification, Analytics |
| `car_rental.booking.refund_requested` | Booking service | `{ bookingId, reason, amount }` | `bookingId` | Wallet |
| `car_rental.booking.refund_processed` | Wallet reaction | `{ bookingId, refundAmount }` | `bookingId` | Notification, Me |
| `car_rental.provider.webhook_received` | Webhook handler | `{ providerId, eventType }` | `providerRef` | Booking service |

### 10.3 Platform Reactions (Colon Notation)

```
car_rental:notify_user          — Push notification on booking status change
car_rental:update_dashboard     — Refresh dashboard widget on booking change
car_rental:sync_wallet          — Trigger wallet sync on payment events
car_rental:log_analytics        — Log event to analytics pipeline
car_rental:send_confirmation    — Send email/SMS confirmation
```

### 10.4 Cross-Vertical Event Listening

Car rental listens to **actual** platform bus event names:

| Car Rental Listens To | Actual Bus Event | Purpose |
|----------------------|-----------------|---------|
| Payment captured | `commerce:payment_captured` | `AUTHORIZE_PAYMENT` on booking |
| Payment failed | `wallet.payment.failed` | `FAIL` on booking |
| Payment reversed | `commerce:payment_reversed` | `PROCESS_REFUND` on refund_pending bookings |

The bridge in `platform-bus.ts` auto-converts between dot and colon notation. Car rental handlers must check `__bridged` to prevent infinite loops.

### 10.5 Collision-Avoidance Rules

1. **Namespace isolation**: All car rental events use `car_rental.*` prefix. No event may use `mobility.car_rental.*`, `taxi.rental.*`, or `travel.car_rental.*`.
2. **No shadowing**: Car rental events must not duplicate event names from other verticals (e.g., must not emit `booking.confirmed` without the `car_rental.` prefix).
3. **Correlation ID discipline**: Every event carries `bookingId` as correlation ID. Search events use `intentId`. Provider events use `providerRef`.
4. **Listener budget**: `MAX_LISTENERS_PER_EVENT = 50`, `MAX_GLOBAL_LISTENERS = 30`. Car rental adds ~20 event types. Audit current global listener count before implementation.
5. **Idempotent handlers**: All event handlers must be idempotent. Duplicate events (e.g., provider webhook retry) must not create duplicate state transitions.

---

## 11. Anti-Conflict Rules

These are **hard rules**, not suggestions. Violation of any rule is a blocking code review finding.

### 11.1 Car Rental vs Mobility

| Rule # | Rule | Rationale |
|--------|------|-----------|
| M-1 | Car Rental MUST NOT use `MobilityContext`, `UnifiedMobilityJobInput`, or any type from `unified-mobility.types.ts` | Car Rental is not a mobility job |
| M-2 | Car Rental MUST NOT use `MOBILITY_STATUSES` or any status from `status-machine.ts` (mobility) | Car Rental has its own state machine |
| M-3 | Car Rental MUST NOT appear in Mobility Hub (`/mobility/*`) routes or UI | Wrong vertical |
| M-4 | Car Rental MUST NOT use `fare_hold` wallet flow | Car Rental uses `booking_deposit` |
| M-5 | Car Rental MUST NOT use `job` orbit entity link | Car Rental uses `booking` |
| M-6 | Car Rental MUST NOT use `vehicle` map pin type | Car Rental uses `poi` for branch pins |
| M-7 | Car Rental MUST NOT use `per_ride` billing type | Car Rental uses `per_booking` |
| M-8 | Car Rental MUST NOT appear in `taxi.dashboard.shortcuts` | Wrong vertical association |
| M-9 | No mobility event may carry a `car_rental` booking reference | Namespace isolation |
| M-10 | No car rental event may carry a mobility `job_id` | Namespace isolation |

### 11.2 Car Rental vs Hotel/Stay

| Rule # | Rule | Rationale |
|--------|------|-----------|
| S-1 | Car Rental MUST NOT share canonical types with Stay (no `Room`, `RoomNight`, `CheckIn`) | Different inventory unit |
| S-2 | Car Rental MUST NOT appear in Stay search results or hotel listing pages | Wrong asset type |
| S-3 | Car Rental MAY use the same wallet flow (`booking_deposit`) and orbit link (`booking`) | These are shared platform patterns, not Stay-specific |
| S-4 | Car Rental MUST have its own subcategory taxonomy (`vehicle_class` cluster, not `hospitality`) | Different domain |
| S-5 | Car Rental booking summaries MUST be distinguishable from Stay summaries in Dashboard | Different `vehicleClass` vs `roomType` fields |

### 11.3 Car Rental vs Seasonal Rental (Property)

| Rule # | Rule | Rationale |
|--------|------|-----------|
| R-1 | Car Rental MUST NOT use property types (`Lease`, `Tenant`, `Landlord`, `PropertyUnit`) | Different asset, different legal framework |
| R-2 | Car Rental MUST NOT use property state machine (`LeaseStatus`) | Different lifecycle |
| R-3 | Car Rental MUST NOT appear in property listing or management surfaces | Wrong vertical |
| R-4 | Car Rental MUST NOT use property payment types (`rent`, `agency_fee`, `maintenance_cost`) | Different billing model |
| R-5 | Car Rental MUST NOT use `PropertyDocument` types | Car Rental has `rental_documents` |

### 11.4 Car Rental vs Flight

| Rule # | Rule | Rationale |
|--------|------|-----------|
| F-1 | Car Rental MUST NOT use `FlightStatus`, `FlightBooking`, `FlightOffer`, or flight types | Different asset |
| F-2 | Car Rental MUST NOT use `FlightSegment` or segment-based models | Vehicles are not segmented |
| F-3 | Car Rental MAY follow the same multi-provider adapter pattern as Flight | Shared architectural pattern |
| F-4 | Car Rental MAY appear alongside Flight in the Travel Hub | Both are Travel bookings |
| F-5 | Car Rental MUST have its own state machine (not reuse `FLIGHT_MACHINE`) | Different lifecycle stages |

### 11.5 Car Rental vs Wallet

| Rule # | Rule | Rationale |
|--------|------|-----------|
| W-1 | Car Rental MUST NOT process payments directly | Wallet owns payment processing |
| W-2 | Car Rental MUST NOT store card numbers or payment tokens | Wallet handles PCI compliance |
| W-3 | Car Rental MUST communicate with Wallet exclusively via platform bus events | Decoupled architecture |
| W-4 | Car Rental MUST listen to `commerce:payment_captured` and `wallet.payment.failed`, not invent custom payment events | Use existing bus conventions |

### 11.6 Car Rental vs Orbit

| Rule # | Rule | Rationale |
|--------|------|-----------|
| O-1 | Car Rental MUST use `booking` entity link, not `job`, `order`, or `inquiry` | Correct entity relationship |
| O-2 | Car Rental thread types MUST be prefixed or namespaced to avoid collision | `rental_support` not `support` |
| O-3 | Car Rental MUST NOT create Orbit thread types that collide with Stay (`hotel_support`) or Mobility (`ride_support`) | Namespace isolation |

### 11.7 Car Rental vs Dashboard

| Rule # | Rule | Rationale |
|--------|------|-----------|
| D-1 | Car Rental MUST use `CanonicalCarRentalBookingSummary` for Dashboard, not full booking objects | Lightweight projection |
| D-2 | Car Rental bookings MUST appear in the `bookings` widget, not the `orders` widget | Bookings not orders |
| D-3 | Car Rental MUST NOT inject custom widgets outside the standard pillar framework | Maintain Dashboard consistency |

### 11.8 Car Rental vs Search

| Rule # | Rule | Rationale |
|--------|------|-----------|
| X-1 | Car Rental search MUST be accessible only from Travel Hub and `/travel/car-rental/*` routes | Route isolation |
| X-2 | Car Rental offers MUST NOT appear in general Radar proximity search results | Different discovery mode |
| X-3 | Car Rental MUST NOT interfere with food/grocery/services search indexes | Domain isolation |

### 11.9 Car Rental vs Provider Schemas

| Rule # | Rule | Rationale |
|--------|------|-----------|
| P-1 | Raw provider response data MUST NOT leak past the adapter boundary | Canonical types only |
| P-2 | Provider-specific error codes MUST be normalized to canonical errors (§9.5) | Consistent UX |
| P-3 | Provider API credentials MUST be environment secrets, never in code | Security boundary |
| P-4 | Provider booking references (`providerBookingRef`) MUST be treated as opaque strings | No parsing/validation |

---

## 12. Taxonomy/Routing Guardrails & Security Boundary

### 12.1 Taxonomy Root

Car Rental's taxonomy root is the `car_rental` primary category key in `CATEGORY_TREE`. All subcategories live under the `vehicle_class` cluster. Car Rental MUST NOT define subcategories that overlap with other verticals (e.g., no `hotel_car`, no `taxi_rental`).

### 12.2 Vehicle Class Taxonomy Ownership

The `vehicle_class` cluster is owned exclusively by the Car Rental vertical. Values: `economy_car`, `midsize_car`, `suv`, `luxury_car`, `van_minibus`, `convertible`, `electric_car`, `pickup_truck`. No other vertical may define subcategories with these values.

### 12.3 Route Namespace

All Car Rental routes MUST live under `/travel/car-rental/*`:

```
/travel/car-rental                    → CarRentalHub
/travel/car-rental/results            → CarRentalResults
/travel/car-rental/offer/:offerId     → CarRentalOfferDetail
/travel/car-rental/book/:offerId      → CarRentalDriverInfo
/travel/car-rental/payment/:bookingId → CarRentalPayment
/travel/car-rental/confirm/:bookingId → CarRentalConfirmation
```

### 12.4 Forbidden Route/Category Collisions

- No routes under `/mobility/*` may reference car rental
- No routes under `/stay/*` or `/property/*` may reference car rental
- If legacy deep links exist pointing to `/mobility/car-rental`, implement a 301 redirect to `/travel/car-rental`
- No Car Rental page may import from `@/pages/mobility/*` or `@/pages/property/*`

### 12.5 Route Registry Entries

New entries for `app-route-registry.tsx`:

```typescript
export const CarRentalHub = safeLazy(() => import("@/pages/travel/CarRentalHub"), "CarRentalHub");
export const CarRentalResults = safeLazy(() => import("@/pages/travel/CarRentalResults"), "CarRentalResults");
export const CarRentalOfferDetail = safeLazy(() => import("@/pages/travel/CarRentalOfferDetail"), "CarRentalOfferDetail");
export const CarRentalDriverInfo = safeLazy(() => import("@/pages/travel/CarRentalDriverInfo"), "CarRentalDriverInfo");
export const CarRentalPayment = safeLazy(() => import("@/pages/travel/CarRentalPayment"), "CarRentalPayment");
export const CarRentalConfirmation = safeLazy(() => import("@/pages/travel/CarRentalConfirmation"), "CarRentalConfirmation");
```

### 12.6 Security Boundary

| Concern | Rule |
|---------|------|
| **Provider API credentials** | Backend-only. Stored as environment secrets. Never in client-accessible code. Never in TypeScript imports reachable from browser bundles. |
| **Provider tokens/sessions** | Never passed to frontend. Adapter layer is server-side only. |
| **Driver license PII** | Encrypted at rest. Stored in booking entity. Never logged in events. Never in `CanonicalCarRentalBookingSummary`. |
| **Payment data** | Handled entirely by Wallet. Car Rental never sees raw card numbers. |
| **Cross-user access** | All booking queries MUST filter by `userId`. No admin bypass without explicit RBAC check. |
| **Provider webhook validation** | HMAC signature validation using `webhookSecret` from config. Invalid signatures rejected with 401. |
| **Rate limiting** | Search endpoint: 10 searches/minute/user. Booking endpoint: 5 bookings/minute/user. |
| **Logging/redaction** | License numbers, payment refs, and provider booking refs MUST be redacted in application logs. Only `bookingId` may appear in plain text. |

---

## 13. Migration Without Runtime Disruption

### 13.1 Migration Principles

1. **No dual-resolution window**: At no point should `car_rental` resolve to two different primaries simultaneously
2. **Atomic taxonomy swap**: Old subcategory removal and new primary addition in a single PR/deploy
3. **Feature-flag gated**: New routes gated until all backend wiring validated
4. **Zero downtime**: No migration step requires restart or database downtime
5. **Reversible**: Every phase has a defined rollback

### 13.2 Migration Phases

#### Phase M1: Domain Scaffolding (No Taxonomy Changes)

**Changes**:
- Add canonical types to `src/domains/car-rental/car-rental-types.ts`
- Add `CAR_RENTAL_MACHINE` to `src/domains/car-rental/car-rental-state-machine.ts`
- Add car rental routes to `app-route-registry.tsx` (behind feature flag, placeholder UI)

**Does NOT change**: No taxonomy files. No `TERMINAL_STATES`. No module wiring. No classification engine.

**Key principle**: No `car_rental` primary key exists in taxonomy. Zero dual-resolution risk.

**Validation**: App boots, existing tests pass, feature-flagged routes render placeholder.

#### Phase M2: Provider Adapters + Search (Isolated)

**Changes**:
- Implement mock provider adapter
- Create search orchestrator
- Wire feature-flagged UI pages to search
- Register car rental events in platform bus (emitted only from feature-flagged paths)

**Does NOT change**: No taxonomy files. No classification engine. No module wiring.

**Validation**: Behind flag, search returns mock results. Booking lifecycle works with mock provider.

#### Phase M3: Atomic Taxonomy Cutover (Single PR)

**All in ONE PR**:
1. Extend `ArchitectureType`: add `| "rental_booking"`
2. Extend `FulfillmentType`: add `| "rental_contract"`
3. Add new `car_rental` primary to `CATEGORY_TREE`
4. **Simultaneously** remove `car_rental` from `taxi.subcategories`
5. Remove `car_rental` from `MOBILITY_FAMILY` in `canonical-registry.ts`; add `CAR_RENTAL_FAMILY`
6. Update classification engine: Hertz/Avis/Sixt → `category: "car_rental"`
7. Add `car_rental` to `mapCategoryKeyToVertical()` in `world-class-taxonomy.ts` (extend `Vertical` type)
8. Add `"car_rental"` to `VerticalKey` union in `module-wiring.ts`
9. Add `MODULE_WIRING["car_rental"]` entry
10. Add `car_rental: "car_rental"` to `getVerticalForCategoryKey()`
11. Remove `"car_rental"` from `taxi.dashboard.shortcuts`
12. Add `car_rental` to `TERMINAL_STATES`
13. Data migration: re-classify existing `category='taxi', subcategory='car_rental'` records

**Why atomic**: Steps 3+4 must be in same commit. If only 3 lands, two primaries resolve `car_rental`. If only 4 lands, `car_rental` disappears.

**Validation**: `resolveSubcategory("car_rental")` returns new primary. `getVerticalForCategoryKey("car_rental")` returns `"car_rental"`. Classification routes Hertz → `car_rental`. No `car_rental` in mobility taxonomy. Taxi flows unaffected.

#### Phase M4: Remove Feature Flag & Go Live

**Changes**: Remove feature flag. Add car rental card to TravelHub. Enable real providers. Monitor bus listeners.

**Validation**: Full e2e flow in production.

### 13.3 Rollback Plan

| Phase | Rollback |
|-------|----------|
| M1 | Remove domain files. Zero data impact. |
| M2 | Disable feature flag. Remove adapters/search. Zero data impact. |
| M3 | Revert single PR. `car_rental` returns to taxi. Re-classify migrated records. |
| M4 | Re-enable feature flag. Disable providers. Taxonomy stays (M3 not reverted). |

### 13.4 Data Migration

```sql
UPDATE listings
SET category = 'car_rental', subcategory = 'economy_car', vertical = 'car_rental'
WHERE category = 'taxi' AND subcategory = 'car_rental';
```

Requirements: idempotent, audited (log affected row count), reversible (store old values before update).

---

## 14. Multi-Provider Strategy, Implementation Phasing & Risks

### 14.1 Multi-Provider Design

Car Rental is designed for world-scale multi-provider support from day one:
- Adapter interface abstracts provider differences (§9)
- Fan-out search queries all enabled providers in parallel
- Canonical types prevent provider lock-in
- Provider priority system enables market-specific optimization
- Per-provider circuit breakers prevent cascade failures

### 14.2 Implementation Phasing

| Phase | Scope | Description |
|-------|-------|-------------|
| P1 | Mock Adapter | Full lifecycle with simulated responses. Validates state machine, events, UI flow. |
| P2 | Single Provider | First real API (Hertz or CarTrawler). Validates normalization, error handling, payment. |
| P3 | Multi-Provider | 2-3 providers. Validates fan-out, dedup, ranking. |
| P4 | Full Suite | All providers. Local fleet. Market-specific. |

### 14.3 What Is Done Now (This Document)

- Architecture design for all components
- Canonical model definitions
- State machine design
- Event model design
- Anti-conflict rules
- Migration plan
- Provider adapter interface
- 5-pillar wiring specification

### 14.4 What May Be Done Later (After Approval)

- Phase M1: Domain scaffolding (types, state machine, placeholder routes)
- Phase M2: Provider adapters and search orchestration
- Phase M3: Atomic taxonomy cutover
- Phase M4: Feature flag removal and go-live
- Provider P1-P4: Progressive provider integration

### 14.5 What MUST NOT Be Done Now

- No code changes to any existing file
- No modifications to `category-tree.ts`, `classification-engine.ts`, `canonical-registry.ts`, `world-class-taxonomy.ts`, or `module-wiring.ts`
- No runtime activation, feature flag creation, or event emission
- No provider API integration or credential setup
- No database schema changes or migrations
- No changes to existing Flight, Hotel, Seasonal, Mobility, Wallet, Orbit, or Dashboard flows
- No route exposure or UI deployment

### 14.6 Risks & Guardrails

| Risk | Likelihood | Impact | Guardrail |
|------|-----------|--------|-----------|
| **Mobility/Taxi overlap** | Medium | High | Anti-conflict rules M-1 through M-10 (§11.1). Code review blocking on any mobility import. |
| **Taxonomy contamination** | Low (if M3 atomic) | Critical | Single-PR atomic swap. CI assertion: no duplicate keys across primaries. |
| **Event collision** | Low | Medium | `car_rental.*` namespace enforced. Collision-avoidance rules (§10.5). |
| **Provider lock-in** | Low | Medium | Adapter interface enforces canonical types. No provider-specific types leak past adapter. |
| **Provider API instability** | Medium | High | Per-provider circuit breaker. Timeout + retry from config. Partial results on degradation. |
| **Price discrepancy at booking** | High | Medium | Mandatory `priceCheck()` before `createBooking()`. >5% change requires re-confirmation. |
| **Platform bus listener overflow** | Low | Medium | Audit listener count pre-implementation. Car rental adds ~20 events within budget. |
| **Driver license PII exposure** | Low | High | Encrypted at rest. Redacted in logs. Never in summary projections or events. |
| **Dual-resolution during migration** | Low | Critical | Phase M3 is atomic. No intermediate deploy between add and remove. |
| **Existing car_rental data orphaned** | Low | High | Phase M3 includes explicit data migration query. Rollback includes reverse migration. |
| **Cross-border rental complexity** | Medium | Low | `supportsCrossBorder` flag per provider. Hidden in UI when not supported. |

### 14.7 Monitoring & Observability

| Metric | Alert Threshold |
|--------|----------------|
| Search success rate | <90% → warning |
| Booking conversion (offer → confirmed) | <20% → investigate |
| Provider response time (p95) | >5s → warning |
| Payment failure rate | >5% → critical |
| State machine violations (`safeTransition` blocked) | >0/hour → investigate |
| Provider webhook failure rate | >10% → warning |

---

## 15. Final Recommendation & Closing Declaration

### 15.1 Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Vertical placement** | Own `VerticalKey` `"car_rental"` with category-tree `vertical: "travel"` | Needs dedicated 5-pillar wiring incompatible with taxi (dispatch) and flight (ticket-based). Own `VerticalKey` is cleanest. |
| **Category-tree treatment** | New top-level primary with `architecture: "rental_booking"`, `fulfillment: "rental_contract"` | Cannot share taxi's settings. Requires new type union members. |
| **State machine** | 15 states, 18 events following `Machine<S, E>` pattern | Includes `provider_confirmation_pending` (payment ≠ confirmed), `modification_pending`, and explicit `TIMEOUT` events |
| **Wallet flow** | `booking_deposit` | Deposit at booking, balance at pickup. Same as Stay/Services. |
| **Orbit context** | `booking` entity link | Same as Stay/Services. Not `job` (taxi). |
| **Discovery mode** | `search` (date-range) | Not `proximity`. Users search by dates + location. |
| **Provider pattern** | Adapter interface with Amadeus-style fan-out | Multi-provider from day one. Backend-only secret boundary. |
| **Event namespace** | `car_rental.*` | Clean separation from `mobility.*`, `flight.*`, `stay.*` |
| **Route namespace** | `/travel/car-rental/*` | Under Travel umbrella alongside flights and stays. |
| **Canonical models** | 5 canonical types with immutable snapshots | `CanonicalCarRentalOffer`, `CanonicalCarRentalBooking`, `CanonicalCarRentalSearchIntent`, `CanonicalCarRentalBookingSummary`, `CanonicalCarRentalPolicySnapshot` |
| **Migration strategy** | 4-phase with atomic taxonomy swap at M3 | Zero downtime. Feature-flag gated. No dual-resolution window. |

### 15.2 Implementation Priority

1. Types & State Machine (foundation)
2. Provider Adapter Interface (enables parallel provider work)
3. Search Orchestration (core user feature)
4. 5-Pillar Wiring (Dashboard, Radar, Orbit, Wallet, Me)
5. UI Routes & Pages
6. Atomic Taxonomy Cutover (Phase M3)
7. Real Provider Integration (P2-P4)
8. Observability & Monitoring

### 15.3 Non-Goals (Explicitly Out of Scope)

- Peer-to-peer car sharing (Turo model) — different business model
- Long-term vehicle leasing (30+ days) — different contract structure
- Vehicle purchase — belongs in shops/marketplace
- Chauffeur-driven rentals — remains in mobility/taxi (dispatch model)
- Motorcycle/scooter rental — future extension, not initial scope

### 15.4 Final Declaration

**No implementation has been performed.** This document is a design artifact. No code has been changed, no files have been modified, no database schemas have been altered, no feature flags have been created, no events have been emitted, no routes have been exposed, and no provider APIs have been integrated.

All recommendations require separate implementation tasks with their own code review cycles. The atomic taxonomy cutover (Phase M3) is the highest-risk step and requires the most rigorous review.

---

*End of Architecture Document — No Implementation Performed*
