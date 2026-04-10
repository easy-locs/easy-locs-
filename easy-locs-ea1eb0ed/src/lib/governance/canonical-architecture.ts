/**
 * CANONICAL ARCHITECTURE — Zero-Conflict Governance
 * 
 * This document defines the single source of truth for all architectural decisions.
 * Violations are enforced by CI audits (audit-inline-supabase, v2-only, lint-no-inline).
 * 
 * @see docs/ZERO-CONFLICT-AUDIT.md for the full audit report
 */

// ═══════════════════════════════════════════════════════════════
// 1. TAXONOMY — Top-level domains (closed set, no additions without review)
// ═══════════════════════════════════════════════════════════════

export const CANONICAL_DOMAINS = [
  "auth",          // Authentication, session, device
  "orbit",         // Messaging, threads, composer, media send
  "calls",         // Audio/video calls, signaling, call media
  "wallet",        // Payments, transactions, escrow
  "notifications", // Push, in-app, badges
  "media",         // Upload, storage, processing
  "contacts",      // Directory, presence, blocking
  "settings",      // User preferences, privacy, security
  "marketplace",   // Listings, bookings, orders, delivery
  "radar",         // Map, geo, nearby, location
  "dashboard",     // Analytics, metrics, engine
  "admin",         // Admin operations, moderation
] as const;

export type CanonicalDomain = (typeof CANONICAL_DOMAINS)[number];

// ═══════════════════════════════════════════════════════════════
// 2. NAMING RULES — Single name per concept (no aliases)
// ═══════════════════════════════════════════════════════════════

/**
 * CANONICAL NAMING MAP
 * Left = canonical name (MUST use)
 * Right = deprecated aliases (NEVER use in new code)
 */
export const NAMING_RULES = {
  // Identity
  conversationId: ["threadId", "v2ConversationId", "chatRoomId", "dialogId"],
  entityId: ["contextId (when referring to business entity)"],
  entityType: ["contextType (when referring to business entity)"],
  senderUserId: ["sender_id", "userId (ambiguous)"],
  senderOrbitId: ["orbit_id (bare)", "caller_id"],
  
  // Message
  message: ["msg", "chatItem", "note"],
  conversation: ["thread", "chatRoom", "dialog", "inboxItem"],
  
  // Events
  "orbit:message_sent": ["message.created", "chat:sent"],
  "orbit:thread_created": ["conversation.created", "chat:new"],
} as const;

// ═══════════════════════════════════════════════════════════════
// 3. ID POLICY — One canonical ID per entity
// ═══════════════════════════════════════════════════════════════

export const ID_POLICY = {
  user: { canonical: "auth.uid()", prefix: null, source: "auth.users" },
  orbitProfile: { canonical: "orbit_id", prefix: "orbit_", source: "orbit_profiles_v2" },
  conversation: { canonical: "id", prefix: null, source: "conversations_v2" },
  message: { canonical: "id", prefix: null, source: "chat_messages_v2" },
  callSession: { canonical: "id", prefix: null, source: "call_logs" },
  attachment: { canonical: "id", prefix: null, source: "message_attachments" },
  notification: { canonical: "id", prefix: null, source: "app_notifications" },
  walletAccount: { canonical: "id", prefix: null, source: "wallet_accounts" },
  walletTransaction: { canonical: "id", prefix: null, source: "wallet_transactions" },
} as const;

// ═══════════════════════════════════════════════════════════════
// 4. STATE OWNERSHIP — One store per domain
// ═══════════════════════════════════════════════════════════════

export const STATE_OWNERSHIP = {
  auth: "v2AuthStore",
  orbitProfile: "orbitStore",
  threads: "orbit/thread.store",
  calls: "orbit/call.store",
  composer: "orbit/composer.store",
  audio: "orbit/audio.store",
  selection: "orbit/selection.store",
  engineMetrics: "orbit-engine",
  wallet: "walletStore",
  notifications: "notificationV2Store",
  location: "locationStore",
  map: "mapStore",
  radar: "radarStore",
  ui: "orbit/ui.state",
} as const;

// ═══════════════════════════════════════════════════════════════
// 5. WRITE PATH POLICY — One canonical function per write
// ═══════════════════════════════════════════════════════════════

export const WRITE_PATHS = {
  sendMessage: "communication.repository.insertMessage",
  createConversation: "communication.repository.createConversation",
  startCall: "families/calls/call-start",
  acceptCall: "families/orbit-dispatch/pipeline/executeAcceptCall",
  declineCall: "families/orbit-dispatch/pipeline/executeDeclineCall",
  uploadMedia: "families/media/media-upload",
  upsertPreference: "communication.repository.upsertConversationPreference",
} as const;

// ═══════════════════════════════════════════════════════════════
// 6. EVENT NAMING — Strict format: domain:action_verb
// ═══════════════════════════════════════════════════════════════

export const EVENT_FORMAT = "domain:action_past_tense" as const;
// Examples: orbit:message_sent, wallet:balance_updated, call:ended

// ═══════════════════════════════════════════════════════════════
// 7. SYNC POLICY
// ═══════════════════════════════════════════════════════════════

export const SYNC_POLICY = {
  realtimeFactory: "createRealtimeChannel (src/lib/realtime.ts)",
  eventBus: "platformBus → eventBus (2-tier)",
  refreshOrchestrator: "global-refresh-orchestrator.ts",
  propagationLaw: "One truth, one event, one path",
} as const;

// ═══════════════════════════════════════════════════════════════
// 8. HARD RULES (non-negotiable)
// ═══════════════════════════════════════════════════════════════

export const HARD_RULES = [
  "1 entity = 1 model",
  "1 flow = 1 write path",
  "1 domain = 1 store owner",
  "1 source = 1 realtime listener",
  "1 object = 1 canonical ID",
  "1 datum = 1 source of truth",
  "No inline supabase in UI (enforced by CI)",
  "No business logic in components",
  "All writes through repository layer",
  "All events through platformBus",
] as const;
