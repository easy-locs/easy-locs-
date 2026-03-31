/**
 * FAMILY: MESSAGES — Canonical message send/load/reconcile/mode/capabilities/actions.
 * Single source of truth for all message operations.
 */

// ── Core hooks ──
// useMessageSender removed — dead export, orbitDispatch is the canonical entry
export { useOrbitMessageActions } from "@/hooks/useOrbitMessageActions";
export { useMessageSelection } from "@/components/communication-hub/chat/useMessageSelection";

// ── View Model ──
export { toMessageViewModel, toMessageViewModels } from "./message-view-model";
export type { MessageViewModel } from "./message-view-model";

// ── Message Mode ──
export { resolveMessageMode, getModeLabelFr } from "./message-mode";
export type { MessageMode } from "./message-mode";

// ── Message Capabilities ──
export { getMessageCapabilities, getAvailableActions } from "./message-capabilities";
export type { MessageCapabilities } from "./message-capabilities";

// ── Message Forward ──
export { MessageForward } from "./message-forward";
export type { ForwardPayload } from "./message-forward";

// ── Message Delete ──
export { MessageDelete } from "./message-delete";
export type { DeleteScope, DeleteResult } from "./message-delete";

// ── Bulk Actions ──
export { MessageBulkActions } from "./message-bulk-actions";
export type { BulkAction, BulkActionResult } from "./message-bulk-actions";

// Messages family owns: send, edit, delete, load, reconcile,
// message type taxonomy, mode resolution, capabilities matrix,
// reply payloads, forward, bulk actions, status handling.
