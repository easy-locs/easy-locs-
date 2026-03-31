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
  buildMessagePreview,
} from "./preview.resolver";
export type { PreviewableMessage } from "./preview.resolver";
