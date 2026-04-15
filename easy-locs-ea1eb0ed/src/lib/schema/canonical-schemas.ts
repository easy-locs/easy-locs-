/**
 * canonical-schemas.ts
 *
 * TypeScript interfaces for every canonical database entity in the Easy-Locs
 * platform. Each interface maps 1-to-1 to a PostgreSQL table owned by its
 * domain schema (Task #56 — Domain Schema Architecture).
 *
 * NAMING CONVENTION (Task #132 — Taxonomy & Canonical Audit):
 * Types that have a corresponding domain-layer definition in canonical-types.ts
 * use a `Db` prefix (e.g. DbMessage, DbAddress, DbPresence) to eliminate
 * naming conflicts. Types unique to the DB layer keep the `Canonical` prefix.
 *
 * Domain schema ownership (pg_schema → canonical table):
 *   identity     → profiles, organizations, organization_members
 *   wallet       → wallet_accounts, wallet_transactions, wallet_ledger_entries
 *   orbit        → conversations_v2, messages_v2, conversation_participants_v2,
 *                  orbit_contacts_v2, ghost_call_sessions
 *   marketplace  → listings, listing_details, listing_attributes,
 *                  categories, verticals, reviews, favorites
 *   commerce     → bookings, transactions, carts, receipts, payout_requests
 *   property     → properties, units, leases
 *   onboarding   → onboarding_sessions, import_jobs, staging_entities
 *   support      → support_tickets
 *   notification → app_notifications, user_notification_preferences, user_push_tokens
 *   system       → engine_supervisor, engine_run_logs, worker_health_snapshots
 *   analytics    → user_radar_events, user_radar_profiles
 *
 * Public compatibility views mirror every moved table under the original name
 * in the `public` schema. Use domain-schemas.ts for programmatic schema lookups.
 */
import type {
  EntityStatus, TransactionStatus, PublicationStatus, PaymentStatus,
  FulfillmentStatus, KycStatus, ConversationStatus, MessageStatus,
  CallStatus, OnboardingStatus, ImportStatus, ModerationStatus,
  AvailabilityStatus, BookingStatus, SupportTicketStatus, EngineStatus,
  ConsentStatus, LedgerDirection,
} from "./status-enums";

export interface Timestamps {
  created_at: string;
  updated_at: string;
}

export type AccountType =
  | "individual" | "professional" | "admin" | "staff"
  | "tenant" | "landlord" | "provider" | "buyer" | "seller";

export interface CanonicalIdentity extends Timestamps {
  user_id: string;
  account_type: AccountType;
  phone_e164: string | null;
  email_normalized: string | null;
  otp_verified: boolean;
  identity_status: EntityStatus;
  profile_status: EntityStatus;
  kyc_status: KycStatus;
  primary_org_id: string | null;
  default_locale: string;
  default_currency: string;
  country_code: string;
  time_zone: string;
}

export type OrgType =
  | "shop" | "brand" | "agency" | "provider_company"
  | "property_management" | "team" | "marketplace_seller";

export interface CanonicalOrganization extends Timestamps {
  org_id: string;
  org_type: OrgType;
  legal_name: string;
  display_name: string;
  brand_name: string | null;
  owner_user_id: string;
  status: EntityStatus;
  country: string;
  city: string;
  address_id: string | null;
  tax_status: string | null;
  verification_status: KycStatus;
  settings_id: string | null;
}

export type PrecisionLevel = "exact" | "street" | "district" | "city" | "country";

export interface DbAddress extends Timestamps {
  address_id: string;
  country: string;
  state_region: string | null;
  city: string;
  district: string | null;
  street_1: string;
  street_2: string | null;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
  formatted_address: string | null;
  place_source: string | null;
  precision_level: PrecisionLevel;
}

export type MediaKind =
  | "photo" | "video" | "logo" | "cover" | "gallery"
  | "document" | "avatar" | "thumbnail" | "banner";

export interface DbMedia extends Timestamps {
  media_id: string;
  owner_type: string;
  owner_id: string;
  media_kind: MediaKind;
  mime_type: string;
  storage_key: string;
  url: string;
  source_type: string | null;
  source_reference: string | null;
  is_primary: boolean;
  sort_order: number;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  moderation_status: ModerationStatus;
  hash: string | null;
}

export interface CanonicalTaxonomy extends Timestamps {
  taxonomy_id: string;
  vertical: string;
  category: string;
  subcategory: string | null;
  type: string | null;
  canonical_label: string;
  slug: string;
  icon_ref: string | null;
  sort_order: number;
  is_active: boolean;
  parent_id: string | null;
}

