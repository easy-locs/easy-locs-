/**
 * call-rpc — Atomic unit: create a call via idempotent RPC.
 * Single responsibility: DB call creation only.
 *
 * IDENTITY RULE: The RPC stores caller_orbit_id / receiver_orbit_id
 * in call_logs. We pass auth.uid (UUID strings) because the incoming
 * call listener filters on both userId AND orbit_id. The RPC itself
 * also resolves org_members by user_id. Keeping auth.uid ensures
 * listeners always match.
 */
import { supabase } from "@/integrations/supabase/client";
import { startFlow, addStep, completeStep, failStep, endFlow } from "@/lib/runtime/flow-tracer";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[CALL][${step}] ${phase}:`, payload ?? {});
};

export interface CreateCallInput {
  callerUserId: string;
  receiverUserId: string;
  threadId?: string | null;
  contextType?: string;
  contextId?: string | null;
  contextLabel?: string | null;
  isVideo: boolean;
}

export interface CreateCallResult {
  success: boolean;
  callId?: string;
  error?: string;
}

export async function createCallRpc(input: CreateCallInput): Promise<CreateCallResult> {
  const flow = startFlow("orbit", "createCall");
  trace("rpc.create", "input", { ...input });

  const rpcStep = addStep(flow, "rpc_call");

  // IDENTITY: pass auth.uid as orbit_id params — the RPC stores them as-is
  // in call_logs. The incoming listener subscribes on BOTH userId and orbit_id,
  // so using auth.uid guarantees the userId filter always matches.
  const { data: callId, error } = await supabase.rpc("create_call_idempotent" as any, {
    _caller_orbit_id: input.callerUserId,
    _receiver_orbit_id: input.receiverUserId,
    _thread_id: input.threadId || null,
    _context_type: input.contextType || "listing",
    _context_id: input.contextId || null,
    _context_label: input.contextLabel || null,
    _is_video: input.isVideo,
  });

  if (error || !callId) {
    failStep(flow, rpcStep, error?.message || "no_call_id");
    endFlow(flow, "failed");
    trace("rpc.create", "error", { message: error?.message });
    return { success: false, error: error?.message || "Failed to create call" };
  }

  completeStep(flow, rpcStep, { callId });
  endFlow(flow, "success");
  trace("rpc.create", "output", { callId });
  return { success: true, callId: callId as string };
}
