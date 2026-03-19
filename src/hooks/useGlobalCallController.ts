import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { orbitCallCoordinator } from "@/lib/calls/orbit-call-coordinator";
import { subscribeCallState, loadCallState, type PersistedCallState } from "@/lib/calls/call-store";
import { markSignalConsumed } from "@/lib/calls/call-session-service";

export function useGlobalCallController() {
  const { user } = useAuth();
  const [callState, setCallState] = useState<PersistedCallState | null>(null);
  const started = useRef(false);

  useEffect(() => {
    loadCallState().then(setCallState);
    return subscribeCallState(setCallState);
  }, []);

  useEffect(() => {
    if (!user?.id || started.current) return;
    started.current = true;

    orbitCallCoordinator.boot(user.id).catch(console.error);
    orbitCallCoordinator.recoverActiveSession().catch(console.error);

    const channel = supabase
      .channel(`global-call-signals:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orbit_call_signals",
          filter: `receiver_user_id=eq.${user.id}`,
        },
        async (payload: any) => {
          const signal = payload.new;
          await orbitCallCoordinator.handleSignal(signal);
          await markSignalConsumed(signal.id).catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      started.current = false;
    };
  }, [user?.id]);

  return {
    callState,
    startOutgoingCall: orbitCallCoordinator.startOutgoingCall.bind(orbitCallCoordinator),
    acceptIncomingCall: orbitCallCoordinator.acceptIncomingCall.bind(orbitCallCoordinator),
    rejectIncomingCall: orbitCallCoordinator.rejectIncomingCall.bind(orbitCallCoordinator),
    hangupCurrentCall: orbitCallCoordinator.hangupCurrentCall.bind(orbitCallCoordinator),
    getManager: () => orbitCallCoordinator.getService().getManager(),
  };
}