export interface CanonicalEvent extends Timestamps {
  event_id: string;
  event_name: string;
  event_version: number;
  domain: string;
  actor_type: string;
  actor_id: string;
  target_type: string;
  target_id: string;
  payload: Record<string, unknown>;
  status: string;
  occurred_at: string;
  trace_id: string;
}

export type ListingType =
  | "article" | "annonce" | "service" | "property"
  | "activity" | "room" | "menu_item" | "product" | "offer";

export type SellerType = "particulier" | "professionnel";

export type PriceModel =
  | "fixed" | "negotiable" | "auction" | "per_hour"
  | "per_day" | "per_night" | "per_unit" | "free" | "on_request";

export type LocationMode = "physical" | "remote" | "both" | "delivery_only";
export type AvailabilityMode = "always" | "calendar" | "stock" | "manual";
export type InventoryMode = "unlimited" | "counted" | "unique";

export interface DbListing extends Timestamps {
  listing_id: string;
  listing_type: ListingType;
  vertical: string;
  seller_type: SellerType;
  seller_id: string;
  org_id: string | null;
  title: string;
  short_description: string | null;
  long_description: string | null;
  taxonomy_id: string | null;
  status: EntityStatus;
  publication_status: PublicationStatus;
  visibility: "public" | "private" | "unlisted";
  condition_type: string | null;
  price_model: PriceModel;
  currency: string;
  base_price: number | null;
  location_mode: LocationMode;
  address_id: string | null;
  availability_mode: AvailabilityMode;
  inventory_mode: InventoryMode;
  primary_media_id: string | null;
  rating_snapshot: number | null;
  review_count: number;
}

export interface CanonicalListingDetail extends Timestamps {
  listing_detail_id: string;
  listing_id: string;
  specs_json: Record<string, unknown> | null;
  attributes_json: Record<string, unknown> | null;
  policies_json: Record<string, unknown> | null;
  faq_json: Array<{ question: string; answer: string }> | null;
  seo_json: Record<string, unknown> | null;
  extra_data_json: Record<string, unknown> | null;
}

export type AttributeType = "string" | "number" | "boolean" | "enum" | "range";

export interface CanonicalListingAttribute {
  attribute_id: string;
  listing_id: string;
  attribute_key: string;
  attribute_type: AttributeType;
  value_string: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
  value_enum: string | null;
  unit: string | null;
  is_filterable: boolean;
  is_public: boolean;
}

export type AvailabilityOwnerType = "listing" | "room" | "service_slot" | "unit";

export interface CanonicalAvailability extends Timestamps {
  availability_id: string;
  owner_type: AvailabilityOwnerType;
  owner_id: string;
  availability_mode: AvailabilityMode;
  start_at: string | null;
  end_at: string | null;
  quantity: number;
  status: AvailabilityStatus;
  reason_code: string | null;
}

export interface CanonicalSellerProfile extends Timestamps {
  seller_profile_id: string;
  user_id: string;
  org_id: string | null;
  seller_type: SellerType;
  display_name: string;
  bio: string | null;
  avatar_media_id: string | null;
  rating_snapshot: number | null;
  review_count: number;
  verified: boolean;
  active_listing_count: number;
  completed_transaction_count: number;
}

export interface CanonicalCart extends Timestamps {
  cart_id: string;
  buyer_id: string;
  status: "active" | "checked_out" | "abandoned" | "expired";
  currency: string;
  subtotal: number;
  fees_total: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
}

export interface CanonicalCartItem {
  cart_item_id: string;
  cart_id: string;
  listing_id: string;
  sku_id: string | null;
  quantity: number;
  unit_price: number;
  price_snapshot: number;
  seller_id: string;
  fulfillment_mode: "delivery" | "pickup" | "digital" | "service";
}

export type TransactionType = "order" | "booking" | "reservation" | "service_request";

