/**
 * FAMILY: MESSAGES — Canonical message send/load/reconcile flow.
 * Single source of truth for all message operations.
 */
export { useMessageSender } from "@/hooks/useMessageSender";
export { useOrbitMessageActions } from "@/hooks/useOrbitMessageActions";
export { useMessageSelection } from "@/components/communication-hub/chat/useMessageSelection";

// Messages family owns: send, edit, delete, load, reconcile,
// message type taxonomy, reply payloads, status handling
