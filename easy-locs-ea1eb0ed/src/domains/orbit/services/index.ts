/**
 * Orbit Services — Dispatch-backed write paths.
 *
 * sendTextMessage now routes through orbitDispatch (canonical pipeline).
 * For media/voice, use orbitDispatch({ type: "send_media"|"send_voice", ... }) directly.
 * Use orbitDispatch({ type: '...' }) for all UI-initiated sends.
 *
 * Only reconcileServerMessage and transitionMessageStatus are
 * re-exported for realtime/transport layers.
 */

// Internal functions — available for orbit-dispatch pipeline and service layers
export {
  sendTextMessage as _sendTextMessage,
  createDirectConversation as _createDirectConversation,
  markConversationRead as _markConversationRead,
} from "./orbit.services";

// Public: realtime/transport reconciliation (not user-initiated)
export {
  reconcileServerMessage,
  transitionMessageStatus,
} from "./orbit.services";
