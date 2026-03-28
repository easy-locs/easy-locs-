/**
 * Support domain orchestration handlers.
 * Single responsibility: refund/issue events → support ticket + notification + log.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { supabase } from "@/integrations/supabase/client";
import { logOrchestrationEvent } from "../logger";
import type { RefundRequestedPayload, IssueCreatedPayload } from "../eventTypes";
import { createNotification, updateOrderStatus } from "../orchestration-utils";

async function createSupportTicket(payload: RefundRequestedPayload | IssueCreatedPayload) {
  const orderId = payload.orderId;
  const { error } = await supabase.from("support_tickets").insert({
    requester_user_id: payload.requesterUserId,
    ticket_type: "reason" in payload ? "refund_issue" : (payload as IssueCreatedPayload).type,
    subject: orderId ? `Issue linked to order ${orderId}` : "General support issue",
    context_id: orderId ?? null,
    context_type: orderId ? "order" : "general",
    status: "open",
  });
  if (error) console.error("[orchestration] support ticket error", error);
}

export function installSupportHandlers(): void {
  platformBus.on("REFUND_REQUESTED", async (event) => {
    const p = event.payload as RefundRequestedPayload;
    await createSupportTicket(p);
    await updateOrderStatus(p.orderId, "disputed");
    await createNotification({ actorType: "system", templateKey: "refund_requested_admin_review", payload: p as any });
    await logOrchestrationEvent({ eventType: "orch_refund_requested", entityId: p.orderId, entityType: "order", metadata: p as any });
  });

  platformBus.on("ISSUE_CREATED", async (event) => {
    const p = event.payload as IssueCreatedPayload;
    await createSupportTicket(p);
    await createNotification({ actorType: "system", templateKey: "issue_created", payload: p as any });
    await logOrchestrationEvent({ eventType: "orch_issue_created", entityId: p.ticketId, entityType: "support_ticket", metadata: p as any });
  });
}
