/**
 * useOutgoingCall — Outgoing call flow orchestrator.
 * Single responsibility: auth → resolve → RPC → CallManager → media.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { startFlow, addStep, completeStep, failStep, endFlow } from "@/lib/runtime/flow-tracer";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import { resolveCallTarget } from "@/lib/call/call-target-resolver";
import { createCallRpc } from "@/lib/call/call-rpc";
import { CallManager } from "@/lib/call-manager";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import type { ActiveCallMeta } from "./useCallState";

interface StartCallOpts {
  targetId: string;
  threadId?: string;
  contextType?: string;
  contextId?: string;
  contextLabel?: string;
  peerName: string;
  isVideo?: boolean;
}

export function useOutgoingCall(
  userId: string | undefined,
  startingCallRef: React.MutableRefObject<boolean>,
  onCallCreated: (params: {
    manager: CallManager;
    peerName: string;
    contextLabel: string;
    meta: ActiveCallMeta;
    isVideo: boolean;
  }) => void,
  setIsStartingCall: (v: boolean) => void,
) {
  const { t } = useI18n();

  const startCall = useCallback(async (opts: StartCallOpts) => {
    if (!userId) { toast.error("Authentication required."); return; }
    if (startingCallRef.current) return;
    startingCallRef.current = true;
    setIsStartingCall(true);

    const flow = startFlow("orbit", "outgoingCall");
    try {
      // Step 1: Auth check
      const authStep = addStep(flow, "auth_check");
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user?.id) {
        failStep(flow, authStep, "session_expired");
        endFlow(flow, "failed");
        toast.error(t("call.error.session_expired") || "Session expired.");
        return;
      }
      completeStep(flow, authStep);

      // Step 2: Resolve target
      const resolveStep = addStep(flow, "resolve_target");
      const receiverUserId = await resolveCallTarget(opts.targetId, authData.user.id);
      if (!receiverUserId || receiverUserId === authData.user.id) {
        failStep(flow, resolveStep, "no_callable_target");
        endFlow(flow, "failed");
        toast.error(receiverUserId === authData.user.id
          ? "No other team member available."
          : "Could not find a callable contact.");
        return;
      }
      completeStep(flow, resolveStep, { receiverUserId });

      // Step 3: RPC write
      const rpcStep = addStep(flow, "db_write");
      const result = await createCallRpc({
        callerUserId: authData.user.id, receiverUserId,
        threadId: opts.threadId, contextType: opts.contextType,
        contextId: opts.contextId, contextLabel: opts.contextLabel,
        isVideo: opts.isVideo || false,
      });
      if (!result.success || !result.callId) {
        failStep(flow, rpcStep, result.error || "rpc_failed");
        endFlow(flow, "failed");
        toast.error(result.error || "Unable to start call");
        return;
      }
      completeStep(flow, rpcStep, { callId: result.callId });

      // Step 4: Create manager + media
      const manager = new CallManager({
        callId: result.callId, userId: authData.user.id, role: "caller",
        onStateChange: () => {}, // Will be wired by parent
      });

      onCallCreated({
        manager,
        peerName: opts.peerName,
        contextLabel: opts.contextLabel || "",
        meta: { callId: result.callId, threadId: opts.threadId, orgId: opts.targetId, contextId: opts.contextId },
        isVideo: opts.isVideo || false,
      });

      platformBus.emit("call:started", {
        callId: result.callId, role: "caller",
        isVideo: opts.isVideo || false, peerName: opts.peerName,
      }, "orbit");

      const mediaStep = addStep(flow, "media_start");
      await manager.startCall(opts.isVideo || false);
      completeStep(flow, mediaStep);

      reportHealth("orbit", "ok");
      endFlow(flow, "success");
    } catch (err: any) {
      reportHealth("orbit", "degraded", undefined, err?.message);
      endFlow(flow, "failed");
      console.error("[useOutgoingCall] startCall error:", err);
    } finally {
      startingCallRef.current = false;
      setIsStartingCall(false);
    }
  }, [userId, t, onCallCreated, setIsStartingCall]);

  return { startCall };
}
