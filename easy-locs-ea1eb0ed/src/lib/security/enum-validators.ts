import type { ProviderType, ProviderKycStatus } from "@/services/onboarding-providers.service";

const VALID_PROVIDER_TYPES: ReadonlySet<string> = new Set<ProviderType>([
  "taxi_driver",
  "service_provider",
  "hotel",
  "restaurant",
  "delivery_driver",
  "commerce",
  "individual",
  "company",
]);

const VALID_KYC_STATUSES: ReadonlySet<string> = new Set<ProviderKycStatus>([
  "not_started",
  "documents_pending",
  "pending",
  "verified",
  "rejected",
]);

const VALID_BOOKING_STATUSES: ReadonlySet<string> = new Set([
  "pending",
  "confirmed",
  "rejected",
  "completed",
  "cancelled",
  "paid",
  "payment_failed",
  "refunded",
]);

const VALID_KYC_DOC_STATUSES: ReadonlySet<string> = new Set([
  "pending",
  "approved",
  "rejected",
  "expired",
]);

const VALID_ONBOARDING_STATUSES: ReadonlySet<string> = new Set([
  "not_started",
  "in_progress",
  "completed",
  "suspended",
]);

export function isValidProviderType(value: unknown): value is ProviderType {
  return typeof value === "string" && VALID_PROVIDER_TYPES.has(value);
}

export function isValidKycStatus(value: unknown): value is ProviderKycStatus {
  return typeof value === "string" && VALID_KYC_STATUSES.has(value);
}

export function isValidBookingStatus(value: unknown): boolean {
  return typeof value === "string" && VALID_BOOKING_STATUSES.has(value);
}

export function isValidKycDocStatus(value: unknown): boolean {
  return typeof value === "string" && VALID_KYC_DOC_STATUSES.has(value);
}

export function isValidOnboardingStatus(value: unknown): boolean {
  return typeof value === "string" && VALID_ONBOARDING_STATUSES.has(value);
}

export function assertValidProviderType(value: unknown): asserts value is ProviderType {
  if (!isValidProviderType(value)) {
    throw new Error(`Invalid provider_type: "${String(value)}". Allowed: ${[...VALID_PROVIDER_TYPES].join(", ")}`);
  }
}

export function assertValidKycStatus(value: unknown): asserts value is ProviderKycStatus {
  if (!isValidKycStatus(value)) {
    throw new Error(`Invalid kyc_status: "${String(value)}". Allowed: ${[...VALID_KYC_STATUSES].join(", ")}`);
  }
}

export function assertValidBookingStatus(value: unknown): void {
  if (!isValidBookingStatus(value)) {
    throw new Error(`Invalid booking_status: "${String(value)}". Allowed: ${[...VALID_BOOKING_STATUSES].join(", ")}`);
  }
}

export function validateEnumField<T extends string>(
  value: unknown,
  validValues: ReadonlySet<string>,
  fieldName: string,
): T {
  if (typeof value !== "string" || !validValues.has(value)) {
    throw new Error(`Invalid ${fieldName}: "${String(value)}". Allowed: ${[...validValues].join(", ")}`);
  }
  return value as T;
}
