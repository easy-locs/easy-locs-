/**
 * MOLECULE: createMessageDraft — Validates body, builds payload, assigns correlation.
 */
import { validateMessageBody } from "../microns/validate-message-body.micron";
import { buildMessagePayload, type MessagePayload } from "../microns/build-message-payload.micron";
import type { CommunicationContext } from "@/domains/shared/canonical-types";

export function createMessageDraft(input: {
  conversationId: string;
  senderId: string;
  body: string;
  context?: CommunicationContext;
  mediaUrl?: string;
}): MessagePayload {
  const validation = validateMessageBody(input.body);
  if (!validation.ok) throw new Error(validation.reason);

  return buildMessagePayload({
    ...input,
    body: validation.sanitized,
  });
}
