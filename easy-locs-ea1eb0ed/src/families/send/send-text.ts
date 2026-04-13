/**
 * send.text — Thin wrapper over orbitDispatch (canonical pipeline).
 *
 * This file previously contained a direct DB write + broadcast pipeline.
 * All send operations now flow through orbitDispatch to guarantee a single
 * idempotency boundary, realtime dedup, and consistent observability.
 *
 * Consumers should prefer using orbitDispatch({ type: "send_text", ... })
 * directly. This wrapper is retained for backward-compat of any remaining
 * call sites that imported sendText from this module.
 */
import { orbitDispatch } from "@/families/orbit-dispatch/orbit-dispatch";
import type { SendContext } from "./send-context";

export async function sendText(
  ctx: SendContext,
  body: string,
  opts?: {
    encrypted?: boolean;
    replyToMessageId?: string | null;
    category?: string;
    locale?: string;
    securityLevel?: string;
    disappearTTL?: string | null;
    _traceId?: string;
  },
): Promise<{ id: string; created_at: string; metadata: unknown }> {
  const result = await orbitDispatch({
    type: "send_text",
    conversationId: ctx.conversationId,
    body,
    replyToMessageId: opts?.replyToMessageId ?? null,
    category: opts?.category,
    locale: opts?.locale,
    disappearTTL: opts?.disappearTTL ?? null,
    _uiTempId: opts?._traceId,
  });

  if (!result.ok) {
    throw new Error(result.error ?? "send_text_failed");
  }

  return {
    id: result.messageId ?? result.requestId ?? "",
    created_at: new Date().toISOString(),
    metadata: {},
  };
}
