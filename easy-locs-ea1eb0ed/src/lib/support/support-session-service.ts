import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";
import type {
  SupportSession,
  SupportTrace,
  SupportMessage,
  SupportTraceEventType,
} from "./support-types";
import type {
  SupportIssueCategory,
  SupportSessionStatus,
  SupportUrgency,
  RoutingTarget,
  SupportChannel,
} from "./canonical-support-taxonomy";
import { SUPPORT_SESSION_STATUS, SLA_MINUTES } from "./canonical-support-taxonomy";

export async function createSupportSession(params: {
  userId: string;
  channel: SupportChannel;
  language: string;
  orderId?: string;
  shopId?: string;
  bookingId?: string;
}): Promise<SupportSession | null> {
  const { data, error } = await db("support_sessions").insert({
    user_id: params.userId,
    channel: params.channel,
    status: SUPPORT_SESSION_STATUS.ACTIVE,
    language: params.language,
    order_id: params.orderId ?? null,
    shop_id: params.shopId ?? null,
    booking_id: params.bookingId ?? null,
    shop_transfer_attempts: 0,
    metadata: {},
  }).select().single();

  if (error) {
    console.error("[support-session] Failed to create session:", error);
    return null;
  }

  await addTrace(data.id, "session_started", "system", {
    channel: params.channel,
    language: params.language,
    order_id: params.orderId,
    shop_id: params.shopId,
  });

  platformBus.emit("support:session_started", {
    sessionId: data.id,
    userId: params.userId,
    channel: params.channel,
  }, "system");

  return data as SupportSession;
}

export async function updateSessionStatus(
  sessionId: string,
  status: SupportSessionStatus,
  extra?: Partial<SupportSession>,
): Promise<boolean> {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
    ...extra,
  };

  if (status === SUPPORT_SESSION_STATUS.CLOSED || status === SUPPORT_SESSION_STATUS.RESOLVED) {
    updates.closed_at = new Date().toISOString();
  }

  const { error } = await db("support_sessions")
    .update(updates)
    .eq("id", sessionId);

  if (error) {
    console.error("[support-session] Failed to update status:", error);
    return false;
  }

  platformBus.emit("support:session_status_changed", {
    sessionId,
    status,
  }, "system");

  return true;
}

export async function classifySession(
  sessionId: string,
  category: SupportIssueCategory,
  urgency: SupportUrgency,
  confidence: number,
  summary: string,
  routingTarget: RoutingTarget,
): Promise<boolean> {
  const { error } = await db("support_sessions")
    .update({
      issue_category: category,
      urgency,
      ai_classification_confidence: confidence,
      ai_summary: summary,
      routing_target: routingTarget,
      status: SUPPORT_SESSION_STATUS.AI_HANDLING,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    console.error("[support-session] Failed to classify:", error);
    return false;
  }

  await addTrace(sessionId, "ai_classification", "ai", {
    category,
    urgency,
    confidence,
    summary,
    routing_target: routingTarget,
  });

  return true;
}

export async function addMessage(params: {
  sessionId: string;
  sender: "user" | "ai" | "shop" | "system";
  content: string;
  contentType?: "text" | "voice_transcript" | "media" | "system_notice";
  metadata?: Record<string, unknown>;
}): Promise<SupportMessage | null> {
  const { data, error } = await db("support_messages").insert({
    session_id: params.sessionId,
    sender: params.sender,
    content: params.content,
    content_type: params.contentType ?? "text",
    metadata: params.metadata ?? {},
  }).select().single();

  if (error) {
    console.error("[support-session] Failed to add message:", error);
    return null;
  }

  const traceType: SupportTraceEventType =
    params.sender === "user" ? "user_message" :
    params.sender === "ai" ? "ai_response" :
    params.sender === "shop" ? "shop_message" :
    "session_started";

  await addTrace(params.sessionId, traceType, params.sender, {
    message_id: data.id,
    content_length: params.content.length,
  });

  return data as SupportMessage;
}

export async function addTrace(
  sessionId: string,
  eventType: SupportTraceEventType,
  actor: "user" | "ai" | "shop" | "system" | "admin",
  data: Record<string, unknown>,
): Promise<void> {
  const { error } = await db("support_traces").insert({
    session_id: sessionId,
    event_type: eventType,
    actor,
    data,
  });

  if (error) {
    console.error("[support-session] Failed to add trace:", error);
  }
}

export async function getSession(sessionId: string): Promise<SupportSession | null> {
  const { data, error } = await db("support_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (error) return null;
  return data as SupportSession;
}

export async function getSessionMessages(sessionId: string): Promise<SupportMessage[]> {
  const { data, error } = await db("support_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data ?? []) as SupportMessage[];
}

export async function getSessionTraces(sessionId: string): Promise<SupportTrace[]> {
  const { data, error } = await db("support_traces")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data ?? []) as SupportTrace[];
}

export async function getActiveSessionForUser(userId: string): Promise<SupportSession | null> {
  const { data } = await db("support_sessions")
    .select("*")
    .eq("user_id", userId)
    .in("status", [
      SUPPORT_SESSION_STATUS.ACTIVE,
      SUPPORT_SESSION_STATUS.AI_HANDLING,
      SUPPORT_SESSION_STATUS.TRANSFERRING_TO_SHOP,
      SUPPORT_SESSION_STATUS.WITH_SHOP,
    ])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as SupportSession) ?? null;
}

export async function resolveSession(
  sessionId: string,
  resolvedBy: "ai" | "shop" | "admin" | "system",
  summary: string,
): Promise<boolean> {
  const ok = await updateSessionStatus(sessionId, SUPPORT_SESSION_STATUS.RESOLVED, {
    resolved_by: resolvedBy,
    resolution_summary: summary,
  } as Partial<SupportSession>);

  if (ok) {
    await addTrace(sessionId, "session_resolved", resolvedBy === "system" ? "system" : resolvedBy, {
      resolved_by: resolvedBy,
      summary,
    });
    platformBus.emit("support:session_resolved", { sessionId, resolvedBy, summary }, "system");
  }

  return ok;
}
