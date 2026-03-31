/**
 * Orbit ViewModels — Read-only projection layer.
 * UI consumes these instead of reading stores directly.
 * ViewModels NEVER own data, NEVER write, NEVER merge realtime.
 */
export { useInboxViewModel } from "./inbox.viewmodel";
export type { InboxItemViewModel } from "./inbox.viewmodel";

export { useConversationViewModel } from "./conversation.viewmodel";
export type { ConversationViewModel } from "./conversation.viewmodel";

export { useCallViewModel } from "./call.viewmodel";
export type { CallViewModel } from "./call.viewmodel";

export { useComposerViewModel } from "./composer.viewmodel";
export type { ComposerViewModel } from "./composer.viewmodel";
