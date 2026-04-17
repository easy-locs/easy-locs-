import { db } from "@/services/db";
import { assertValidProviderType, assertValidKycStatus } from "@/lib/security/enum-validators";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export type ProviderType =
  | "taxi_driver"
  | "service_provider"
  | "hotel"
  | "restaurant"
  | "delivery_driver"
  | "commerce"
  | "individual"
  | "company";

export type ProviderKycStatus =
  | "not_started"
  | "documents_pending"
  | "pending"
  | "verified"
  | "rejected";

export interface ProviderBaseFields {
  user_id: string;
  provider_type: ProviderType;
  display_name: string;
  city: string;
  country: string;
  coverage_radius_km: number;
  gallery_urls: string[];
  is_active: boolean;
  onboarding_status: string;
  onboarding_completed_at: string;
  kyc_status: ProviderKycStatus;
  metadata: Record<string, unknown>;
}

export interface ProviderOptionalFields {
  profile_photo_url?: string | null;
  legal_name?: string;
  address_line1?: string;
  postal_code?: string;
  lat?: number | null;
  lng?: number | null;
  description?: string;
  bank_iban?: string;
  bank_account_holder?: string;
  bank_name?: string;
  bank_swift?: string;
  operating_hours?: Record<string, string[]> | Record<string, never>;
  tags?: string[];
}

export type ProviderUpsertPayload = ProviderBaseFields & ProviderOptionalFields;

export function buildProviderBase(
  userId: string,
  providerType: ProviderType,
  displayName: string,
  overrides: {
    city?: string;
    country?: string;
    coverageRadiusKm?: number;
    galleryUrls?: string[];
    kycStatus?: ProviderKycStatus;
    metadata?: Record<string, unknown>;
  } = {},
): ProviderBaseFields {
  return {
    user_id: userId,
    provider_type: providerType,
    display_name: displayName,
    city: overrides.city ?? "Dubai",
    country: overrides.country ?? "AE",
    coverage_radius_km: overrides.coverageRadiusKm ?? 0,
    gallery_urls: overrides.galleryUrls ?? [],
    is_active: false,
    onboarding_status: "completed",
    onboarding_completed_at: new Date().toISOString(),
    kyc_status: overrides.kycStatus ?? "not_started",
    metadata: overrides.metadata ?? {},
  };
}

export async function upsertProviderRecord(
  payload: ProviderUpsertPayload,
  options?: { select?: string },
): Promise<{ id?: string }> {
  assertValidProviderType(payload.provider_type);
  assertValidKycStatus(payload.kyc_status);
  let query = cFrom("providers").upsert(payload, { onConflict: "user_id" });

  if (options?.select) {
    const { data, error } = await query.select(options.select).single();
    if (error) throw error;
    return data ?? {};
  }

  const { error } = await query;
  if (error) throw error;
  return {};
}
