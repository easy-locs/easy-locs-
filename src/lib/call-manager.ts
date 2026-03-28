/**
 * CallManager — Thin orchestrator composing atomic call units.
 * Units: ice-config, signaling, media, call-db, types
 */
import { getIceServers } from "./call/ice-config";
import { SignalingChannel } from "./call/signaling";
import { acquireMedia } from "./call/media";
import { markCallActive, markCallDeclined, markCallEnded } from "./call/call-db";
import type { CallState, CallRole, CallStatus, SignalPayload } from "./call/types";

export type { CallState, CallRole, CallStatus };

const ICE_TIMEOUT_MS = 15_000;
const STREAM_TIMEOUT_MS = 25_000;

export class CallManager {
  private pc: RTCPeerConnection | null = null;
  private signaling: SignalingChannel | null = null;
  private iceTimer: ReturnType<typeof setTimeout> | null = null;
  private streamTimer: ReturnType<typeof setTimeout> | null = null;
  private elapsedTimer: ReturnType<typeof setInterval> | null = null;
  private iceConnected = false;
  private role: CallRole;
  private callId: string;
  private userId: string;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private _startTime: number | null = null;
  private _isVideo = false;
  private _pendingCandidates: RTCIceCandidate[] = [];
  private _cleaned = false;
  private _ending = false;
  private _endFlowInvocations = 0;
  private _cleanupInvocations = 0;
  private _reconnectAttempts = 0;

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

  private debug(step: string, meta?: Record<string, unknown>) {
    console.log(`[CallManager][${this.role}][${this.callId}] ${step}`, meta || {});
  }

  private sendSignal(signal: Omit<SignalPayload, "from">) {
    this.signaling?.send(signal);
  }

  async startCall(isVideo: boolean) {
    this._isVideo = isVideo;
    this._cleaned = false;
    this._ending = false;
    this.debug("startCall", { isVideo });
    this.onStateChange({ status: "ringing", callId: this.callId, isVideo });

    this.signaling = new SignalingChannel(this.callId, this.userId, (s) => void this.processSignal(s));
    await this.signaling.join();
    await this.setupMedia(isVideo);
  }

  async acceptCall(isVideo: boolean) {
    this._isVideo = isVideo;
    this._cleaned = false;
    this._ending = false;
    this.debug("acceptCall", { isVideo });
    this.onStateChange({ status: "connecting", callId: this.callId, isVideo });

    this.signaling = new SignalingChannel(this.callId, this.userId, (s) => void this.processSignal(s));
    await this.signaling.join();
    await this.setupMedia(isVideo);

    await markCallActive(this.callId);

    this.sendSignal({ type: "accepted", data: "{}" });
    await this.createPeerConnection();
    const offer = await this.pc!.createOffer();
    await this.pc!.setLocalDescription(offer);
    this.sendSignal({ type: "offer", data: JSON.stringify(offer) });
    this.startIceTimeout();
    this.startElapsedTimer();
  }

  async declineCall() {
    this.debug("declineCall");
    this.sendSignal({ type: "declined", data: "{}" });
    await markCallDeclined(this.callId);
    this.onStateChange({ status: "declined" });
    this.cleanup("decline");
  }

  async endCall() {
    this._endFlowInvocations += 1;
    if (this._cleaned || this._ending) return;
    this._ending = true;
    this.debug("endCall start");

    try {
      this.sendSignal({ type: "ended", data: "{}" });
      const duration = this._startTime ? Math.floor((Date.now() - this._startTime) / 1000) : 0;
      await markCallEnded(this.callId, duration);
      this.onStateChange({ status: "ended" });
    } catch (err) {
      this.debug("endCall update failed", { error: String(err) });
    } finally {
      this.cleanup("end");
    }
  }

