/**
 * Canonical orbit (communication) domain entry point (Phase 1).
 *
 * Single import surface for orbit messaging + realtime. Re-exports existing
 * canonical services, ports, and the realtime manager wrapper. No new logic.
 *
 * Rules (binding):
 *   - All new code touching orbit messages or channels MUST import from
 *     `@/domains/orbit`.
 *   - All realtime channel subscriptions MUST go through the realtime
 *     manager re-exported here (or a hook built on top of it). Direct calls
 *     to `supabase.channel(...)` from domain code are forbidden.
 *   - This file MUST NOT add new orbit logic. Only re-exports.
 */

// Canonical orbit types.
export type {
  CanonicalMessage,
  CanonicalOrbitProfile,
  MessageType,
} from "@/domains/shared/canonical-types";

// Domain ports (use-cases + repository contracts).
export type {
  Conversation,
  Message,
  OrbitProfile,
  CallSession,
  OrbitUseCases,
  SendMessageCommand,
  StartCallCommand,
  ConversationRepository,
  MessageRepository,
  CallRepository,
  OrbitProfileRepository,
  OrbitEventPort,
  EncryptionPort,
} from "./ports";

// Canonical orbit services (send, create conversation, status transitions).
export {
  sendTextMessage,
  createDirectConversation,
  markConversationRead,
  reconcileServerMessage,
  transitionMessageStatus,
} from "./services/orbit.services";

// Canonical realtime wrapper. All channel subscriptions in domain code go
// through this — never raw `supabase.channel(...)` calls.
export { realtimeManager } from "@/lib/realtime-manager";
export type { RealtimeSignal, RealtimeHealth } from "@/lib/realtime-manager";

// Orbit event channel (platform-bus topics).
export * from "./events";
