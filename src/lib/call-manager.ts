/**
 * CallManager — Authenticated user-to-user WebRTC calling via Supabase Realtime.
 * Uses Realtime broadcast channels for signaling (instant, no polling).
 * Provides peer-to-peer encrypted audio/video calls between registered users.
 */
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  {
    urls: "turn:a.relay.metered.ca:80",
    username: "e8dd65b92f62d3207f4c4861",
    credential: "uWdxVcsLlCdLYlHp",
  },
  {
    urls: "turn:a.relay.metered.ca:80?transport=tcp",
    username: "e8dd65b92f62d3207f4c4861",
    credential: "uWdxVcsLlCdLYlHp",
  },
  {
    urls: "turn:a.relay.metered.ca:443",
    username: "e8dd65b92f62d3207f4c4861",
    credential: "uWdxVcsLlCdLYlHp",
  },
  {
    urls: "turns:a.relay.metered.ca:443?transport=tcp",
    username: "e8dd65b92f62d3207f4c4861",
    credential: "uWdxVcsLlCdLYlHp",
  },
];

const ICE_TIMEOUT_MS = 15_000;
const STREAM_TIMEOUT_MS = 25_000;

export type CallStatus =
  | "idle"
  | "ringing"
  | "connecting"
  | "active"
  | "ended"
  | "declined"
  | "missed"
  | "failed"
  | "network_blocked";

export type CallRole = "caller" | "callee";

export interface CallState {
  status: CallStatus;
  callId: string | null;
  isVideo: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  usingRelay: boolean;
  error: string | null;
  elapsed: number;
  callerName?: string;
  contextLabel?: string;
}

type SignalPayload = {
  type: "offer" | "answer" | "ice" | "declined" | "ended" | "accepted";
  data: string;
  from: string;
};

export class CallManager {
  private pc: RTCPeerConnection | null = null;
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private iceTimer: ReturnType<typeof setTimeout> | null = null;
  private streamTimer: ReturnType<typeof setTimeout> | null = null;
  private elapsedTimer: ReturnType<typeof setInterval> | null = null;
  private iceConnected = false;
  private role: CallRole;
  private callId: string;
  private userId: string;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  onStateChange: (state: Partial<CallState>) => void = () => {};

  constructor(opts: {
    callId: string;
    userId: string;
    role: CallRole;
    onStateChange: (state: Partial<CallState>) => void;
  }) {
    this.callId = opts.callId;
    this.userId = opts.userId;
    this.role = opts.role;
    this.onStateChange = opts.onStateChange;
  }

  /** Join the Realtime broadcast channel for signaling */
  private joinSignalChannel() {
    this.channel = supabase.channel(`call:${this.callId}`, {
      config: { broadcast: { self: false } },
    });

    this.channel.on("broadcast", { event: "signal" }, ({ payload }) => {
      const signal = payload as SignalPayload;
      if (signal.from === this.userId) return; // ignore own signals
      this.processSignal(signal);
    });

    this.channel.subscribe();
  }

  private sendSignal(signal: Omit<SignalPayload, "from">) {
    this.channel?.send({
      type: "broadcast",
      event: "signal",
      payload: { ...signal, from: this.userId } as SignalPayload,
    });
  }

  /** Caller: initiate call */
  async startCall(isVideo: boolean) {
    this.onStateChange({ status: "ringing", callId: this.callId, isVideo });
    this.joinSignalChannel();
    await this.setupMedia(isVideo);
    // Wait for callee to accept (they'll send an "accepted" signal, then we create offer)
  }

  /** Callee: accept incoming call */
  async acceptCall(isVideo: boolean) {
    this.onStateChange({ status: "connecting", callId: this.callId, isVideo });
    this.joinSignalChannel();
    await this.setupMedia(isVideo);

    // Update call_logs status
    await supabase
      .from("call_logs")
      .update({ status: "active", started_at: new Date().toISOString() } as any)
      .eq("id", this.callId);

    // Tell caller we accepted
    this.sendSignal({ type: "accepted", data: "{}" });

    // Create offer (callee creates offer for simplicity)
    this.createPeerConnection();
    const offer = await this.pc!.createOffer();
    await this.pc!.setLocalDescription(offer);
    this.sendSignal({ type: "offer", data: JSON.stringify(offer) });
    this.startIceTimeout();
    this.startElapsedTimer();
  }

  /** Decline call */
  async declineCall() {
    this.sendSignal({ type: "declined", data: "{}" });
    await supabase
      .from("call_logs")
      .update({ status: "declined", ended_at: new Date().toISOString() } as any)
      .eq("id", this.callId);
    this.onStateChange({ status: "declined" });
    this.cleanup();
  }

  /** End active call */
  async endCall() {
    this.sendSignal({ type: "ended", data: "{}" });
    const duration = this.elapsedTimer ? Math.floor((Date.now() - (this._startTime || Date.now())) / 1000) : 0;
    await supabase
      .from("call_logs")
      .update({
        status: "ended",
        ended_at: new Date().toISOString(),
        duration_seconds: duration,
        ended_by: this.role,
      } as any)
      .eq("id", this.callId);
    this.onStateChange({ status: "ended" });
    this.cleanup();
  }

  private _startTime: number | null = null;

