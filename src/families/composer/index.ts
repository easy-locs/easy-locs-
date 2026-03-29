/**
 * FAMILY: COMPOSER — Canonical composer state and component.
 * One MessageComposer used everywhere.
 */
export { useOrbitComposerState } from "@/hooks/useOrbitComposerState";
export { useThreadComposerFamily } from "@/hooks/orbit/families/useThreadComposerFamily";
export { default as MessageComposer } from "@/components/orbit/MessageComposer";

// Composer family owns: text input state, send, mic/send switching,
// reply banner, attachment entry, emoji insertion, typing state
