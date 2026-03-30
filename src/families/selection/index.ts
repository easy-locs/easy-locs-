/**
 * FAMILY: SELECTION — Canonical message/entity selection mode.
 * Single source of truth for multi-select state and actions.
 */

// Store
export { useOrbitSelectionStore } from "@/stores/orbit/selection.store";

// Hook — facade
export { useOrbitSelection } from "@/hooks/orbit/useOrbitSelection";

// Legacy re-export
export { useMessageSelection } from "@/components/communication-hub/chat/useMessageSelection";

// Components
export { default as OrbitSelectionToolbar } from "@/components/orbit/OrbitSelectionToolbar";

// Types
export type { SelectionMode, SelectionCapabilities } from "@/lib/orbit/selection-types";
