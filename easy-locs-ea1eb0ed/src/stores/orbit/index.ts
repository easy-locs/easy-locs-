/**
 * Orbit Decomposed Store — Re-exports for backward compatibility.
 * 
 * Consumers can import from here or from individual units.
 * 
 * Split structure:
 * - thread.store.ts       → conversation/thread state
 * - message.serializer.ts → pure message formatting
 * - event.adapter.ts      → typed event emission
 * - crypto.bridge.ts      → E2EE key management
 * - ui.state.ts           → ephemeral UI state
 */
export { useOrbitThreadStore } from "./thread.store";
export type { OrbitThreadState } from "./thread.store";

export { serializeMessage, buildMessagePreview, sortMessages } from "./message.serializer";

export {
  emitThreadCreated,
  emitMessageSent,
  emitCallStarted,
  emitCallEnded,
  emitProfileLoaded,
} from "./event.adapter";

export { conversationKeys, encryptMessageBody, decryptMessageBody, isE2EEActive, clearE2EESession, getE2EEStats } from "./crypto.bridge";
export type { RatchetMessage } from "./crypto.bridge";

export { useOrbitUIState } from "./ui.state";
export type { OrbitUIState } from "./ui.state";
