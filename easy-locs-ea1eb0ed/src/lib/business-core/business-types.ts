export type BusinessType =
  | 'hotel'
  | 'restaurant'
  | 'service'
  | 'delivery'
  | 'real_estate'
  | 'shop'
  | 'health'
  | 'flight'
  | 'grocery'
  | 'pet'
  | 'fitness';

export type BusinessStatus = 'draft' | 'onboarding' | 'active' | 'suspended' | 'archived';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'expired';
export type MediaType = 'image' | 'video';
export type EntityType = 'business' | 'room' | 'menu_item' | 'service' | 'listing' | 'product';
export type CalendarStatus = 'open' | 'closed' | 'limited' | 'blocked';
export type PriceType = 'fixed' | 'starting' | 'hourly' | 'per_night' | 'per_unit';
export type PolicyType = 'cancellation' | 'refund' | 'no_show' | 'terms';
export type OnboardingStepStatus = 'pending' | 'completed' | 'blocked' | 'skipped';
export type ServiceMode = 'dine_in' | 'takeaway' | 'delivery' | 'pickup' | 'online' | 'on_site';

export interface BusinessCore {
  business_id: string;
  owner_user_id: string;
  organization_id: string | null;
  business_type: BusinessType;
  canonical_path: string;
  status: BusinessStatus;
  verification_status: VerificationStatus;
  onboarding_progress: number;
  name: string;
  legal_name: string | null;
  brand_name: string | null;
  description_short: string | null;
  description_long: string | null;
  phone: string | null;
  email: string | null;
  orbit_thread_id: string | null;
  whatsapp_optional: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  zone: string | null;
  country: string;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
  geo_hash: string | null;
  landmark: string | null;
  logo_media_id: string | null;
  cover_media_id: string | null;
  gallery_ids: string[];
  opening_hours_json: OpeningHours | null;
  timezone: string;
  is_24_7: boolean;
  is_temporarily_closed: boolean;
  tags: string[];
  languages: string[];
  currency: string;
  rating: number;
  review_count: number;
  service_modes: ServiceMode[];
  created_at: string;
  updated_at: string;
  created_by: string;
  last_activity_at: string;
}

export interface OpeningHours {
  monday: DaySchedule | null;
  tuesday: DaySchedule | null;
  wednesday: DaySchedule | null;
  thursday: DaySchedule | null;
  friday: DaySchedule | null;
  saturday: DaySchedule | null;
  sunday: DaySchedule | null;
}

export interface DaySchedule {
  open: string;
  close: string;
  breaks?: { start: string; end: string }[];
}

