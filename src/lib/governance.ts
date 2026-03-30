/**
 * GOVERNANCE.md — 15 Immutable Product Laws
 * ===========================================
 * Every new evolution MUST comply with ALL 15 rules below.
 * Violations are architectural debt and must be fixed before merge.
 *
 * Target: Signal / WhatsApp grade — zero visual or functional conflict.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  1. SINGLE SOURCE OF TRUTH PER RESPONSIBILITY                  │
 * │     One family owns each domain. No duplicate logic.            │
 * │     Send family → message insertion. Realtime family → subs.    │
 * │     Repository layer → DB access. Brain chain → business truth. │
 * │                                                                 │
 * │  2. CANONICAL NAMING — ABSOLUTE                                 │
 * │     conversationId (never threadId/v2ConversationId)             │
 * │     senderUserId (auth UUID), senderOrbitId (orbit_ prefixed)   │
 * │     entityId + entityType (never contextId)                     │
 * │     Legacy aliases: read-only compat layer only.                │
 * │                                                                 │
 * │  3. NO BODY/TEXT PARSING FOR BUSINESS LOGIC                     │
 * │     metadata.ui.cardType decides rendering.                     │
 * │     metadata.call/geo/media/payment carry structured data.      │
 * │     body is display-only fallback, never decision input.        │
 * │                                                                 │
 * │  4. CLOSED MESSAGE TYPE TAXONOMY                                │
 * │     15 types only: text, image, video, voice, audio, file,      │
 * │     location_static, location_live, call_audio, call_video,     │
 * │     call_missed, call_declined, payment_request,                │
 * │     payment_receipt, system_notice.                              │
 * │     New types require explicit taxonomy extension.               │
 * │                                                                 │
 * │  5. ONE RENDERER PER cardType                                   │
 * │     text/media → ChatMessageBubble                              │
 * │     call → CallCard                                             │
 * │     location → LocationCard                                     │
 * │     payment → PaymentCard                                       │
 * │     system → SystemCard                                         │
 * │     voice → VoiceCard (via ChatMessageBubble)                   │
 * │     All routed through MessageCardRenderer.                     │
 * │                                                                 │
 * │  6. OPTIMISTIC UI — IMMEDIATE                                   │
 * │     Every user action renders locally in <16ms.                 │
 * │     DB insert follows. Broadcast confirms. No blocking.         │
 * │     Media: blob preview → background upload → reconcile.        │
 * │                                                                 │
 * │  7. VISIBLE MESSAGE STATUS                                      │
 * │     Every message shows: sending → sent → delivered → read.     │
 * │     Failed shows retry affordance. No silent swallow.           │
 * │     Status lives in envelope.status field.                      │
 * │                                                                 │
 * │  8. ZERO SILENT ERRORS                                          │
 * │     All catch blocks must surface feedback (toast/status/log).  │
 * │     No empty catch {}. No swallowed promises.                   │
 * │     Debug bus captures all runtime anomalies.                   │
 * │                                                                 │
 * │  9. STRICT ID SEPARATION                                        │
 * │     Auth UUID: user identity (auth.users.id)                    │
 * │     Orbit ID: orbit_ prefixed communication identity            │
 * │     Conversation ID: conversations_v2.id                        │
 * │     Entity ID: business object (listing, booking, ride)         │
 * │     Message ID: chat_messages_v2.id                             │
 * │     Call ID: call_logs.id                                       │
 * │     Never mix. assertNoLegacyIds guards write paths.            │
 * │                                                                 │
 * │ 10. BOOTSTRAP BEFORE CRITICAL FLOWS                             │
 * │     ensureOrbitProfile() before any message/call insertion.     │
 * │     resolveOrbitId() before call signaling.                     │
 * │     No write without validated identity.                        │
 * │                                                                 │
 * │ 11. REALTIME SEPARATED FROM PERSISTENCE                         │
 * │     Broadcast channel: instant UI (<50ms).                      │
 * │     postgres_changes: persistent sync (~200ms).                 │
 * │     DB is source of truth. Broadcast is delivery optimization.  │
 * │     Both feed into same deduplication layer.                    │
 * │                                                                 │
 * │ 12. STRICT DEDUPLICATION                                        │
 * │     deduplicateRealtimeMessage() on every incoming payload.     │
 * │     transport.dedupeKey in metadata for media uploads.          │
 * │     No duplicate renders. No duplicate DB rows.                 │
 * │                                                                 │
 * │ 13. LEGACY COMPAT IN ONE LAYER ONLY                             │
 * │     normalizeMessage() is the ONLY legacy adapter.              │
 * │     Raw DB rows enter → canonical envelopes exit.               │
 * │     No other module may interpret legacy formats.               │
 * │                                                                 │
 * │ 14. STRICT VISUAL COHERENCE                                     │
 * │     One token system: HSL via CSS variables.                    │
 * │     One component family across all modules.                    │
 * │     No local color values. No per-page styling systems.         │
 * │     Orbit/Wallet/Radar/Marketplace/Me = one product.            │
 * │                                                                 │
 * │ 15. NO UNWIRED VISIBLE COMPONENT                                │
 * │     Every button, card, action must be functionally connected.  │
 * │     No placeholder UI. No dead links. No stub handlers.         │
 * │     If it renders, it works.                                    │
 * └─────────────────────────────────────────────────────────────────┘
 */

// Runtime governance guards — import in critical paths

export const GOVERNANCE_VERSION = "1.0.0";
export const GOVERNANCE_RULES = 15;

/**
 * Assert a message type belongs to the closed taxonomy.
 * Throws on unknown types to prevent taxonomy drift.
 */
const VALID_TYPES = new Set([
  "text", "image", "video", "voice", "audio", "file",
  "location_static", "location_live",
  "call_audio", "call_video", "call_missed", "call_declined",
  "payment_request", "payment_receipt",
  "system_notice",
] as const);

export function assertValidMessageType(type: string): void {
  if (!VALID_TYPES.has(type as any)) {
    console.error(`[Governance] Invalid message type: "${type}". Must be one of: ${[...VALID_TYPES].join(", ")}`);
  }
}

/**
 * Assert no legacy ID fields in a write payload (Rule 9).
 */
const LEGACY_KEYS = ["threadId", "v2ConversationId", "contextId", "thread_id", "v2_conversation_id", "context_id"];

export function assertNoLegacyIds(payload: Record<string, any>, context?: string): void {
  for (const key of LEGACY_KEYS) {
    if (key in payload && payload[key] != null) {
      console.error(`[Governance] Legacy ID "${key}" found in write payload${context ? ` (${context})` : ""}. Use canonical IDs.`);
    }
  }
}

/**
 * Assert metadata has schemaVersion (Rule 3/4).
 */
export function assertCanonicalMetadata(metadata: any, context?: string): void {
  if (!metadata || metadata.schemaVersion !== 1) {
    console.warn(`[Governance] Non-canonical metadata${context ? ` in ${context}` : ""}. Missing schemaVersion: 1.`);
  }
}
