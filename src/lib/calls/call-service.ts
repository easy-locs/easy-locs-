/**
 * OrbitCallService — orchestrates WebRTC lifecycle with signaling.
 */
import { WebRtcCallManager } from "./webrtc-call-manager";
import {
  acceptCallSession,
  createOutgoingCallSession,
  endOrbitCallSession,
  rejectCallSession,
  sendCallSignal,
} from "./call-session-service";
import type { CallSignalRecord, CallType } from "./call-types";

export class OrbitCallService {
  private manager: WebRtcCallManager | null = null;
  private currentSessionId: string | null = null;

  async startOutgoingCall(params: {
    callerUserId: string;
    calleeUserId: string;
    callType: CallType;
  }) {
    this.manager = new WebRtcCallManager();

    const session = await createOutgoingCallSession({
      callerUserId: params.callerUserId,
      calleeUserId: params.calleeUserId,
      callType: params.callType,
    });

    this.currentSessionId = session.id;

    await this.manager.startLocalMedia(params.callType === "video");

    this.manager.onIceCandidate(async (candidate) => {
      await sendCallSignal({
        sessionId: session.id,
        senderUserId: params.callerUserId,
        receiverUserId: params.calleeUserId,
        signalType: "ice",
        payload: candidate.toJSON() as Record<string, unknown>,
      });
    });

    const offer = await this.manager.createOffer();

    await sendCallSignal({
      sessionId: session.id,
      senderUserId: params.callerUserId,
      receiverUserId: params.calleeUserId,
      signalType: "offer",
      payload: offer as unknown as Record<string, unknown>,
    });

    return { session, manager: this.manager };
  }

  async acceptIncomingCall(params: {
    sessionId: string;
    myUserId: string;
    peerUserId: string;
    callType: CallType;
    remoteOffer: RTCSessionDescriptionInit;
  }) {
    this.manager = new WebRtcCallManager();
    this.currentSessionId = params.sessionId;

    await acceptCallSession(params.sessionId);

    await this.manager.startLocalMedia(params.callType === "video");

    this.manager.onIceCandidate(async (candidate) => {
      await sendCallSignal({
        sessionId: params.sessionId,
        senderUserId: params.myUserId,
        receiverUserId: params.peerUserId,
        signalType: "ice",
        payload: candidate.toJSON() as Record<string, unknown>,
      });
    });

    const answer = await this.manager.createAnswer(params.remoteOffer);

    await sendCallSignal({
      sessionId: params.sessionId,
      senderUserId: params.myUserId,
      receiverUserId: params.peerUserId,
      signalType: "answer",
      payload: answer as unknown as Record<string, unknown>,
    });

    await sendCallSignal({
      sessionId: params.sessionId,
      senderUserId: params.myUserId,
      receiverUserId: params.peerUserId,
      signalType: "accept",
      payload: {},
    });

    return this.manager;
  }

  async rejectIncomingCall(params: {
    sessionId: string;
    myUserId: string;
    peerUserId: string;
  }) {
    await rejectCallSession(params.sessionId);

    await sendCallSignal({
      sessionId: params.sessionId,
      senderUserId: params.myUserId,
      receiverUserId: params.peerUserId,
      signalType: "reject",
      payload: {},
    });
  }

  async hangup(params: {
    sessionId: string;
    myUserId: string;
    peerUserId: string;
  }) {
    await endOrbitCallSession(params.sessionId);

    await sendCallSignal({
      sessionId: params.sessionId,
      senderUserId: params.myUserId,
      receiverUserId: params.peerUserId,
      signalType: "hangup",
      payload: {},
    });

    this.manager?.destroy();
    this.manager = null;
    this.currentSessionId = null;
  }

  async handleSignal(signal: CallSignalRecord) {
    if (!this.manager) return;

    if (signal.signal_type === "answer") {
      await this.manager.applyAnswer(signal.payload as unknown as RTCSessionDescriptionInit);
    }

    if (signal.signal_type === "ice") {
      await this.manager.addIceCandidate(signal.payload as unknown as RTCIceCandidateInit);
    }

    if (signal.signal_type === "hangup" || signal.signal_type === "reject") {
      this.manager.destroy();
      this.manager = null;
      this.currentSessionId = null;
    }
  }

  getManager() {
    return this.manager;
  }

  getCurrentSessionId() {
    return this.currentSessionId;
  }
}
