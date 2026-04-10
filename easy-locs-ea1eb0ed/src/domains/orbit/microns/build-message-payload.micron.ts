/**
 * MICRON: buildMessagePayload — Constructs the canonical message payload for persistence.
 */
import { createCorrelationId } from "@/domains/shared/atoms/create-correlation-id.atom";
import type { CommunicationContext } from "@/domains/shared/canonical-types";

export interface MessagePayload {
  conversationId: string;
  senderId: string;
  body: string;
  correlationId: string;
  context?: CommunicationContext;
  mediaUrl?: string;
}

export function buildMessagePayload(input: {
  conversationId: string;
  senderId: string;
  body: string;
  context?: CommunicationContext;
  mediaUrl?: string;
}): MessagePayload {
  return {
    ...input,
    body: input.body.trim(),
    correlationId: createCorrelationId(),
  };
}
