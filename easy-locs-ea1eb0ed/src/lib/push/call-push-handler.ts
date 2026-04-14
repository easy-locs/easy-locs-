import { db } from "@/services/db";

export interface IncomingCallPushPayload {
  event_type: "incoming_call";
  call_id: string;
  caller_name: string;
  caller_avatar_url?: string;
  call_type: "audio" | "video";
  conversation_id?: string;
}

export async function sendCallPushNotification(params: {
  receiverUserId: string;
  callId: string;
  callerName: string;
  callerAvatarUrl?: string;
  callType: "audio" | "video";
  conversationId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const callTypeLabel = params.callType === "video" ? "Video" : "Voice";
    const { data, error } = await db.functions.invoke("send-push-notification", {
      body: {
        user_id: params.receiverUserId,
        title: `Incoming ${callTypeLabel} Call`,
        body: `${params.callerName} is calling you`,
        event_type: "incoming_call",
        data: {
          event_type: "incoming_call",
          call_id: params.callId,
          caller_name: params.callerName,
          caller_avatar_url: params.callerAvatarUrl || "",
          call_type: params.callType,
          conversation_id: params.conversationId || "",
          action_accept: "true",
          action_decline: "true",
          require_interaction: "true",
          priority: "high",
        },
      },
    });

    if (error) {
      console.error("[CallPush] Failed to send:", error);
      return { success: false, error: error.message || "Push failed" };
    }

    return { success: true };
  } catch (err) {
    console.error("[CallPush] Error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function sendCallMissedPushNotification(params: {
  receiverUserId: string;
  callId: string;
  callerName: string;
  callType: "audio" | "video";
}): Promise<void> {
  try {
    const callTypeLabel = params.callType === "video" ? "video" : "voice";
    await db.functions.invoke("send-push-notification", {
      body: {
        user_id: params.receiverUserId,
        title: `Missed ${callTypeLabel} call`,
        body: `You missed a call from ${params.callerName}`,
        event_type: "missed_call",
        data: {
          event_type: "missed_call",
          call_id: params.callId,
          caller_name: params.callerName,
          call_type: params.callType,
        },
      },
    });
  } catch (err) {
    console.error("[CallPush] Missed notification error:", err);
  }
}

export function handleCallPushAction(action: string, callId: string): void {
  if (action === "accept") {
    window.dispatchEvent(
      new CustomEvent("orbit:call:push-accept", { detail: { callId } })
    );
  } else if (action === "decline") {
    window.dispatchEvent(
      new CustomEvent("orbit:call:push-decline", { detail: { callId } })
    );
  }
}

export function isIncomingCallPush(data: Record<string, string>): boolean {
  return data?.event_type === "incoming_call" && !!data?.call_id;
}

export function parseCallPushPayload(
  data: Record<string, string>
): IncomingCallPushPayload | null {
  if (!isIncomingCallPush(data)) return null;
  return {
    event_type: "incoming_call",
    call_id: data.call_id,
    caller_name: data.caller_name || "Unknown",
    caller_avatar_url: data.caller_avatar_url,
    call_type: (data.call_type as "audio" | "video") || "audio",
    conversation_id: data.conversation_id,
  };
}
