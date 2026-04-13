/**
 * db — Canonical, unified database access layer for the Easy-Locs super-app.
 *
 * This is the ONLY authorized file to import from @/integrations/supabase/client.
 * All other code must use `db`, `v2db`, or the domain-scoped clients exposed here.
 *
 * ─── Domain Schema Architecture (Task #56) ────────────────────────────────
 * Canonical tables have been physically moved to domain schemas via ALTER TABLE
 * … SET SCHEMA. Public compat views (SELECT * → domain.table, auto-updatable)
 * allow existing .from("table") calls to continue working during the transition.
 *
 * supabase/config.toml [api].schemas exposes all 11 domain schemas to PostgREST.
 *
 * domainDb.<schema>.from(table) documents domain ownership and validates that
 * the table belongs to the expected domain, then routes through the public
 * compat view for fully typed, fail-fast access.
 *
 * For new code, prefer domainDb to make ownership explicit:
 *   domainDb.identity.from("profiles")
 *   domainDb.orbit.from("chat_messages_v2")
 *   domainDb.commerce.from("bookings")
 *
 * Legacy tables that were dropped (public alias views provide backward compat):
 *   orbit_profiles_v2, orbit_identity_profiles → identity.profiles
 *   wallet_balances_v2 → wallet.wallet_accounts
 *   conversations → orbit.conversations_v2
 *   messages → orbit.chat_messages_v2
 *   marketplace_services → marketplace.listings
 *   storefront_pages → identity.organizations
 *   marketplace_bookings, booking_requests → commerce.bookings
 *   concierge_orders → commerce.transactions
 */
import { supabase } from "@/integrations/supabase/client";
import type { DomainSchema } from "@/lib/schema/domain-schemas";
import { DOMAIN_TABLE_MAP, LEGACY_TABLE_REDIRECTS } from "@/lib/schema/domain-schemas";

// ── Legacy table guard ──────────────────────────────────────────────────────

const DROPPED_LEGACY_TABLES = new Set<string>([
  "orbit_profiles_v2",
  "orbit_identity_profiles",
  "wallet_balances_v2",
  "conversations",
  "messages",
  "conversation_threads",
  "chat_threads",
  "marketplace_services",
  "storefront_pages",
  "marketplace_bookings",
  "concierge_orders",
  "booking_requests",
]);

function _killLegacyAccess(table: string): void {
  if (!DROPPED_LEGACY_TABLES.has(table)) return;
  const redirect = LEGACY_TABLE_REDIRECTS[table];
  const hint = redirect
    ? ` Canonical: ${redirect.schema}.${redirect.table}. ${redirect.note ?? ""}`
    : "";
  const mode = (import.meta.env.VITE_CORE_MODE as string | undefined) ?? "standard";
  if (mode === "V2_ONLY") {
    throw new Error(`[DB:KILL_SWITCH] Dropped legacy table: "${table}".${hint}`);
  } else {
    console.warn(`[DB:LEGACY] Table "${table}" is a dropped legacy table.${hint}`);
  }
}

// ── Domain ownership validator ──────────────────────────────────────────────

/**
 * Validates that the given table belongs to the expected domain schema.
 * Throws an Error if a table is accessed via the wrong domain accessor —
 * this catches ownership boundary violations at call time.
 */
function _assertTableInDomain(table: string, schema: DomainSchema): void {
  const tables = DOMAIN_TABLE_MAP[schema] as readonly string[];
  if (!tables.includes(table)) {
    throw new Error(
      `[DB:DOMAIN_VIOLATION] Table "${table}" is not in domain "${schema}". ` +
      `Owned tables: ${tables.join(", ")}`
    );
  }
}

// ── Core db object ──────────────────────────────────────────────────────────

