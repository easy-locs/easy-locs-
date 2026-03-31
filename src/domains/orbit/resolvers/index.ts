/**
 * Orbit Resolvers — Canonical resolution layer.
 */
export {
  resolveCanonicalUserId,
  resolveCanonicalConversationId,
  resolveCanonicalMessageId,
  resolveCanonicalParticipantId,
  resolveCanonicalAttachmentId,
  isValidOrbitUUID,
  buildOrbitAlias,
} from "./id-resolver";

export {
  normalizeTextInput,
  normalizeSearchableText,
  validateTextInput,
} from "./text.resolver";

export {
  resolveDisplayName,
  resolveAvatar,
} from "./identity.resolver";
export type { IdentitySource } from "./identity.resolver";

export {
  isOutgoingMessage,
  isSystemMessage,
  resolveSenderDisplay,
  getPeerUserId,
  isConsecutiveMessage,
} from "./message-identity.resolver";
export type { SenderDisplayInfo } from "./message-identity.resolver";

export {
  buildMessagePreview,
} from "./preview.resolver";
export type { PreviewableMessage } from "./preview.resolver";

export {
  resolveMediaRenderableSource,
  resolveMediaViewerSource,
  buildMediaSourceInput,
} from "./media-source.resolver";
export type { MediaSourceInput } from "./media-source.resolver";
