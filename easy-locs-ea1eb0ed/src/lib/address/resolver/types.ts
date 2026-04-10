/**
 * Canonical Address Resolver — Types.
 */
export interface CanonicalPlaceRow {
  id: string;
  provider: string;
  provider_place_id: string | null;
  place_type: string;
  country_code: string;
  country_name: string | null;
  city: string | null;
  district: string | null;
  subdistrict: string | null;
  postal_code: string | null;
  street: string | null;
  building: string | null;
  landmark: string | null;
  formatted_address: string;
  short_label: string | null;
  lat: number;
  lng: number;
  timezone: string | null;
  geohash: string | null;
  zone_key: string | null;
  parent_place_id: string | null;
  popularity_score: number;
  confidence_score: number;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface UserSavedAddress {
  id: string;
  user_id: string;
  canonical_place_id: string | null;
  label: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  apartment: string | null;
  floor: string | null;
  unit_number: string | null;
  entrance: string | null;
  delivery_note: string | null;
  is_default: boolean;
  is_favorite: boolean;
  last_used_at: string | null;
  place?: CanonicalPlaceRow | null;
}

export interface ActiveAddressContext {
  user_id: string;
  context_type: string;
  canonical_place_id: string | null;
  source_type: string | null;
  source: string;
  lat: number;
  lng: number;
  country_code: string | null;
  city: string | null;
  district: string | null;
  zone_key: string | null;
}

export interface ResolvedAddress {
  canonical_place_id: string;
  formatted_address: string;
  short_label: string | null;
  country_code: string;
  country_name: string | null;
  city: string | null;
  district: string | null;
  subdistrict: string | null;
  postal_code: string | null;
  street: string | null;
  building: string | null;
  landmark: string | null;
  lat: number;
  lng: number;
  timezone: string | null;
  geohash: string | null;
  place_type: string;
  zone_key: string | null;
}
