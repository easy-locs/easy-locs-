/**
 * OrbitCallService — orchestrates WebRTC lifecycle with signaling.
 * Includes ringtone and connection tone management.
 */
import { WebRtcCallManager } from "@/lib/calls/webrtc-call-manager";
import {
  acceptCallSession,
  createCallSession,
  endOrbitCallSession,
  rejectCallSession,
  sendCallSignal,
} from "@/lib/calls/call-session-service";
import {
  startRingtone,
  stopRingtone,
  playCallConnectedTone,
  playCallEndedTone,
} from "@/lib/calls/call-ringtone";
import type {
  CallSignalRecord,
  CallType,
} from "@/lib/calls/call-types";

export class OrbitCallService {
  private manager: WebRtcCallManager | null = null;
  private currentSessionId: string | null = null;

  async startOutgoingCall(params: {
    callerUserId: string;
    calleeUserId: string;
    callType: CallType;
  }) {
    const session = await createCallSession(params);

    this.manager = new WebRtcCallManager();
    this.currentSessionId = session.id;

    // Start ringing tone for caller while waiting
    startRingtone();

    await this.manager.startLocalMedia(params.callType === "video");

    await this.manager.onIceCandidate(async (candidate) => {
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
    // Stop ringtone and play connected tone
    stopRingtone();
    playCallConnectedTone();

    this.manager = new WebRtcCallManager();
    this.currentSessionId = params.sessionId;

    await acceptCallSession(params.sessionId);
    await this.manager.startLocalMedia(params.callType === "video");

    await this.manager.onIceCandidate(async (candidate) => {
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
    stopRingtone();

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
    stopRingtone();
    playCallEndedTone();

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
      // Caller receives answer — stop ringing, play connected tone
      stopRingtone();
      playCallConnectedTone();
      await this.manager.applyAnswer(
        signal.payload as unknown as RTCSessionDescriptionInit
      );
    }

    if (signal.signal_type === "accept") {
      // Callee accepted — stop ringtone on caller side
      stopRingtone();
    }

    if (signal.signal_type === "ice") {
      await this.manager.addIceCandidate(
        signal.payload as unknown as RTCIceCandidateInit
      );
    }

    if (signal.signal_type === "hangup" || signal.signal_type === "reject") {
      stopRingtone();
      playCallEndedTone();
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