export interface CanonicalTransaction extends Timestamps {
  transaction_id: string;
  transaction_type: TransactionType;
  buyer_id: string;
  seller_id: string;
  listing_id: string | null;
  org_id: string | null;
  status: TransactionStatus;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  currency: string;
  amount_total: number;
  commission_amount: number;
  commission_rate: number;
  started_at: string;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

export type PaymentMethod =
  | "wallet" | "card" | "apple_pay" | "google_pay"
  | "cash" | "bank_transfer" | "qr";

export interface CanonicalPayment extends Timestamps {
  payment_id: string;
  wallet_account_id: string | null;
  transaction_id: string;
  payment_method: PaymentMethod;
  payment_provider: string | null;
  provider_reference: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  failure_code: string | null;
  captured_at: string | null;
}

export interface DbWalletAccount extends Timestamps {
  id: string;
  wallet_account_id: string;
  owner_user_id: string;
  currency: string;
  available_balance: number;
  pending_balance: number;
  status: EntityStatus;
  pin_hash: string | null;
  daily_limit: number;
  monthly_limit: number;
}

export type LedgerEntryType =
  | "top_up" | "payment" | "transfer_in" | "transfer_out"
  | "commission" | "refund" | "payout" | "fee" | "adjustment";

export interface DbLedgerEntry extends Timestamps {
  ledger_entry_id: string;
  wallet_account_id: string;
  entry_type: LedgerEntryType;
  direction: LedgerDirection;
  amount: number;
  currency: string;
  reference_type: string;
  reference_id: string;
  balance_before: number;
  balance_after: number;
  description: string | null;
}

export interface CanonicalReceipt extends Timestamps {
  receipt_id: string;
  transaction_id: string;
  payment_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  currency: string;
  items_json: Array<{ label: string; quantity: number; unit_price: number; total: number }>;
  tax_breakdown_json: Record<string, number> | null;
  pdf_url: string | null;
  issued_at: string;
}

export interface CanonicalContact extends Timestamps {
  contact_id: string;
  owner_user_id: string;
  target_user_id: string;
  source: string;
  label: string | null;
  is_favorite: boolean;
  is_blocked: boolean;
  sync_status: "synced" | "pending" | "failed";
}

export type ConversationType = "direct" | "group" | "support" | "system" | "business";

export interface CanonicalConversation extends Timestamps {
  conversation_id: string;
  conversation_type: ConversationType;
  created_by: string;
  subject: string | null;
  status: ConversationStatus;
  last_message_at: string | null;
  metadata_json: Record<string, unknown> | null;
  context_type: string | null;
  context_id: string | null;
}

export type ParticipantRole = "owner" | "member" | "admin" | "observer";

export interface CanonicalParticipant {
  participant_id: string;
  conversation_id: string;
  user_id: string;
  role: ParticipantRole;
  joined_at: string;
  left_at: string | null;
  mute_status: boolean;
  archive_status: boolean;
}

export type MessageType =
  | "text" | "image" | "video" | "audio" | "file"
  | "location_static" | "location_live" | "system"
  | "payment_receipt" | "booking_card" | "contact_card";

export interface DbMessage extends Timestamps {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  message_type: MessageType;
  body: string | null;
  media_group_id: string | null;
  reply_to_message_id: string | null;
  status: MessageStatus;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  client_temp_id: string | null;
  metadata_json: Record<string, unknown> | null;
}

export type CallType = "audio" | "video";

export interface CanonicalCallSession extends Timestamps {
  call_id: string;
  conversation_id: string;
  call_type: CallType;
  initiator_id: string;
  status: CallStatus;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  provider_session_ref: string | null;
}

export interface DbPresence {
  user_id: string;
  online: boolean;
  last_seen_at: string;
  status_text: string | null;
  device_type: string | null;
}

export interface CanonicalMenu extends Timestamps {
  menu_id: string;
  listing_id: string;
  name: string;
  status: EntityStatus;
}

export interface CanonicalMenuSection extends Timestamps {
  section_id: string;
  menu_id: string;
  name: string;
  sort_order: number;
  status: EntityStatus;
}

export interface DbMenuItem extends Timestamps {
  item_id: string;
  section_id: string;
  menu_id: string;
  listing_id: string | null;
  name: string;
  description: string | null;
  base_price: number;
  currency: string;
  media_id: string | null;
  is_available: boolean;
  sort_order: number;
  dietary_tags: string[];
}

export interface CanonicalModifierGroup {
  group_id: string;
  item_id: string;
  name: string;
  min_select: number;
  max_select: number;
  sort_order: number;
}

export interface CanonicalModifierOption {
  option_id: string;
  group_id: string;
  name: string;
  price_adjustment: number;
  is_default: boolean;
  sort_order: number;
}

export interface CanonicalProperty extends Timestamps {
  property_id: string;
  listing_id: string | null;
  org_id: string | null;
  property_type: string;
  name: string;
  address_id: string;
  total_units: number;
  status: EntityStatus;
}

export interface DbRoomType extends Timestamps {
  room_type_id: string;
  property_id: string;
  name: string;
  max_occupancy: number;
  base_rate: number;
  currency: string;
  amenities: string[];
}

export interface CanonicalRatePlan extends Timestamps {
  rate_plan_id: string;
  room_type_id: string;
  name: string;
  rate: number;
  currency: string;
  conditions_json: Record<string, unknown> | null;
}

export interface CanonicalServiceProfile extends Timestamps {
  service_profile_id: string;
  user_id: string;
  org_id: string | null;
  vertical: string;
  specializations: string[];
  service_area_radius_km: number | null;
  address_id: string | null;
  rating_snapshot: number | null;
}

export interface DbServicePackage extends Timestamps {
  package_id: string;
  service_profile_id: string;
  listing_id: string | null;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  currency: string;
}

export interface CanonicalServiceSlot extends Timestamps {
  slot_id: string;
  service_profile_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_bookings: number;
  is_active: boolean;
}

export interface CanonicalPropertyAsset extends Timestamps {
  asset_id: string;
  property_id: string;
  org_id: string | null;
  asset_type: string;
  label: string;
  floor: string | null;
  area_sqm: number | null;
  status: EntityStatus;
}

export interface CanonicalUnit extends Timestamps {
  unit_id: string;
  property_id: string;
  label: string;
  floor: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqm: number | null;
  rent_amount: number | null;
  currency: string | null;
  status: EntityStatus;
}

export interface CanonicalLease extends Timestamps {
  lease_id: string;
  unit_id: string;
  tenant_user_id: string;
  landlord_user_id: string;
  start_date: string;
  end_date: string | null;
  rent_amount: number;
  currency: string;
  deposit_amount: number;
  status: EntityStatus;
}

export interface CanonicalMaintenanceTicket extends Timestamps {
  ticket_id: string;
  unit_id: string;
  reporter_user_id: string;
  category: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: SupportTicketStatus;
  assigned_to: string | null;
}

export type ItemCondition = "new" | "like_new" | "good" | "fair" | "for_parts";

export interface CanonicalPrivateListingExtension {
  extension_id: string;
  listing_id: string;
  item_condition: ItemCondition;
  delivery_option: "shipping" | "meetup" | "both";
  meetup_address_id: string | null;
  buyer_protection: boolean;
  negotiable: boolean;
}

export interface CanonicalProduct extends Timestamps {
  product_id: string;
  catalog_id: string;
  listing_id: string | null;
  name: string;
  sku: string;
  brand: string | null;
  status: EntityStatus;
}

export interface CanonicalProductVariant extends Timestamps {
  variant_id: string;
  product_id: string;
  sku: string;
  attributes_json: Record<string, string>;
  price: number;
  currency: string;
  stock_quantity: number;
  media_id: string | null;
}

export interface CanonicalActivity extends Timestamps {
  activity_id: string;
  listing_id: string | null;
  org_id: string | null;
  name: string;
  activity_type: string;
  venue_id: string | null;
  min_participants: number;
  max_participants: number;
  duration_minutes: number;
}

export interface CanonicalEventSchedule extends Timestamps {
  schedule_id: string;
  activity_id: string;
  start_at: string;
  end_at: string;
  recurrence_rule: string | null;
  capacity: number;
  booked_count: number;
}

export interface CanonicalTicketType extends Timestamps {
  ticket_type_id: string;
  activity_id: string;
  name: string;
  price: number;
  currency: string;
  quantity_available: number;
  sort_order: number;
}

export interface CanonicalVenue extends Timestamps {
  venue_id: string;
  name: string;
  address_id: string;
  capacity: number;
  amenities: string[];
}

export interface CanonicalPageConfig extends Timestamps {
  page_config_id: string;
  page_key: string;
  vertical: string | null;
  audience: string;
  layout_type: string;
  sections_json: Array<{ section_id: string; sort_order: number }>;
  status: EntityStatus;
  version: number;
}

export interface CanonicalSectionConfig extends Timestamps {
  section_id: string;
  page_config_id: string;
  section_type: string;
  source_type: string;
  source_ref: string | null;
  ranking_rule_id: string | null;
  display_rules_json: Record<string, unknown> | null;
  sort_order: number;
}

export interface CanonicalBanner extends Timestamps {
  banner_id: string;
  campaign_id: string | null;
  title: string;
  subtitle: string | null;
  media_id: string | null;
  cta_type: string;
  cta_target: string;
  placement: string;
  audience_rules_json: Record<string, unknown> | null;
  schedule_start: string | null;
  schedule_end: string | null;
  priority: number;
  status: EntityStatus;
}

export interface CanonicalCampaign extends Timestamps {
  campaign_id: string;
  name: string;
  type: string;
  start_date: string;
  end_date: string | null;
  budget: number | null;
  currency: string | null;
  status: EntityStatus;
}

export interface CanonicalRankingRule extends Timestamps {
  rule_id: string;
  domain: string;
  rule_type: string;
  inputs_json: Record<string, unknown>;
  weights_json: Record<string, number>;
  status: EntityStatus;
  version: number;
}

export interface CanonicalSearchDocument {
  document_id: string;
  source_type: string;
  source_id: string;
  title: string;
  description: string | null;
  taxonomy_path: string | null;
  location_json: { lat: number; lng: number } | null;
  price_snapshot: number | null;
  availability_snapshot: boolean | null;
  rating_snapshot: number | null;
  visibility: "public" | "private" | "unlisted";
  search_tokens: string[];
  updated_at: string;
}

export interface CanonicalFilterRegistry {
  filter_id: string;
  vertical: string;
  filter_key: string;
  filter_type: "enum" | "range" | "boolean" | "text" | "geo";
  source_field: string;
  allowed_values_json: string[] | null;
  display_label: string;
  sort_order: number;
}

export interface CanonicalOnboardingSession extends Timestamps {
  onboarding_id: string;
  actor_id: string;
  target_type: "shop" | "provider" | "particulier";
  status: OnboardingStatus;
  step_key: string;
  collected_data_json: Record<string, unknown>;
  validation_state_json: Record<string, unknown>;
}

export interface CanonicalImportJob extends Timestamps {
  import_job_id: string;
  source_type: string;
  source_ref: string;
  target_vertical: string;
  status: ImportStatus;
  started_at: string;
  finished_at: string | null;
  summary_json: Record<string, unknown> | null;
}

export interface CanonicalStagingEntity extends Timestamps {
  staging_id: string;
  import_job_id: string;
  raw_payload: Record<string, unknown>;
  normalized_payload: Record<string, unknown> | null;
  taxonomy_status: "pending" | "mapped" | "failed";
  media_status: "pending" | "validated" | "rejected";
  validation_status: "pending" | "passed" | "failed";
  publish_status: PublicationStatus;
}

export type NotificationChannel = "push" | "in_app" | "email" | "sms";

export interface DbNotification extends Timestamps {
  notification_id: string;
  recipient_id: string;
  channel: NotificationChannel;
  type: string;
  title: string;
  body: string;
  target_type: string | null;
  target_id: string | null;
  status: "pending" | "sent" | "read" | "dismissed";
  sent_at: string | null;
  read_at: string | null;
  route: string | null;
  severity: "info" | "success" | "warning" | "error";
}

export interface DbSupportTicket extends Timestamps {
  ticket_id: string;
  creator_id: string;
  domain: string;
  reference_type: string | null;
  reference_id: string | null;
  issue_type: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: SupportTicketStatus;
  assigned_to: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface CanonicalProofRecord extends Timestamps {
  proof_id: string;
  proof_type: string;
  domain: string;
  reference_type: string;
  reference_id: string;
  payload: Record<string, unknown>;
  trace_id: string;
}

export interface CanonicalPermission {
  permission_id: string;
  subject_type: "user" | "role" | "org";
  subject_id: string;
  resource_type: string;
  resource_id: string | null;
  action: string;
  effect: "allow" | "deny";
}

export interface CanonicalDeviceSession extends Timestamps {
  session_id: string;
  user_id: string;
  device_id: string;
  platform: "ios" | "android" | "web";
  last_seen_at: string;
  risk_level: "low" | "medium" | "high";
  status: EntityStatus;
}

export interface CanonicalConsent extends Timestamps {
  consent_id: string;
  user_id: string;
  permission_type: "camera" | "microphone" | "location" | "notifications" | "contacts" | "storage";
  status: ConsentStatus;
  granted_at: string | null;
  revoked_at: string | null;
}

export interface CanonicalEngineRegistry extends Timestamps {
  engine_id: string;
  engine_name: string;
  domain: string;
  version: string;
  status: EngineStatus;
  owner: string;
  priority: number;
  learning_eligibility: boolean;
  contract_json: Record<string, unknown> | null;
}

export interface CanonicalEngineRunLog {
  run_id: string;
  engine_id: string;
  status: "success" | "failure" | "timeout" | "skipped";
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  input_summary: string | null;
  output_summary: string | null;
  trace_id: string;
}

export interface CanonicalRepairRecord extends Timestamps {
  repair_id: string;
  source_engine_id: string;
  target_type: string;
  target_id: string;
  issue_type: string;
  before_state: Record<string, unknown>;
  after_state: Record<string, unknown>;
  status: "applied" | "rolled_back" | "failed";
  rollback_available: boolean;
  proof_id: string | null;
}

export interface CanonicalLearningMemory extends Timestamps {
  memory_id: string;
  engine_id: string;
  memory_type: "pattern" | "rule" | "preference" | "correction";
  canonical_fact: string;
  confidence_score: number;
  source_proof_id: string | null;
  status: EntityStatus;
}
