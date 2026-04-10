/**
 * FAMILY: COMPOSER — Canonical composer state and components.
 * One store, one hook, one composer used everywhere.
 */

// Store — single source of truth
export { useOrbitComposerStore } from "@/stores/orbit/composer.store";

// Hook — facade for store access
export { useOrbitComposer } from "@/hooks/orbit/useOrbitComposer";

// Legacy adapter — useOrbitComposerState is DEPRECATED (uses local useState).
// All consumers MUST use composerStore directly.
// export { useOrbitComposerState } from "@/hooks/useOrbitComposerState"; // REMOVED
export { useThreadComposerFamily } from "@/hooks/orbit/families/useThreadComposerFamily";

// Components — Canonical ComposerShell (micro-decomposed)
export { ComposerShell } from "@/components/orbit/composer";
export type { ComposerShellProps } from "@/components/orbit/composer";

// Legacy monolithic composer — DEPRECATED, use ComposerShell instead
export { default as MessageComposer } from "@/components/orbit/MessageComposer";

// Standalone store-connected banners (subsumed by ComposerContextBanner inside ComposerShell)
export { default as OrbitReplyBanner } from "@/components/orbit/OrbitReplyBanner";
export { default as OrbitEditBanner } from "@/components/orbit/OrbitEditBanner";
export { default as OrbitAttachmentTray } from "@/components/orbit/OrbitAttachmentTray";
export { default as OrbitVoiceDraftPreview } from "@/components/orbit/OrbitVoiceDraftPreview";

// Types
export type { ReplyDraft, EditDraft, VoiceDraft, ComposerMode } from "@/lib/orbit/composer-types";
