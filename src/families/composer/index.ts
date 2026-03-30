/**
 * FAMILY: COMPOSER — Canonical composer state and components.
 * One store, one hook, one composer used everywhere.
 */

// Store — single source of truth
export { useOrbitComposerStore } from "@/stores/orbit/composer.store";

// Hook — facade for store access
export { useOrbitComposer } from "@/hooks/orbit/useOrbitComposer";

// Legacy adapter (deprecated — migrate consumers to useOrbitComposer)
export { useOrbitComposerState } from "@/hooks/useOrbitComposerState";
export { useThreadComposerFamily } from "@/hooks/orbit/families/useThreadComposerFamily";

// Components
export { default as MessageComposer } from "@/components/orbit/MessageComposer";
export { default as OrbitReplyBanner } from "@/components/orbit/OrbitReplyBanner";
export { default as OrbitEditBanner } from "@/components/orbit/OrbitEditBanner";
export { default as OrbitAttachmentTray } from "@/components/orbit/OrbitAttachmentTray";
export { default as OrbitVoiceDraftPreview } from "@/components/orbit/OrbitVoiceDraftPreview";

// Types
export type { ReplyDraft, EditDraft, VoiceDraft, ComposerMode } from "@/lib/orbit/composer-types";
