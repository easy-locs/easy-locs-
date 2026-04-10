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
import type { ActiveCallMeta } from "@/stores/orbit/call.store";

interface StartCallOpts {
  targetId: string;
  receiverUserId?: string;
  receiverOrbitId?: string;
  conversationId?: string;
  entityType?: string;
  entityId?: string;
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

  const startCall = useCallback(async (opts: StartCallOpts): Promise<boolean> => {
    if (!userId) { toast.error("Authentication required."); return false; }
    if (startingCallRef.current) return false;
    startingCallRef.current = true;
    setIsStartingCall(true);

    const flow = startFlow("orbit", "outgoingCall");
    try {
      const authStep = addStep(flow, "auth_check");
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user?.id) {
        failStep(flow, authStep, "session_expired");
        endFlow(flow, "failed");
        toast.error(t("call.error.session_expired") || "Session expired.");
        return false;
      }
      completeStep(flow, authStep);

      const resolveStep = addStep(flow, "resolve_target");
      let receiverUserId = opts.receiverUserId || "";
      if (!receiverUserId) {
        receiverUserId = await resolveCallTarget(opts.targetId, authData.user.id);
      }
      if (!receiverUserId || receiverUserId === authData.user.id) {
        failStep(flow, resolveStep, "no_callable_target");
        endFlow(flow, "failed");
        throw new Error(receiverUserId === authData.user.id
          ? "no_other_member"
          : "no_callable_target");
      }
      completeStep(flow, resolveStep, { receiverUserId, strategy: opts.receiverUserId ? "direct" : "resolved" });

      const rpcStep = addStep(flow, "db_write");
      const result = await createCallRpc({
        callerUserId: authData.user.id,
        receiverUserId,
        callerOrbitId: opts.targetId.startsWith("orbit_") ? undefined : undefined,
        receiverOrbitId: opts.receiverOrbitId,
        conversationId: opts.conversationId,
        entityType: opts.entityType,
        entityId: opts.entityId,
        contextLabel: opts.contextLabel,
        isVideo: opts.isVideo || false,
      });
      if (!result.success || !result.callId) {
        failStep(flow, rpcStep, result.error || "rpc_failed");
        endFlow(flow, "failed");
        toast.error(result.error || "Unable to start call");
        return false;
      }
      completeStep(flow, rpcStep, { callId: result.callId });

      const manager = new CallManager({
        callId: result.callId, userId: authData.user.id, role: "caller",
        onStateChange: () => {},
      });

      onCallCreated({
        manager,
        peerName: opts.peerName,
        contextLabel: opts.contextLabel || "",
        meta: {
          callId: result.callId,
          conversationId: opts.conversationId,
          orgId: opts.targetId,
          entityId: opts.entityId,
        },
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
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      reportHealth("orbit", "degraded", undefined, message);
      endFlow(flow, "failed");
      console.error("[useOutgoingCall] startCall error:", err);
      throw err;
    } finally {
      startingCallRef.current = false;
      setIsStartingCall(false);
    }
  }, [userId, t, onCallCreated, setIsStartingCall]);

  return { startCall };
}