export interface MediaAsset {
  media_id: string;
  business_id: string;
  entity_type: EntityType;
  entity_id: string;
  media_type: MediaType;
  url: string;
  thumbnail_url: string | null;
  aspect_ratio: string | null;
  width: number | null;
  height: number | null;
  quality_score: number;
  category_match_score: number;
  is_primary: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface AvailabilityCalendar {
  calendar_id: string;
  business_id: string;
  entity_type: EntityType;
  entity_id: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  capacity: number;
  available_units: number;
  status: CalendarStatus;
  price_override: number | null;
  notes: string | null;
}

export interface HotelProfile {
  business_id: string;
  star_rating: number;
  property_type: string;
  total_rooms: number;
  checkin_time: string;
  checkout_time: string;
  reception_24h: boolean;
  policies_json: Record<string, string>;
}

export interface HotelRoom {
  room_id: string;
  business_id: string;
  name: string;
  description: string | null;
  capacity: number;
  bed_type: string;
  size_m2: number | null;
  base_price: number;
  currency: string;
  amenities_json: string[];
  media_ids: string[];
}

export interface HotelRatePlan {
  plan_id: string;
  room_id: string;
  name: string;
  price: number;
  cancellation_policy: string;
  includes_breakfast: boolean;
  refundable: boolean;
  conditions_json: Record<string, string>;
}

export interface HotelAmenity {
  business_id: string;
  amenity_type: string;
  is_available: boolean;
  description: string | null;
}

export interface RestaurantProfile {
  business_id: string;
  cuisine_types: string[];
  service_modes: ServiceMode[];
  avg_prep_time: number | null;
  delivery_radius_km: number | null;
  min_order_amount: number | null;
  is_cloud_kitchen: boolean;
}

export interface MenuCategory {
  category_id: string;
  business_id: string;
  name: string;
  order_index: number;
  active: boolean;
}

export interface MenuItem {
  item_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  is_available: boolean;
  prep_time: number | null;
  calories_optional: number | null;
  media_ids: string[];
  tags: string[];
  popularity_score: number;
}

export interface MenuModifier {
  modifier_id: string;
  item_id: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  options_json: { name: string; price: number }[];
}

export interface DeliverySettings {
  business_id: string;
  fee: number;
  free_above: number | null;
  zones_json: { name: string; fee: number; radius_km: number }[];
  estimated_time_min: number;
  estimated_time_max: number;
}

export interface ServiceProfile {
  business_id: string;
  service_types: string[];
  coverage_radius_km: number | null;
  emergency_available: boolean;
  response_time_avg: number | null;
  verified_provider: boolean;
}

export interface ServiceItem {
  service_id: string;
  business_id: string;
  name: string;
  description: string | null;
  price_type: PriceType;
  base_price: number;
  duration_estimate: number | null;
  requires_booking: boolean;
  media_ids: string[];
}

export interface ServiceSlot {
  slot_id: string;
  service_id: string;
  date: string;
  start_time: string;
  end_time: string;
  available: boolean;
  capacity: number;
}

export interface ProviderTeamMember {
  member_id: string;
  business_id: string;
  name: string;
  role: string;
  experience_years: number | null;
  languages: string[];
  verified: boolean;
}

export interface PricingRule {
  rule_id: string;
  business_id: string;
  entity_type: EntityType;
  entity_id: string;
  base_price: number;
  dynamic_rules_json: DynamicPriceRule[];
  tax_included: boolean;
  currency: string;
}

export interface DynamicPriceRule {
  condition: string;
  multiplier: number;
  start_date?: string;
  end_date?: string;
}

export interface BusinessPolicy {
  policy_id: string;
  business_id: string;
  type: PolicyType;
  description: string;
  rules_json: Record<string, unknown>;
}

export interface Review {
  review_id: string;
  business_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  verified_transaction: boolean;
}

export interface TrustSignals {
  business_id: string;
  verified_badge: boolean;
  response_rate: number;
  avg_response_time: number;
  completed_orders: number;
  cancellation_rate: number;
}

export interface OnboardingStep {
  step_id: string;
  business_id: string;
  step_name: string;
  step_index: number;
  status: OnboardingStepStatus;
  required: boolean;
  validation_errors: string[];
  completed_at: string | null;
}

export interface BusinessQualityScore {
  business_id: string;
  completeness_score: number;
  media_score: number;
  consistency_score: number;
  trust_score: number;
  overall_score: number;
  last_evaluated_at: string;
}

export const ONBOARDING_STEPS = [
  'identity',
  'location',
  'media',
  'category',
  'catalog',
  'pricing',
  'availability',
  'policies',
  'contact',
  'hours',
  'team',
  'verification',
  'review',
  'go_live',
] as const;

export type OnboardingStepName = (typeof ONBOARDING_STEPS)[number];

export const REQUIRED_STEPS: OnboardingStepName[] = [
  'identity',
  'location',
  'category',
  'catalog',
  'pricing',
  'availability',
];

export const VERTICAL_MODULES: Record<BusinessType, string[]> = {
  hotel: ['rooms', 'amenities', 'rate_plans', 'availability_calendar'],
  restaurant: ['menu_categories', 'menu_items', 'modifiers', 'delivery_settings'],
  service: ['service_items', 'service_slots', 'provider_team'],
  delivery: ['menu_items', 'delivery_settings'],
  real_estate: ['listings', 'area_details', 'rental_sale_attributes'],
  shop: ['categories', 'products', 'stock', 'variants'],
  health: ['service_items', 'service_slots', 'provider_team', 'certifications'],
  flight: ['routes', 'schedules', 'fare_classes'],
  grocery: ['categories', 'products', 'stock'],
  pet: ['service_items', 'products', 'provider_team'],
  fitness: ['service_items', 'service_slots', 'memberships'],
};