type DbFn = {
  (table: string): ReturnType<typeof supabase.from>;
  from: (table: string) => ReturnType<typeof supabase.from>;
  rpc: typeof supabase.rpc;
  storage: typeof supabase.storage;
  functions: typeof supabase.functions;
  auth: typeof supabase.auth;
  channel: typeof supabase.channel;
  removeChannel: typeof supabase.removeChannel;
  getChannels: typeof supabase.getChannels;
  removeAllChannels: typeof supabase.removeAllChannels;
};

const _from = (table: string) =>
  (supabase as unknown as { from: (t: string) => ReturnType<typeof supabase.from> }).from(table);

export const db: DbFn = Object.assign(_from, {
  from: _from,
  rpc: (supabase as unknown as { rpc: typeof supabase.rpc }).rpc.bind(supabase),
  storage: supabase.storage,
  functions: supabase.functions,
  auth: supabase.auth,
  channel: supabase.channel.bind(supabase),
  removeChannel: supabase.removeChannel.bind(supabase),
  getChannels: supabase.getChannels.bind(supabase),
  removeAllChannels: supabase.removeAllChannels.bind(supabase),
});

// ── v2db — legacy-guarded accessor ─────────────────────────────────────────

export function v2db(table: string): ReturnType<typeof supabase.from> {
  _killLegacyAccess(table);
  return _from(table);
}

// ── domainDb — schema-ownership-enforced accessors ────────────────────────
//
// Each accessor validates at call time that the requested table is owned by
// the declared domain schema (throws on ownership violation — fail fast).
// Routes through the public compat view, which PostgreSQL resolves to the
// canonical domain table. Auto-updatable views pass DML through transparently.
//
// supabase/config.toml exposes all domain schemas to PostgREST so that
// direct schema access (e.g. supabase.schema("orbit").from("chat_messages_v2"))
// is also available when callers need to bypass the compat layer.
//
// Realtime subscriptions must target the domain schema:
//   .on("postgres_changes", { schema: "orbit", table: "chat_messages_v2" })

type SchemaScopedDb = {
  /** The owning PostgreSQL domain schema name. */
  readonly schema: DomainSchema;
  /**
   * Access a canonical table owned by this domain.
   * Validates table ownership (throws on violation), then routes through the
   * public compat view which resolves to the domain-schema canonical table.
   */
  from(table: string): ReturnType<typeof supabase.from>;
};

function makeDomainAccessor(schema: DomainSchema): SchemaScopedDb {
  return {
    schema,
    from(table: string) {
      _assertTableInDomain(table, schema);
      return _from(table);
    },
  };
}

/**
 * Domain-scoped DB accessors. Make schema ownership explicit and validated.
 * domainDb.identity.from("wallet_accounts") throws — fail fast on violations.
 */
export const domainDb = {
  /** identity: profiles, organizations, organization_members */
  identity:     makeDomainAccessor("identity"),
  /** wallet: wallet_accounts, wallet_transactions, wallet_ledger_entries */
  wallet:       makeDomainAccessor("wallet"),
  /** orbit: conversations_v2, chat_messages_v2, conversation_participants_v2, orbit_contacts_v2, ghost_call_sessions, call_logs */
  orbit:        makeDomainAccessor("orbit"),
  /** marketplace: listings, listing_details, listing_attributes, categories, verticals, reviews, favorites */
  marketplace:  makeDomainAccessor("marketplace"),
  /** commerce: bookings, transactions, carts, receipts, payout_requests */
  commerce:     makeDomainAccessor("commerce"),
  /** property: properties, units, leases */
  property:     makeDomainAccessor("property"),
  /** onboarding: onboarding_sessions, import_jobs, staging_entities */
  onboarding:   makeDomainAccessor("onboarding"),
  /** support: support_tickets */
  support:      makeDomainAccessor("support"),
  /** notification: app_notifications, user_notification_preferences, user_push_tokens */
  notification: makeDomainAccessor("notification"),
  /** system: engine_supervisor, engine_run_logs, worker_health_snapshots */
  system:       makeDomainAccessor("system"),
  /** analytics: user_radar_events, user_radar_profiles */
  analytics:    makeDomainAccessor("analytics"),
} as const;