  private startElapsedTimer() {
    this._startTime = Date.now();
    this.elapsedTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - (this._startTime || Date.now())) / 1000);
      this.onStateChange({ elapsed });
    }, 1000);
  }

  private async processSignal(signal: SignalPayload) {
    try {
      if (signal.type === "accepted") {
        this.onStateChange({ status: "connecting" });
        await this.createPeerConnection();
        this.startIceTimeout();
        this.startElapsedTimer();
      } else if (signal.type === "offer") {
        if (!this.pc) await this.createPeerConnection();
        await this.pc!.setRemoteDescription(new RTCSessionDescription(JSON.parse(signal.data)));
        this.flushPendingCandidates();
        const answer = await this.pc!.createAnswer();
        await this.pc!.setLocalDescription(answer);
        this.sendSignal({ type: "answer", data: JSON.stringify(answer) });
      } else if (signal.type === "answer") {
        if (!this.pc) return;
        await this.pc!.setRemoteDescription(new RTCSessionDescription(JSON.parse(signal.data)));
        this.flushPendingCandidates();
      } else if (signal.type === "ice") {
        const candidate = new RTCIceCandidate(JSON.parse(signal.data));
        if (this.pc?.remoteDescription) {
          try { await this.pc.addIceCandidate(candidate); } catch {}
        } else {
          this._pendingCandidates.push(candidate);
        }
      } else if (signal.type === "declined") {
        this.onStateChange({ status: "declined" });
        await markCallDeclined(this.callId);
        this.cleanup("remote-declined");
      } else if (signal.type === "ended") {
        this.onStateChange({ status: "ended" });
        this.cleanup("remote-ended");
      }
    } catch (err) {
      this.debug("signal processing error", { type: signal.type, error: String(err) });
    }
  }

  private flushPendingCandidates() {
    for (const c of this._pendingCandidates) {
      try { this.pc?.addIceCandidate(c); } catch {}
    }
    this._pendingCandidates = [];
  }

  private async createPeerConnection() {
    if (this.pc) { try { this.pc.close(); } catch {} }

    const iceServers = await getIceServers();
    this.pc = new RTCPeerConnection({ iceServers, iceTransportPolicy: "all" });
    this.remoteStream = new MediaStream();
    this.iceConnected = false;
    this._pendingCandidates = [];
    this.onStateChange({ remoteStream: this.remoteStream });

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => this.pc!.addTrack(track, this.localStream!));
    }

    this.pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => this.remoteStream!.addTrack(track));
      this.clearTimeouts();
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
        this.clearTimeouts();
        void this.detectRelay();
      }
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      if (state === "connected") {
        this.iceConnected = true;
        this._reconnectAttempts = 0;
        this.clearTimeouts();
        this.onStateChange({ status: "active" });
      } else if (state === "disconnected") {
        if (this.iceConnected && this._reconnectAttempts < 3) {
          this._reconnectAttempts++;
          this.onStateChange({ error: "Reconnecting…" });
          this.attemptIceRestart();
        } else if (!this.iceConnected) {
          this.onStateChange({ status: "network_blocked", error: "CONNECTION_FAILED" });
          this.cleanup("connection-failed");
        }
      } else if (state === "failed") {
        if (this.iceConnected && this._reconnectAttempts < 3) {
          this._reconnectAttempts++;
          this.attemptIceRestart();
        } else {
          this.onStateChange({ status: "failed", error: "Connection lost" });
          this.cleanup("connection-failed");
        }
      }
    };
  }

  private attemptIceRestart() {
    try { this.pc?.restartIce(); } catch {}
  }

  private async detectRelay() {
    if (!this.pc) return;
    try {
      const stats = await this.pc.getStats();
      let usingRelay = false;
      stats.forEach((report) => {
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          stats.forEach((r) => {
            if (r.id === report.localCandidateId && r.candidateType === "relay") usingRelay = true;
          });
        }
      });
      this.onStateChange({ usingRelay });
    } catch {}
  }

  private clearTimeouts() {
    if (this.iceTimer) { clearTimeout(this.iceTimer); this.iceTimer = null; }
    if (this.streamTimer) { clearTimeout(this.streamTimer); this.streamTimer = null; }
  }

  private startIceTimeout() {
    this.clearTimeouts();
    this.iceTimer = setTimeout(() => {
      if (!this.iceConnected) void this.retryRelayOnly();
    }, ICE_TIMEOUT_MS);
    this.streamTimer = setTimeout(() => {
      if (!this.iceConnected) {
        this.onStateChange({ status: "network_blocked", error: "NETWORK_BLOCKED" });
        this.cleanup("stream-timeout");
      }
    }, STREAM_TIMEOUT_MS);
  }

  private async retryRelayOnly() {
    if (!this.pc || this.iceConnected) return;
    try {
      try { this.pc.close(); } catch {}

      const iceServers = await getIceServers();
      this.pc = new RTCPeerConnection({ iceServers, iceTransportPolicy: "relay" });
      this.remoteStream = new MediaStream();
      this._pendingCandidates = [];
      this.onStateChange({ remoteStream: this.remoteStream, usingRelay: true });

      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => this.pc!.addTrack(track, this.localStream!));
      }

      this.pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => this.remoteStream!.addTrack(track));
        this.onStateChange({ remoteStream: this.remoteStream, status: "active" });
      };

      this.pc.onicecandidate = (event) => {
        if (event.candidate) this.sendSignal({ type: "ice", data: JSON.stringify(event.candidate) });
      };

      this.pc.onconnectionstatechange = () => {
        const state = this.pc?.connectionState;
        if (state === "connected") {
          this.iceConnected = true;
          this.clearTimeouts();
          this.onStateChange({ status: "active", usingRelay: true });
        } else if (state === "failed") {
          this.onStateChange({ status: "network_blocked", error: "RELAY_FAILED" });
          this.cleanup("relay-retry-failed");
        }
      };

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.sendSignal({ type: "offer", data: JSON.stringify(offer) });
    } catch {}
  }

  private async setupMedia(isVideo: boolean) {
    try {
      const result = await acquireMedia(isVideo);
      this.localStream = result.stream;
      this.onStateChange({ localStream: this.localStream, isVideo: result.isVideo });
    } catch (err) {
      const isPermError = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "NotFoundError");
      this.onStateChange({
        status: "failed",
        error: isPermError ? (isVideo ? "CAMERA_MIC_DENIED" : "MIC_DENIED") : "MEDIA_UNAVAILABLE",
      });
      throw new Error("Media permission denied");
    }
  }

  toggleMute(): boolean {
    if (!this.localStream) return false;
    const tracks = this.localStream.getAudioTracks();
    if (tracks.length === 0) return false;
    const newEnabled = !tracks[0].enabled;
    tracks.forEach(track => { track.enabled = newEnabled; });
    return !newEnabled;
  }

  toggleVideo(): boolean {
    if (!this.localStream) return false;
    const track = this.localStream.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; return !track.enabled; }
    return false;
  }

  addVideoTrack(track: MediaStreamTrack) {
    if (!this.pc || !this.localStream) return;
    this.pc.addTrack(track, this.localStream);
    this._isVideo = true;
  }

  replaceVideoTrack(newTrack: MediaStreamTrack) {
    if (!this.pc) return;
    const videoSender = this.pc.getSenders().find(s => s.track?.kind === "video");
    if (videoSender) {
      videoSender.replaceTrack(newTrack).catch(() => {});
    } else {
      this.addVideoTrack(newTrack);
    }
  }

  toggleSpeaker(): boolean { return false; }

  cleanup(reason = "unknown") {
    if (this._cleaned) return;
    this._cleanupInvocations += 1;
    this._cleaned = true;
    this._ending = false;

    if (this.iceTimer) clearTimeout(this.iceTimer);
    if (this.streamTimer) clearTimeout(this.streamTimer);
    if (this.elapsedTimer) clearInterval(this.elapsedTimer);
    this.iceTimer = null;
    this.streamTimer = null;
    this.elapsedTimer = null;
    this._startTime = null;
    this._pendingCandidates = [];

    try { this.localStream?.getTracks().forEach((t) => t.stop()); } catch {}
    this.localStream = null;
    this.remoteStream = null;

    try { this.pc?.close(); } catch {}
    this.pc = null;
    this.iceConnected = false;

    this.signaling?.destroy();
    this.signaling = null;
  }
}
