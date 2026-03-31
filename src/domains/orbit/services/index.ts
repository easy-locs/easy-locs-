/**
 * Orbit Services — INTERNAL write paths.
 * 
 * ⚠️ These functions are INTERNAL to the orbit-dispatch pipeline.
 * UI/hooks/components MUST NOT import from this module.
 * Use orbitDispatch({ type: '...' }) instead.
 * 
 * Only reconcileServerMessage and transitionMessageStatus are
 * re-exported for realtime/transport layers.
 */

// Internal functions — consumed only by orbit-dispatch executors
export {
  sendTextMessage as _sendTextMessage,
  sendMediaMessage as _sendMediaMessage,
  sendVoiceMessage as _sendVoiceMessage,
  createDirectConversation as _createDirectConversation,
  markConversationRead as _markConversationRead,
} from "./orbit.services";

// Public: realtime/transport reconciliation (not user-initiated)
export {
  reconcileServerMessage,
  transitionMessageStatus,
} from "./orbit.services";
