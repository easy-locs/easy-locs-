import { db } from "@/services/db";
import { resolveOrbitId } from "@/lib/orbit/orbit-data-gateway";
import { startFlow, addStep, completeStep, failStep, endFlow } from "@/lib/runtime/flow-tracer";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[CALL][${step}] ${phase}:`, payload ?? {});
};

function syntheticOrbitId(userId: string): string {
  return `orbit_${userId.replace(/-/g, "").substring(0, 8)}`;
}

export interface CreateCallInput {
  callerUserId: string;
  receiverUserId: string;
  callerOrbitId?: string;
  receiverOrbitId?: string;
  conversationId?: string | null;
  entityType?: string;
  entityId?: string | null;
  contextLabel?: string | null;
  isVideo: boolean;
}

export interface CreateCallResult {
  success: boolean;
  callId?: string;
  error?: string;
}

function generateCallId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `call_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function safeResolveOrbitId(userId: string, providedOrbitId?: string): Promise<string> {
  if (providedOrbitId) return providedOrbitId;
  try {
    return await resolveOrbitId(userId);
  } catch (err) {
    console.warn(`[CALL] resolveOrbitId failed for ${userId}, using synthetic`, err);
    return syntheticOrbitId(userId);
  }
}

async function directInsertFallback(
  input: CreateCallInput,
  callerOrbitId: string,
  receiverOrbitId: string,
): Promise<CreateCallResult> {
  trace("rpc.directInsert", "input", { callerOrbitId, receiverOrbitId });

  const callId = generateCallId();

  const { error: insertError } = await db
    .from("call_logs")
    .insert({
      id: callId,
      caller_orbit_id: callerOrbitId,
      receiver_orbit_id: receiverOrbitId,
      caller_user_id: input.callerUserId,
      receiver_user_id: input.receiverUserId,
      conversation_id: input.conversationId || null,
      thread_id: input.conversationId || null,
      context_type: input.entityType || "listing",
      context_id: input.entityId || null,
      context_label: input.contextLabel || null,
      call_type: input.isVideo ? "video" : "audio",
      is_video: input.isVideo,
      status: "ringing",
      started_at: new Date().toISOString(),
    });

  if (insertError) {
    trace("rpc.directInsert", "error", { message: insertError.message });
    return { success: false, error: insertError.message };
  }

  trace("rpc.directInsert", "output", { callId });
  return { success: true, callId };
}

export async function createCallRpc(input: CreateCallInput): Promise<CreateCallResult> {
  const flow = startFlow("orbit", "createCall");
  trace("rpc.create", "input", { ...input });

  const rpcStep = addStep(flow, "rpc_call");

  const [callerOrbitId, receiverOrbitId] = await Promise.all([
    safeResolveOrbitId(input.callerUserId, input.callerOrbitId),
    safeResolveOrbitId(input.receiverUserId, input.receiverOrbitId),
  ]);

  const { data: callId, error } = await db.rpc("create_call_idempotent", {
    _caller_orbit_id: callerOrbitId,
    _receiver_orbit_id: receiverOrbitId,
    _thread_id: input.conversationId || null,
    _context_type: input.entityType || "listing",
    _context_id: input.entityId || null,
    _context_label: input.contextLabel || null,
    _is_video: input.isVideo,
  });

  if (error || !callId) {
    trace("rpc.create", "error", { message: error?.message, code: error?.code, callerOrbitId, receiverOrbitId });

    const isRpcMissing = error?.message?.includes("function") ||
      error?.message?.includes("does not exist") ||
      error?.code === "42883" ||
      error?.code === "PGRST202" ||
      !callId;

    if (isRpcMissing) {
      const fallbackResult = await directInsertFallback(input, callerOrbitId, receiverOrbitId);
      if (fallbackResult.success) {
        completeStep(flow, rpcStep, { callId: fallbackResult.callId, strategy: "direct_insert" });
        endFlow(flow, "success");
        return fallbackResult;
      }

      failStep(flow, rpcStep, fallbackResult.error || "both_strategies_failed");
      endFlow(flow, "failed");
      return { success: false, error: fallbackResult.error || "Failed to create call" };
    }

    failStep(flow, rpcStep, error?.message || "rpc_error");
    endFlow(flow, "failed");
    return { success: false, error: error?.message || "Failed to create call" };
  }

  completeStep(flow, rpcStep, { callId, callerOrbitId, receiverOrbitId });
  endFlow(flow, "success");
  trace("rpc.create", "output", { callId, callerOrbitId, receiverOrbitId });
  return { success: true, callId: callId as string };
}
