/**
 * Orbit Read Models — CQRS read side.
 * Pure projections from stores. No writes. No side effects.
 *
 * RULE: Components consume read models, never stores directly.
 */

export { selectMessageBubbleModel, type MessageBubbleReadModel } from "./message-bubble.read-model";
export { selectAttachmentRenderModel, type AttachmentRenderReadModel } from "./attachment-render.read-model";
export { selectMediaViewerModel, type MediaViewerReadModel } from "./media-viewer.read-model";
export { useBubbleReadModel } from "./useBubbleReadModel";
