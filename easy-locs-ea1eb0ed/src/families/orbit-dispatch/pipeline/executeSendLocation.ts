/**
 * executeSendLocation — Strict pipeline: store-first instant insert, then DB background.
 *
 * FLOW: intent → validate → build payload → build optimistic → store insert (INSTANT) → DB persist → reconcile
 * The location bubble appears at T0+0ms. Network happens after.
 */
import type { SendLocationCommand } from "../orbit-commands";
import type { ResolvedContext, ExecutorResult } from "./pipeline-types";
import { createTrace, enterPhase, exitPhase, completeExecutorTrace, failExecutorTrace } from "./pipeline-types";
import { useOrbitMessagingStore } from "@/domains/orbit/stores/orbit.store";
import {
  validateLocationInput,
  buildLocationPayload,
  buildOptimisticLocationMessage,
  type SendLocationInput,
} from "@/domains/orbit/pipelines/message/send-location.pipeline";

export async function executeSendLocation(
  ctx: ResolvedContext,
  cmd: SendLocationCommand,
): Promise<ExecutorResult> {
  const trace = createTrace("sendLocation");

  try {
    // ── Phase 1: Intent validation ──
    enterPhase(trace, "intent");
    if (cmd.lat == null || cmd.lng == null) return { ok: false, error: "no_coordinates", phase: "intent" };
    if (!ctx.conversationId) return { ok: false, error: "no_conversation", phase: "intent" };
    exitPhase(trace);

    // ── Phase 2: Build location payload + optimistic message ──
    enterPhase(trace, "preview");
    const input: SendLocationInput = {
      conversationId: ctx.conversationId,
      senderId: ctx.senderUserId,
      senderOrbitId: ctx.senderOrbitId,
      lat: cmd.lat,
      lng: cmd.lng,
      label: cmd.label ?? null,
      address: cmd.address ?? null,
      mode: cmd.mode,
      liveDurationMinutes: cmd.liveDurationMinutes ?? null,
    };

    const validationError = validateLocationInput(input);
    if (validationError) return { ok: false, error: validationError, phase: "preview" };

    const payload = buildLocationPayload(input);
    const optimistic = buildOptimisticLocationMessage(input, payload);
    exitPhase(trace);

    // ── Phase 3: INSTANT STORE INSERT — location bubble visible NOW ──
    enterPhase(trace, "instant_insert");
    const store = useOrbitMessagingStore.getState();
    store.mergeMessage(optimistic);
    const tempId = optimistic.tempId ?? optimistic.id;

    if (import.meta.env.DEV) {
      console.debug("[executeSendLocation] Optimistic location merged", {
        tempId,
        conversationId: ctx.conversationId,
        type: optimistic.type,
        lat: cmd.lat,
        lng: cmd.lng,
      });
    }
    exitPhase(trace);

    // ── Phase 4: Background DB persist (non-blocking) ──
    enterPhase(trace, "background_transport");
    void (async () => {
      try {
        const { sendLocationOptimistic } = await import("@/families/send/send-location-optimistic");
        await sendLocationOptimistic(ctx, {
          lat: cmd.lat,
          lng: cmd.lng,
          type: cmd.mode,
          label: cmd.label,
          address: cmd.address,
          duration: cmd.liveDurationMinutes,
        });
        // Reconcile: mark as sent
        store.updateMessageStatus(tempId, "sent");
      } catch (err) {
        store.updateMessageStatus(tempId, "failed" as any);
      }
    })();
    exitPhase(trace);

    completeExecutorTrace(trace);
    return { ok: true, messageId: tempId };
  } catch (err: any) {
    failExecutorTrace(trace, err?.message || "unknown");
    return { ok: false, error: err?.message || "send_location_failed", phase: trace.phases[trace.phases.length - 1]?.phase };
  }
}