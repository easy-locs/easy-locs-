/**
 * executeReplyMessage — Strict pipeline: intent → canonical → optimistic → transport → reconcile
 * Delegates to executeSendText with replyToMessageId set.
 */
import type { ReplyCommand } from "../orbit-commands";
import type { ResolvedContext, ExecutorResult } from "./pipeline-types";
import { executeSendText } from "./executeSendText";

export async function executeReplyMessage(
  ctx: ResolvedContext,
  cmd: ReplyCommand,
): Promise<ExecutorResult> {
  // Reply is a text send with replyToMessageId — reuse the canonical text executor
  return executeSendText(ctx, {
    type: "send_text",
    conversationId: cmd.conversationId,
    body: cmd.body,
    encrypted: cmd.encrypted,
    replyToMessageId: cmd.replyToMessageId,
    category: cmd.category,
    locale: cmd.locale,
    _traceId: cmd._traceId,
  });
}
