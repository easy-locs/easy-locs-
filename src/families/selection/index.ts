/**
 * FAMILY: SELECTION — Canonical message/entity selection mode.
 * Single source of truth for multi-select state and actions.
 */
export { useMessageSelection } from "@/components/communication-hub/chat/useMessageSelection";

// Selection family owns: selectedIds, toggle, clear, count,
// allowed actions, toolbar state
