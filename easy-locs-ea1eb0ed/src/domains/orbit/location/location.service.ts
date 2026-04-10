/**
 * location.service — Single entry point for location message sends.
 *
 * Entry points:
 *   sendLocation(input)      — static location share
 *   sendLiveLocation(input)  — live location session start
 */
import { useOrbitMessagingStore } from "@/domains/orbit/stores/orbit.store";
import {
  validateLocationInput,
  buildLocationPayload,
  buildOptimisticLocationMessage,
  type SendLocationInput,
} from "@/domains/orbit/pipelines/message/send-location.pipeline";
import { acquireSubmitLock } from "@/domains/orbit/guards/send-guard";
import { logMessageSendStarted } from "@/lib/observability/orbit-observability";

export interface LocationSendResult {
  ok: boolean;
  tempId?: string;
  error?: string;
}

/**
 * sendLocation — Static or live location send.
 * validate → build payload → optimistic message → store merge
 */
export function sendLocation(input: SendLocationInput): LocationSendResult {
  if (!acquireSubmitLock(input.conversationId)) {
    return { ok: false, error: "submit_locked" };
  }

  const validationError = validateLocationInput(input);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const payload = buildLocationPayload(input);
  const optimistic = buildOptimisticLocationMessage(input, payload);

  useOrbitMessagingStore.getState().mergeMessage(optimistic);
  logMessageSendStarted(input.conversationId, optimistic.tempId ?? optimistic.id);

  return { ok: true, tempId: optimistic.tempId ?? optimistic.id };
}
