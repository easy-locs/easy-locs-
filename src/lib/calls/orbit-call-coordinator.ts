import { OrbitCallService } from "@/lib/calls/call-service";
import { supabase } from "@/integrations/supabase/client";
import { startRingTimeout, clearRingTimeout, clearAllRingTimeouts } from "@/lib/orbit/call-timeout";
import {
  loadCallState,
  setCallState,
  resetCallState,
  getCallStateSync,
} from "@/lib/calls/call-store";
import { assertMediaSupport } from "@/lib/security-chief/call-guards";

type CallType = "audio" | "video";

class OrbitCallCoordinator {
  private service = new OrbitCallService();
  private booted = false;
  private myUserId: string | null = null;

  async boot(userId: string) {
    if (this.booted && this.myUserId === userId) return;
    this.myUserId = userId;
    await loadCallState();
    this.booted = true;
  }

  getService() {
    return this.service;
  }

  async startOutgoingCall(params: {
    myUserId: string;
    peerUserId: string;
    callType: CallType;
  }) {
    await this.boot(params.myUserId);
    await assertMediaSupport({ video: params.callType === "video" });

    await setCallState({
      myUserId: params.myUserId,
      peerUserId: params.peerUserId,
      callType: params.callType,
      state: "dialing",
      sessionId: null,
      startedAt: null,
    });

    const { session } = await this.service.startOutgoingCall({
      callerUserId: params.myUserId,
      calleeUserId: params.peerUserId,
      callType: params.callType,
    });

    await setCallState({
      sessionId: session.id,
      state: "ringing_outgoing",
      startedAt: new Date().toISOString(),
    });

    startRingTimeout(session.id, async () => {
      const s = getCallStateSync();
      if (s.sessionId === session.id && s.state !== "active") {
        await setCallState({ state: "failed" });
      }
    });

    return session;
  }

  async acceptIncomingCall(params: {
    sessionId: string;
    myUserId: string;
    peerUserId: string;
    callType: CallType;
    remoteOffer: RTCSessionDescriptionInit;
  }) {
    await this.boot(params.myUserId);
    await assertMediaSupport({ video: params.callType === "video" });

    clearRingTimeout(params.sessionId);

    await setCallState({
      sessionId: params.sessionId,
      myUserId: params.myUserId,
      peerUserId: params.peerUserId,
      callType: params.callType,
      state: "connecting",
      startedAt: new Date().toISOString(),
    });

    const manager = await this.service.acceptIncomingCall({
      sessionId: params.sessionId,
      myUserId: params.myUserId,
      peerUserId: params.peerUserId,
      callType: params.callType,
      remoteOffer: params.remoteOffer,
    });

    await setCallState({ state: "active" });
    return manager;
  }

  async rejectIncomingCall(params: {
    sessionId: string;
    myUserId: string;
    peerUserId: string;
  }) {
    await this.boot(params.myUserId);
    clearRingTimeout(params.sessionId);

    await this.service.rejectIncomingCall(params);
    await setCallState({
      sessionId: params.sessionId,
      myUserId: params.myUserId,
      peerUserId: params.peerUserId,
      state: "rejected",
    });
  }

  async hangupCurrentCall() {
    const s = getCallStateSync();
    if (!s.sessionId || !s.myUserId || !s.peerUserId) {
      await resetCallState();
      return;
    }

    clearRingTimeout(s.sessionId);

    await this.service.hangup({
      sessionId: s.sessionId,
      myUserId: s.myUserId,
      peerUserId: s.peerUserId,
    });

    await setCallState({ state: "ended" });

    setTimeout(() => {
      resetCallState().catch(() => {});
    }, 1200);
  }

  async handleSignal(signal: any) {
    if (signal.signal_type === "offer") {
      await setCallState({
        sessionId: signal.session_id,
        state: "ringing_incoming",
      });
      startRingTimeout(signal.session_id, async () => {
        const s = getCallStateSync();
        if (s.sessionId === signal.session_id && s.state !== "active") {
          await setCallState({ state: "failed" });
        }
      });
      return;
    }

    if (signal.signal_type === "accept") {
      const s = getCallStateSync();
      if (s.sessionId === signal.session_id) {
        clearRingTimeout(signal.session_id);
        await setCallState({ state: "connecting" });
      }
    }

    if (signal.signal_type === "reject") {
      const s = getCallStateSync();
      if (s.sessionId === signal.session_id) {
        clearRingTimeout(signal.session_id);
        await setCallState({ state: "rejected" });
      }
    }

    if (signal.signal_type === "hangup") {
      const s = getCallStateSync();
      if (s.sessionId === signal.session_id) {
        this.service.getManager()?.destroy();
        await setCallState({ state: "ended" });
        setTimeout(() => resetCallState().catch(() => {}), 1200);
      }
      return;
    }

    await this.service.handleSignal(signal);
  }

  async recoverActiveSession() {
    const s = await loadCallState();
    if (!s.sessionId || !s.myUserId) return null;

    const { data: session } = await (supabase as any)
      .from("orbit_call_sessions")
      .select("*")
      .eq("id", s.sessionId)
      .maybeSingle();

    if (!session) {
      await resetCallState();
      return null;
    }

    if (["ended", "rejected"].includes(session.status)) {
      await resetCallState();
      return null;
    }

    return session;
  }

  destroy() {
    clearAllRingTimeouts();
    this.service.getManager()?.destroy();
  }
}

export const orbitCallCoordinator = new OrbitCallCoordinator();
