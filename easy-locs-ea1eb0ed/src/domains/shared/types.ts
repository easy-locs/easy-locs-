/**
 * Shared DDD types — Value objects, base entities, domain event primitives.
 * Every domain imports from here, never from each other directly.
 */

// ── Value Objects ──
export interface Money {
  amount: number;
  currency: string;
}

export interface DateRange {
  start: string; // ISO
  end: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  country: string;
  countryCode: string;
  postalCode?: string;
  geo?: GeoPoint;
}

export interface PersonName {
  first: string;
  last: string;
  display?: string;
}

// ── Base Entity ──
export interface DomainEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ── Domain Event ──
export interface DomainEvent<T = Record<string, unknown>> {
  type: string;
  aggregateId: string;
  aggregateType: string;
  payload: T;
  occurredAt: string;
  source: string;
  correlationId?: string;
}

// ── Result type for use-cases ──
export type DomainResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

// ── Port interfaces (hexagonal) ──
export interface Repository<T extends DomainEntity> {
  findById(id: string): Promise<T | null>;
  save(entity: T): Promise<void>;
}

export interface EventPublisher {
  publish(event: DomainEvent): void;
}
