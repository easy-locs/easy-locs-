import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";
import type { ShopTransferPacket, SupportSession } from "./support-types";
import type { SupportIssueCategory, SupportUrgency } from "./canonical-support-taxonomy";
import { SUPPORT_SESSION_STATUS } from "./canonical-support-taxonomy";
import {
  updateSessionStatus,
  addTrace,
  addMessage,
} from "./support-session-service";

const SHOP_RESPONSE_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_TRANSFER_ATTEMPTS = 3;

export function buildTransferPacket(
  session: SupportSession,
  customerName: string | null,
  transcriptSummary: string,
): ShopTransferPacket {
  return {
    session_id: session.id,
    customer_id: session.user_id,
    customer_name: customerName,
    order_id: session.order_id,
    booking_id: session.booking_id,
    issue_category: session.issue_category as SupportIssueCategory,
    summary: session.ai_summary ?? "Support request",
    urgency: session.urgency as SupportUrgency,
    transcript_summary: transcriptSummary,
    timestamp: new Date().toISOString(),
    language: session.language,
  };
}

export async function initiateShopTransfer(
  session: SupportSession,
  packet: ShopTransferPacket,
): Promise<{ success: boolean; reason: string }> {
  if (!session.shop_id) {
    return { success: false, reason: "No shop associated with this session" };
  }

  if (session.shop_transfer_attempts >= MAX_TRANSFER_ATTEMPTS) {
    await triggerFallbackTicket(session, "Maximum transfer attempts exceeded");
    return { success: false, reason: "Maximum transfer attempts reached — ticket created" };
  }

  await updateSessionStatus(session.id, SUPPORT_SESSION_STATUS.TRANSFERRING_TO_SHOP, {
    shop_transfer_attempts: session.shop_transfer_attempts + 1,
  } as Partial<SupportSession>);

  await addTrace(session.id, "shop_transfer_initiated", "system", {
    shop_id: session.shop_id,
    attempt: session.shop_transfer_attempts + 1,
    packet_summary: packet.summary,
    urgency: packet.urgency,
  });

  const { error: notifyError } = await db("orbit_notifications").insert({
    user_id: session.shop_id,
    type: "support_transfer",
    title: `Support: ${packet.issue_category.replace(/_/g, " ")}`,
    body: packet.summary,
    data: {
      session_id: session.id,
      packet,
    },
    read: false,
  });

  if (notifyError) {
    console.error("[shop-transfer] Failed to notify shop:", notifyError);
  }

  platformBus.emit("support:shop_transfer_initiated", {
    sessionId: session.id,
    shopId: session.shop_id,
    attempt: session.shop_transfer_attempts + 1,
    urgency: packet.urgency,
  }, "system");

  await addMessage({
    sessionId: session.id,
    sender: "system",
    content: "Connecting you with the shop. Please hold on...",
    contentType: "system_notice",
  });

  scheduleTransferTimeout(session.id, session.shop_id);

  return { success: true, reason: "Transfer initiated" };
}

export async function handleShopResponse(
  sessionId: string,
  shopId: string,
  accepted: boolean,
): Promise<void> {
  if (accepted) {
    await updateSessionStatus(sessionId, SUPPORT_SESSION_STATUS.WITH_SHOP, {
      shop_response_at: new Date().toISOString(),
    } as Partial<SupportSession>);

    await addTrace(sessionId, "shop_transfer_accepted", "shop", {
      shop_id: shopId,
      response_time_ms: Date.now(),
    });

    await addMessage({
      sessionId,
      sender: "system",
      content: "You're now connected with the shop. They'll help you from here.",
      contentType: "system_notice",
    });

    platformBus.emit("support:shop_transfer_accepted", {
      sessionId,
      shopId,
    }, "system");
  } else {
    await addTrace(sessionId, "shop_transfer_rejected", "shop", {
      shop_id: shopId,
    });

    const session = await db("support_sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (session.data) {
      await triggerFallbackTicket(
        session.data as SupportSession,
        "Shop declined the transfer",
      );
    }
  }
}

async function scheduleTransferTimeout(
  sessionId: string,
  shopId: string,
): Promise<void> {
  setTimeout(async () => {
    const { data: session } = await db("support_sessions")
      .select("status")
      .eq("id", sessionId)
      .single();

    if (
      session &&
      session.status === SUPPORT_SESSION_STATUS.TRANSFERRING_TO_SHOP
    ) {
      await addTrace(sessionId, "shop_transfer_timeout", "system", {
        shop_id: shopId,
        timeout_ms: SHOP_RESPONSE_TIMEOUT_MS,
      });

      await recordShopNonResponse(shopId, sessionId);

      const fullSession = await db("support_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (fullSession.data) {
        await triggerFallbackTicket(
          fullSession.data as SupportSession,
          "Shop did not respond within timeout",
        );
      }
    }
  }, SHOP_RESPONSE_TIMEOUT_MS);
}

async function triggerFallbackTicket(
  session: SupportSession,
  reason: string,
): Promise<void> {
  await updateSessionStatus(
    session.id,
    SUPPORT_SESSION_STATUS.TICKET_CREATED,
  );

  const { data: ticket } = await db("support_tickets").insert({
    context_id: session.order_id ?? session.booking_id ?? session.id,
    context_type: session.order_id ? "order" : session.booking_id ? "booking" : "session",
    ticket_type: session.issue_category ?? "other",
    priority: session.urgency ?? "medium",
    subject: `[Auto] ${session.ai_summary ?? "Support request"} — ${reason}`,
    status: "open",
    requester_user_id: session.user_id,
    reporter_user_id: session.user_id,
    metadata: {
      session_id: session.id,
      shop_id: session.shop_id,
      fallback_reason: reason,
      shop_transfer_attempts: session.shop_transfer_attempts,
    },
  }).select().single();

  if (ticket) {
    await db("support_sessions")
      .update({ ticket_id: ticket.id, updated_at: new Date().toISOString() })
      .eq("id", session.id);

    await addTrace(session.id, "ticket_created", "system", {
      ticket_id: ticket.id,
      reason,
    });
  }

  await addMessage({
    sessionId: session.id,
    sender: "system",
    content: `We couldn't reach the shop right now. A support ticket has been created and you'll receive updates. Reference: #${ticket?.id?.slice(0, 8) ?? "pending"}`,
    contentType: "system_notice",
  });

  platformBus.emit("support:fallback_ticket_created", {
    sessionId: session.id,
    ticketId: ticket?.id,
    shopId: session.shop_id,
    reason,
  }, "system");
}

async function recordShopNonResponse(
  shopId: string,
  sessionId: string,
): Promise<void> {
  await db("shop_quality_events").insert({
    shop_id: shopId,
    event_type: "support_non_response",
    session_id: sessionId,
    severity: "high",
    metadata: {
      timeout_ms: SHOP_RESPONSE_TIMEOUT_MS,
      timestamp: new Date().toISOString(),
    },
  }).then(() => {}).catch((err: unknown) => {
    console.error("[shop-transfer] Failed to record non-response:", err);
  });

  platformBus.emit("support:shop_non_response", {
    shopId,
    sessionId,
  }, "system");
}
