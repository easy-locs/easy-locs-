/**
 * Orbit Composer — Canonical micro-component exports.
 * ComposerShell is the single entry point for all composer rendering.
 */
export { default as ComposerShell } from "./ComposerShell";
export type { ComposerShellProps } from "./ComposerShell";

// Micro-components (for testing/extension only — never use directly in pages)
export { default as ComposerContextBanner } from "./ComposerContextBanner";
export { default as ComposerTextInput } from "./ComposerTextInput";
export { default as ComposerSendButton } from "./ComposerSendButton";
export { default as ComposerVoiceRecording } from "./ComposerVoiceRecording";
export { default as ComposerVoicePreview } from "./ComposerVoicePreview";
export { default as ComposerAttachMenu } from "./ComposerAttachMenu";
