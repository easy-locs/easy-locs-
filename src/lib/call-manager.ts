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
  private _startTime: number | null = null;
  private _isVideo = false;
  private _channelReady = false;
  private _pendingCandidates: RTCIceCandidate[] = [];
  private _cleaned = false;
  private _ending = false;

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

  /** Join the Realtime broadcast channel for signaling — MUST await */
  private async joinSignalChannel(): Promise<void> {
    this.channel = supabase.channel(`call:${this.callId}`, {
      config: { broadcast: { self: false } },
    });

    this.channel.on("broadcast", { event: "signal" }, ({ payload }) => {
      const signal = payload as SignalPayload;
      if (signal.from === this.userId) return;
      this.debug("signal received", { type: signal.type, from: signal.from });
      void this.processSignal(signal);
    });

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.debug("channel subscribe timeout");
        reject(new Error("Channel subscription timeout"));
      }, 10_000);

      this.channel!.subscribe((status) => {
        this.debug("channel status", { status });
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);
          this._channelReady = true;
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          clearTimeout(timeout);
          reject(new Error(`Channel subscription failed: ${status}`));
        }
      });
    });
  }

  private sendSignal(signal: Omit<SignalPayload, "from">) {
    if (!this._channelReady || !this.channel) {
      this.debug("signal dropped (channel not ready)", { type: signal.type });
      return;
    }

    void this.channel
      .send({
        type: "broadcast",
        event: "signal",
        payload: { ...signal, from: this.userId } as SignalPayload,
      })
      .then((result) => this.debug("signal sent", { type: signal.type, result }))
      .catch((err) => this.debug("signal send failed", { type: signal.type, error: String(err) }));
  }

  /** Caller: initiate call */
  async startCall(isVideo: boolean) {
    this._isVideo = isVideo;
    this._cleaned = false;
    this._ending = false;
    this.debug("startCall", { isVideo });
    this.onStateChange({ status: "ringing", callId: this.callId, isVideo });
    await this.joinSignalChannel();
    await this.setupMedia(isVideo);
    // Wait for callee "accepted" signal → then callee sends offer → caller answers
  }

  /** Callee: accept incoming call */
  async acceptCall(isVideo: boolean) {
    this._isVideo = isVideo;
    this._cleaned = false;
    this._ending = false;
    this.debug("acceptCall", { isVideo });
    this.onStateChange({ status: "connecting", callId: this.callId, isVideo });
    await this.joinSignalChannel();
    await this.setupMedia(isVideo);

    // Update call_logs status
    await supabase
      .from("call_logs")
      .update({ status: "active", started_at: new Date().toISOString() } as any)
      .eq("id", this.callId);

    // Tell caller we accepted — caller will wait for our offer
    this.sendSignal({ type: "accepted", data: "{}" });

    // Callee creates the offer
    this.createPeerConnection();
    const offer = await this.pc!.createOffer();
    await this.pc!.setLocalDescription(offer);
    this.sendSignal({ type: "offer", data: JSON.stringify(offer) });
    this.startIceTimeout();
    this.startElapsedTimer();
  }

  /** Decline call */
  async declineCall() {
    this.debug("declineCall");
    this.sendSignal({ type: "declined", data: "{}" });
    await supabase
      .from("call_logs")
      .update({ status: "declined", ended_at: new Date().toISOString() } as any)
      .eq("id", this.callId)
      .neq("status", "declined");
    this.onStateChange({ status: "declined" });
    this.cleanup("decline");
  }

  /** End active call */
  async endCall() {
    if (this._cleaned || this._ending) {
      this.debug("endCall skipped", { cleaned: this._cleaned, ending: this._ending });
      return;
    }

    this._ending = true;
    this.debug("endCall start");

    try {
      this.sendSignal({ type: "ended", data: "{}" });

      const duration = this._startTime ? Math.floor((Date.now() - this._startTime) / 1000) : 0;
      await supabase
        .from("call_logs")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
          ended_by: this.role,
        } as any)
        .eq("id", this.callId)
        .neq("status", "ended");

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
      this.debug("processing signal", { type: signal.type });

      if (signal.type === "accepted") {
        // Caller received acceptance — prepare PC and wait for callee's offer
        this.onStateChange({ status: "connecting" });
        this.createPeerConnection();
        this.startIceTimeout();
        this.startElapsedTimer();
      } else if (signal.type === "offer") {
        // Caller receives the offer from callee
        if (!this.pc) this.createPeerConnection();
        const offer = JSON.parse(signal.data);
        await this.pc!.setRemoteDescription(new RTCSessionDescription(offer));

        const pendingCount = this._pendingCandidates.length;
        for (const c of this._pendingCandidates) {
          try { await this.pc!.addIceCandidate(c); } catch { /* ignore late candidates */ }
        }
        this._pendingCandidates = [];
        this.debug("pending ICE flushed after offer", { count: pendingCount });

        const answer = await this.pc!.createAnswer();
        await this.pc!.setLocalDescription(answer);
        this.sendSignal({ type: "answer", data: JSON.stringify(answer) });
      } else if (signal.type === "answer") {
        if (!this.pc) return;
        const answer = JSON.parse(signal.data);
        await this.pc!.setRemoteDescription(new RTCSessionDescription(answer));

        const pendingCount = this._pendingCandidates.length;
        for (const c of this._pendingCandidates) {
          try { await this.pc!.addIceCandidate(c); } catch { /* ignore */ }
        }
        this._pendingCandidates = [];
        this.debug("pending ICE flushed after answer", { count: pendingCount });
      } else if (signal.type === "ice") {
        const candidate = new RTCIceCandidate(JSON.parse(signal.data));
        if (this.pc?.remoteDescription) {
          try {
            await this.pc.addIceCandidate(candidate);
            this.debug("ICE candidate applied");
          } catch {
            this.debug("ICE candidate apply failed");
          }
        } else {
          this._pendingCandidates.push(candidate);
          this.debug("ICE candidate queued", { pending: this._pendingCandidates.length });
        }
      } else if (signal.type === "declined") {
        this.onStateChange({ status: "declined" });
        try {
          await supabase
            .from("call_logs")
            .update({ status: "declined", ended_at: new Date().toISOString() } as any)
            .eq("id", this.callId)
            .neq("status", "declined");
        } catch {
          this.debug("declined status update failed");
        }
        this.cleanup("remote-declined");
      } else if (signal.type === "ended") {
        this.onStateChange({ status: "ended" });
        this.cleanup("remote-ended");
      }
    } catch (err) {
      this.debug("signal processing error", { type: signal.type, error: String(err) });
    }
  }

  private createPeerConnection() {
    if (this.pc) {
      try { this.pc.close(); } catch {}
    }
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceTransportPolicy: "all" });
    this.remoteStream = new MediaStream();
    this.iceConnected = false;
    this._pendingCandidates = [];
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
        this.detectRelay();
      }
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      if (state === "connected") {
        this.iceConnected = true;
        this.clearTimeouts();
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

  private clearTimeouts() {
    if (this.iceTimer) { clearTimeout(this.iceTimer); this.iceTimer = null; }
    if (this.streamTimer) { clearTimeout(this.streamTimer); this.streamTimer = null; }
  }

  private startIceTimeout() {
    this.clearTimeouts();
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
    console.log("[CallManager] Retrying with relay-only transport");
    try {
      // Close old PC
      const oldPc = this.pc;
      try { oldPc.close(); } catch {}
      
      // Create relay-only PC
      this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS, iceTransportPolicy: "relay" });
      this.remoteStream = new MediaStream();
      this._pendingCandidates = [];
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
          this.clearTimeouts();
          this.onStateChange({ status: "active", usingRelay: true });
        } else if (this.pc?.connectionState === "failed") {
          this.onStateChange({
            status: "network_blocked",
            error: "Internet calling unavailable on your network.",
          });
          this.cleanup();
        }
      };

      // Re-negotiate: create a new offer and send it
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.sendSignal({ type: "offer", data: JSON.stringify(offer) });
    } catch (err) {
      console.error("[CallManager] Relay retry failed:", err);
      // Stream timeout will handle final fallback
    }
  }

  private async setupMedia(isVideo: boolean) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });
      this.onStateChange({ localStream: this.localStream });
    } catch (err) {
      console.error("[CallManager] getUserMedia failed:", err);
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
    return false;
  }

  cleanup() {
    if (this._cleaned) return;
    this._cleaned = true;
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
    this._channelReady = false;
    if (this.channel) {
      try { supabase.removeChannel(this.channel); } catch {}
      this.channel = null;
    }
  }
}
