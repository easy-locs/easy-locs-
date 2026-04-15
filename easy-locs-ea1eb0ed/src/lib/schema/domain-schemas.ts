/**
 * domain-schemas.ts
 *
 * Defines the 11 canonical PostgreSQL domain schemas for the Easy-Locs platform.
 * Implements the "1 data = 1 owner" boundary rule (Grab/WeChat model).
 *
 * Database Architecture (Task #56):
 * ──────────────────────────────────
 * 38 canonical tables are PHYSICALLY MOVED to 11 domain schemas via
 * ALTER TABLE … SET SCHEMA, preserving RLS policies, indexes, FK constraints,
 * sequences, and triggers.
 *
 * Public compat views (SELECT * → domain.table) maintain zero-downtime
 * backward compatibility for all existing .from("table") callsites:
 *   public.profiles        → SELECT * FROM identity.profiles
 *   public.wallet_accounts → SELECT * FROM wallet.wallet_accounts
 *   etc.
 *
 * These compat views are auto-updatable (INSERT/UPDATE/DELETE passes through).
 * SECURITY INVOKER is applied to all compat views (PostgreSQL 15+) so that
 * RLS policies on the canonical domain tables are always enforced.
 *
 * Realtime subscriptions on moved tables must specify the domain schema:
 *   .on("postgres_changes", { schema: "orbit", table: "chat_messages_v2" })
 *
 * Legacy tables that were dropped (orbit_profiles_v2, etc.)
 * have public alias views redirecting to the canonical table for zero-downtime
 * backward compatibility during transition. DML through column-projection alias
 * views is not supported — callers must migrate to canonical table names.
 */

// ─── Schema name constants ────────────────────────────────────────────────────

export const DOMAIN_SCHEMAS = {
  IDENTITY:     "identity",
  WALLET:       "wallet",
  ORBIT:        "orbit",
  MARKETPLACE:  "marketplace",
  COMMERCE:     "commerce",
  PROPERTY:     "property",
  ONBOARDING:   "onboarding",
  SUPPORT:      "support",
  NOTIFICATION: "notification",
  SYSTEM:       "system",
  ANALYTICS:    "analytics",
} as const;

export type DomainSchema = (typeof DOMAIN_SCHEMAS)[keyof typeof DOMAIN_SCHEMAS];

// ─── Domain → canonical tables mapping ──────────────────────────────────────
// Each domain owns these tables. Tables are physically in their domain schema
// (e.g. identity.profiles). Public compat views provide backward compatibility.

export const DOMAIN_TABLE_MAP: Record<DomainSchema, readonly string[]> = {
  identity: [
    "profiles",
    "organizations",
    "organization_members",
  ],
  wallet: [
    "wallet_accounts",
    "wallet_transactions",
    "wallet_ledger_entries",
  ],
  orbit: [
    "conversations_v2",
    "chat_messages_v2",
    "conversation_participants_v2",
    "orbit_contacts_v2",
    "ghost_call_sessions",
    "call_logs",
  ],
  marketplace: [
    "listings",
    "listing_details",
    "listing_attributes",
    "categories",
    "verticals",
    "reviews",
    "favorites",
  ],
  commerce: [
    "bookings",
    "transactions",
    "carts",
    "receipts",
    "payout_requests",
  ],
  property: [
    "properties",
    "units",
    "leases",
  ],
  onboarding: [
    "onboarding_sessions",
    "import_jobs",
    "staging_entities",
  ],
  support: [
    "support_tickets",
  ],
  notification: [
    "app_notifications",
    "user_notification_preferences",
    "user_push_tokens",
  ],
  system: [
    "engine_supervisor",
    "engine_run_logs",
    "worker_health_snapshots",
  ],
  analytics: [
    "user_radar_events",
    "user_radar_profiles",
  ],
};

// ─── Legacy → canonical redirect map ─────────────────────────────────────────
// Tables that have been dropped and replaced by public alias views.
// Existing code using these table names continues to work via the alias view.
// Code should be progressively updated to use the canonical table name.

export const LEGACY_TABLE_REDIRECTS: Record<string, { schema: DomainSchema; table: string; note?: string }> = {
  orbit_profiles_v2:       { schema: "identity",   table: "profiles",        note: "Use profiles directly" },
  orbit_identity_profiles: { schema: "identity",   table: "profiles",        note: "Use profiles directly" },
  conversations:           { schema: "orbit",      table: "conversations_v2",  note: "Use conversations_v2" },
  messages:                { schema: "orbit",      table: "chat_messages_v2",  note: "Use chat_messages_v2" },
  marketplace_services:    { schema: "marketplace",table: "listings",        note: "Filter by listing_type='service'" },
  storefront_pages:        { schema: "identity",   table: "organizations",   note: "Use organizations directly" },
  marketplace_bookings:    { schema: "commerce",   table: "bookings",        note: "Filter by booking_type='marketplace'" },
  concierge_orders:        { schema: "commerce",   table: "transactions",    note: "Filter by transaction_type='service_request'" },
  booking_requests:        { schema: "commerce",   table: "bookings",        note: "Filter by status in pending/requested" },
};

// ─── Reverse lookup: table → owning schema ────────────────────────────────────

const _reverseMap = new Map<string, DomainSchema>();
for (const [schema, tables] of Object.entries(DOMAIN_TABLE_MAP)) {
  for (const table of tables) {
    _reverseMap.set(table, schema as DomainSchema);
  }
}

/**
 * Returns the domain schema that owns a given canonical table name.
 * Returns `null` for tables that are not yet assigned to a domain.
 */
export function getOwningSchema(tableName: string): DomainSchema | null {
  return _reverseMap.get(tableName) ?? null;
}

/**
 * Returns the fully-qualified domain view reference.
 * e.g. qualifiedTable("identity", "profiles") → "identity"."profiles"
 * (This references the domain view, not the underlying public table.)
 */
export function qualifiedTable(schema: DomainSchema, table: string): string {
  return `"${schema}"."${table}"`;
}

/**
 * Returns the canonical public table name (actual physical table).
 * Use this for Supabase .from() calls and postgres_changes subscriptions.
 */
export function publicTable(table: string): string {
  return `public.${table}`;
}

/**
 * Returns the canonical redirect for a legacy table name.
 * Returns null if the table is not a known legacy redirect.
 */
export function getLegacyRedirect(legacyTable: string): { schema: DomainSchema; table: string; note?: string } | null {
  return LEGACY_TABLE_REDIRECTS[legacyTable] ?? null;
}

// ─── Cross-schema FK root ─────────────────────────────────────────────────────
// All domains reference identity.profiles as the authoritative user identity.

export const PLATFORM_FK_ROOT = {
  schema:     "identity" as const,
  table:      "profiles",
  public_ref: "public.profiles",
  pk:         "id",
} satisfies { schema: DomainSchema; table: string; public_ref: string; pk: string };