  private startElapsedTimer() {
    this._startTime = Date.now();
    this.elapsedTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - (this._startTime || Date.now())) / 1000);
      this.onStateChange({ elapsed });
    }, 1000);
  }

  private async processSignal(signal: SignalPayload) {
    if (signal.type === "accepted") {
      // Caller received acceptance — create peer connection and wait for offer
      this.onStateChange({ status: "connecting" });
      this.createPeerConnection();
      this.startIceTimeout();
      this.startElapsedTimer();
    } else if (signal.type === "offer") {
      if (!this.pc) this.createPeerConnection();
      const offer = JSON.parse(signal.data);
      await this.pc!.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.pc!.createAnswer();
      await this.pc!.setLocalDescription(answer);
      this.sendSignal({ type: "answer", data: JSON.stringify(answer) });
    } else if (signal.type === "answer") {
      const answer = JSON.parse(signal.data);
      await this.pc!.setRemoteDescription(new RTCSessionDescription(answer));
    } else if (signal.type === "ice") {
      const candidate = JSON.parse(signal.data);
      await this.pc?.addIceCandidate(new RTCIceCandidate(candidate));
    } else if (signal.type === "declined") {
      this.onStateChange({ status: "declined" });
      await supabase
        .from("call_logs")
        .update({ status: "declined", ended_at: new Date().toISOString() } as any)
        .eq("id", this.callId);
      this.cleanup();
    } else if (signal.type === "ended") {
      this.onStateChange({ status: "ended" });
      this.cleanup();
    }
  }

  private createPeerConnection() {
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceTransportPolicy: "all" });
    this.remoteStream = new MediaStream();
    this.iceConnected = false;
    this.onStateChange({ remoteStream: this.remoteStream });

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.pc!.addTrack(track, this.localStream!);
      });
    }

    this.pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        this.remoteStream!.addTrack(track);
      });
      this.clearStreamTimeout();
      this.onStateChange({ remoteStream: this.remoteStream, status: "active" });
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({ type: "ice", data: JSON.stringify(event.candidate) });
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc?.iceConnectionState;
      if (state === "connected" || state === "completed") {
        this.iceConnected = true;
        this.clearIceTimeout();
        this.detectRelay();
      }
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      if (state === "connected") {
        this.iceConnected = true;
        this.clearIceTimeout();
        this.clearStreamTimeout();
        this.onStateChange({ status: "active" });
      } else if (state === "failed" || state === "disconnected") {
        if (!this.iceConnected) {
          this.onStateChange({
            status: "network_blocked",
            error: "Call could not connect. Your network may restrict internet calls.",
          });
        } else {
          this.onStateChange({ status: "failed", error: "Connection lost" });
        }
        this.cleanup();
      }
    };
  }

  private async detectRelay() {
    if (!this.pc) return;
    try {
      const stats = await this.pc.getStats();
      let usingRelay = false;
      stats.forEach((report) => {
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          stats.forEach((r) => {
            if (r.id === report.localCandidateId && r.candidateType === "relay") {
              usingRelay = true;
            }
          });
        }
      });
      this.onStateChange({ usingRelay });
    } catch { /* stats unavailable */ }
  }

  private startIceTimeout() {
    this.clearIceTimeout();
    this.iceTimer = setTimeout(() => {
      if (!this.iceConnected) {
        this.retryRelayOnly();
      }
    }, ICE_TIMEOUT_MS);

    this.streamTimer = setTimeout(() => {
      if (!this.iceConnected) {
        this.onStateChange({
          status: "network_blocked",
          error: "Unable to establish call. Your network may restrict internet calls.",
        });
        this.cleanup();
      }
    }, STREAM_TIMEOUT_MS);
  }

  private async retryRelayOnly() {
    if (!this.pc || this.iceConnected) return;
    try {
      const oldRemoteDesc = this.pc.remoteDescription;
      this.pc.close();
      this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceTransportPolicy: "relay" });
      this.remoteStream = new MediaStream();
      this.onStateChange({ remoteStream: this.remoteStream, usingRelay: true });

      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          this.pc!.addTrack(track, this.localStream!);
        });
      }

      this.pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
          this.remoteStream!.addTrack(track);
        });
        this.onStateChange({ remoteStream: this.remoteStream, status: "active" });
      };

      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignal({ type: "ice", data: JSON.stringify(event.candidate) });
        }
      };

      this.pc.onconnectionstatechange = () => {
        if (this.pc?.connectionState === "connected") {
          this.iceConnected = true;
          this.clearStreamTimeout();
          this.onStateChange({ status: "active", usingRelay: true });
        } else if (this.pc?.connectionState === "failed") {
          this.onStateChange({
            status: "network_blocked",
            error: "Internet calling unavailable on your network.",
          });
          this.cleanup();
        }
      };

      if (oldRemoteDesc) {
        await this.pc.setRemoteDescription(oldRemoteDesc);
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.sendSignal({ type: "answer", data: JSON.stringify(answer) });
      }
    } catch {
      // Stream timeout will handle
    }
  }

  private async setupMedia(isVideo: boolean) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });
      this.onStateChange({ localStream: this.localStream });
    } catch {
      this.onStateChange({
        status: "failed",
        error: "Microphone access denied. Please allow microphone access to make calls.",
      });
      throw new Error("Media permission denied");
    }
  }

  toggleMute(): boolean {
    if (!this.localStream) return false;
    const track = this.localStream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      return !track.enabled;
    }
    return false;
  }

  toggleVideo(): boolean {
    if (!this.localStream) return false;
    const track = this.localStream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      return !track.enabled;
    }
    return false;
  }

  toggleSpeaker(): boolean {
    // Speaker toggle is handled at the UI level via audio element
    return false;
  }

  cleanup() {
    if (this.iceTimer) clearTimeout(this.iceTimer);
    if (this.streamTimer) clearTimeout(this.streamTimer);
    if (this.elapsedTimer) clearInterval(this.elapsedTimer);
    this.iceTimer = null;
    this.streamTimer = null;
    this.elapsedTimer = null;
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.remoteStream = null;
    this.pc?.close();
    this.pc = null;
    this.iceConnected = false;
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
