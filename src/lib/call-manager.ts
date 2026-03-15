/**
 * CallManager — Authenticated user-to-user WebRTC calling via Supabase Realtime.
 * Uses Realtime broadcast channels for signaling (instant, no polling).
 * Provides peer-to-peer encrypted audio/video calls between registered users.
 */
import { supabase } from "@/integrations/supabase/client";

/** Fallback STUN-only config (no TURN relay) */
const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/** Cached ICE servers fetched from backend */
let _cachedIceServers: RTCIceServer[] | null = null;
let _cacheExpiry = 0;

/** Fetch TURN credentials securely from backend edge function */
async function getIceServers(): Promise<RTCIceServer[]> {
  // Return cached if still valid (5 min TTL)
  if (_cachedIceServers && Date.now() < _cacheExpiry) {
    return _cachedIceServers;
  }

  try {
    const { data, error } = await supabase.functions.invoke("get-turn-credentials");
    if (error || !data?.iceServers) {
      console.warn("[CallManager] Failed to fetch TURN credentials, using STUN-only fallback", error);
      return FALLBACK_ICE_SERVERS;
    }
    _cachedIceServers = data.iceServers;
    _cacheExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
    return _cachedIceServers;
  } catch (err) {
    console.warn("[CallManager] TURN fetch error, using STUN-only fallback", err);
    return FALLBACK_ICE_SERVERS;
  }
}

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
    const { data: activatedRow, error: activatedError } = await supabase
      .from("call_logs")
      .update({ status: "active", started_at: new Date().toISOString() } as any)
      .eq("id", this.callId)
      .select("id,status,started_at")
      .maybeSingle();

    this.debug("acceptCall DB update", {
      updated: !!activatedRow,
      status: activatedRow?.status || null,
      startedAt: activatedRow?.started_at || null,
      error: activatedError?.message || null,
    });

    // Tell caller we accepted — caller will wait for our offer
    this.sendSignal({ type: "accepted", data: "{}" });

    // Callee creates the offer
    await this.createPeerConnection();
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
    const { data: declinedRow, error: declinedError } = await supabase
      .from("call_logs")
      .update({ status: "declined", ended_at: new Date().toISOString() } as any)
      .eq("id", this.callId)
      .neq("status", "declined")
      .select("id,status,ended_at")
      .maybeSingle();

    this.debug("declineCall DB update", {
      updated: !!declinedRow,
      status: declinedRow?.status || null,
      endedAt: declinedRow?.ended_at || null,
      error: declinedError?.message || null,
    });

    this.onStateChange({ status: "declined" });
    this.cleanup("decline");
  }

  /** End active call */
  async endCall() {
    this._endFlowInvocations += 1;

    if (this._cleaned || this._ending) {
      this.debug("endCall skipped", {
        cleaned: this._cleaned,
        ending: this._ending,
        endFlowInvocations: this._endFlowInvocations,
      });
      return;
    }

    this._ending = true;
    this.debug("endCall start", { endFlowInvocations: this._endFlowInvocations });

    try {
      this.sendSignal({ type: "ended", data: "{}" });

      const duration = this._startTime ? Math.floor((Date.now() - this._startTime) / 1000) : 0;
      const { data: endedRow, error: endedError } = await supabase
        .from("call_logs")
        .update({
          status: "ended",
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
          ended_by: this.role,
        } as any)
        .eq("id", this.callId)
        .neq("status", "ended")
        .select("id,status,ended_at,duration_seconds")
        .maybeSingle();

      this.debug("endCall DB update", {
        updated: !!endedRow,
        status: endedRow?.status || null,
        endedAt: endedRow?.ended_at || null,
        duration: endedRow?.duration_seconds ?? duration,
        error: endedError?.message || null,
      });

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
        await this.createPeerConnection();
        this.startIceTimeout();
        this.startElapsedTimer();
      } else if (signal.type === "offer") {
        // Caller receives the offer from callee
        if (!this.pc) await this.createPeerConnection();
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
          const { data: declinedRow, error: declinedError } = await supabase
            .from("call_logs")
            .update({ status: "declined", ended_at: new Date().toISOString() } as any)
            .eq("id", this.callId)
            .neq("status", "declined")
            .select("id,status,ended_at")
            .maybeSingle();

          this.debug("remote declined DB update", {
            updated: !!declinedRow,
            status: declinedRow?.status || null,
            endedAt: declinedRow?.ended_at || null,
            error: declinedError?.message || null,
          });
        } catch (err) {
          this.debug("declined status update failed", { error: String(err) });
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

  private async createPeerConnection() {
    if (this.pc) {
      try { this.pc.close(); } catch {}
    }

    const iceServers = await getIceServers();
    this.debug("createPeerConnection", { transport: "all", servers: iceServers.length });
    this.pc = new RTCPeerConnection({ iceServers, iceTransportPolicy: "all" });
    this.remoteStream = new MediaStream();
    this.iceConnected = false;
    this._pendingCandidates = [];
    this.onStateChange({ remoteStream: this.remoteStream });

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.pc!.addTrack(track, this.localStream!);
      });
      this.debug("local tracks added", {
        audioTracks: this.localStream.getAudioTracks().length,
        videoTracks: this.localStream.getVideoTracks().length,
      });
    }

    this.pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        this.remoteStream!.addTrack(track);
      });
      this.debug("remote track received", {
        streamTracks: event.streams[0]?.getTracks().length || 0,
        remoteTracks: this.remoteStream?.getTracks().length || 0,
        hasVideo: this.remoteStream?.getVideoTracks().length || 0,
        hasAudio: this.remoteStream?.getAudioTracks().length || 0,
      });
      this.clearTimeouts();
      this.onStateChange({ remoteStream: this.remoteStream, status: "active" });
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.debug("local ICE candidate", {
          candidateType: event.candidate.type,
          protocol: event.candidate.protocol,
        });
        this.sendSignal({ type: "ice", data: JSON.stringify(event.candidate) });
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc?.iceConnectionState;
      this.debug("iceConnectionState", { state });
      if (state === "connected" || state === "completed") {
        this.iceConnected = true;
        this.clearTimeouts();
        void this.detectRelay();
      }
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc?.connectionState;
      this.debug("connectionState", { state, iceConnected: this.iceConnected });

      if (state === "connected") {
        this.iceConnected = true;
        this._reconnectAttempts = 0;
        this.clearTimeouts();
        this.onStateChange({ status: "active" });
      } else if (state === "disconnected") {
        // Try ICE restart before giving up
        if (this.iceConnected && this._reconnectAttempts < 3) {
          this._reconnectAttempts++;
          this.debug("ICE disconnected — attempting restart", { attempt: this._reconnectAttempts });
          this.onStateChange({ error: "Reconnecting…" });
          this.attemptIceRestart();
        } else if (!this.iceConnected) {
          this.debug("ICE disconnected without ever connecting");
          this.onStateChange({
            status: "network_blocked",
            error: "CONNECTION_FAILED",
          });
          this.cleanup("connection-failed");
        }
        // If reconnect attempts exhausted, wait for 'failed' state
      } else if (state === "failed") {
        if (this.iceConnected && this._reconnectAttempts < 3) {
          this._reconnectAttempts++;
          this.debug("ICE failed — final restart attempt", { attempt: this._reconnectAttempts });
          this.attemptIceRestart();
        } else {
          this.onStateChange({ status: "failed", error: "Connection lost" });
          this.cleanup("connection-failed");
        }
      }
    };
  }

  private attemptIceRestart() {
    if (!this.pc) return;
    this.debug("attemptIceRestart");
    try {
      this.pc.restartIce();
    } catch (err) {
      this.debug("restartIce failed", { error: String(err) });
    }
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
      this.debug("relay detection", { usingRelay });
      this.onStateChange({ usingRelay });
    } catch {
      this.debug("relay detection unavailable");
    }
  }

  private clearTimeouts() {
    if (this.iceTimer) { clearTimeout(this.iceTimer); this.iceTimer = null; }
    if (this.streamTimer) { clearTimeout(this.streamTimer); this.streamTimer = null; }
  }

  private startIceTimeout() {
    this.clearTimeouts();
    this.debug("ICE timers started", { iceTimeoutMs: ICE_TIMEOUT_MS, streamTimeoutMs: STREAM_TIMEOUT_MS });

    this.iceTimer = setTimeout(() => {
      if (!this.iceConnected) {
        this.debug("ICE timeout reached, triggering relay retry");
        void this.retryRelayOnly();
      }
    }, ICE_TIMEOUT_MS);

    this.streamTimer = setTimeout(() => {
      if (!this.iceConnected) {
        this.debug("stream timeout — no connection established");
        this.onStateChange({
          status: "network_blocked",
          error: "NETWORK_BLOCKED",
        });
        this.cleanup("stream-timeout");
      }
    }, STREAM_TIMEOUT_MS);
  }

  private async retryRelayOnly() {
    if (!this.pc || this.iceConnected) return;
    this.debug("retryRelayOnly start");

    try {
      const oldPc = this.pc;
      try { oldPc.close(); } catch {}

      const iceServers = await getIceServers();
      this.pc = new RTCPeerConnection({ iceServers, iceTransportPolicy: "relay" });
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
        this.debug("remote track received (relay retry)", {
          remoteTracks: this.remoteStream?.getTracks().length || 0,
        });
        this.onStateChange({ remoteStream: this.remoteStream, status: "active" });
      };

      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.debug("local ICE candidate (relay retry)", {
            candidateType: event.candidate.type,
            protocol: event.candidate.protocol,
          });
          this.sendSignal({ type: "ice", data: JSON.stringify(event.candidate) });
        }
      };

      this.pc.onconnectionstatechange = () => {
        const state = this.pc?.connectionState;
        this.debug("connectionState (relay retry)", { state });

        if (state === "connected") {
          this.iceConnected = true;
          this.clearTimeouts();
          this.onStateChange({ status: "active", usingRelay: true });
        } else if (state === "failed") {
          this.onStateChange({
            status: "network_blocked",
            error: "Appels internet indisponibles sur ce réseau. Essayez un autre réseau.",
          });
          this.cleanup("relay-retry-failed");
        }
      };

      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.sendSignal({ type: "offer", data: JSON.stringify(offer) });
      this.debug("relay retry offer sent");
    } catch (err) {
      this.debug("relay retry failed", { error: String(err) });
    }
  }

  private async setupMedia(isVideo: boolean) {
    try {
      let stream: MediaStream;
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
        autoGainControl: { ideal: true },
        // Reduce sample rate on mobile to improve stability
        sampleRate: { ideal: 48000 },
        channelCount: { ideal: 1 },
      };

      if (isVideo) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: { facingMode: { ideal: "user" }, width: { ideal: 640 }, height: { ideal: 480 } },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: true });
        }
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
      }

      this.localStream = stream;

      // Force mic active at call start (requested behavior)
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });

      const audioTrack = this.localStream.getAudioTracks()[0];
      this.debug("media ready", {
        audioTracks: this.localStream.getAudioTracks().length,
        videoTracks: this.localStream.getVideoTracks().length,
        audioEnabled: audioTrack?.enabled ?? false,
        audioMuted: audioTrack?.muted ?? false,
      });
      this.onStateChange({ localStream: this.localStream, isVideo: this.localStream.getVideoTracks().length > 0 });
    } catch (err) {
      this.debug("getUserMedia failed", { error: String(err) });
      const isPermError = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "NotFoundError");
      this.onStateChange({
        status: "failed",
        error: isPermError
          ? (isVideo
            ? "Accès caméra/micro refusé. Autorisez l'accès dans les paramètres de votre navigateur."
            : "Accès micro refusé. Autorisez l'accès au microphone pour passer des appels.")
          : "Périphérique audio/vidéo indisponible. Vérifiez vos paramètres.",
      });
      throw new Error("Media permission denied");
    }
  }

  toggleMute(): boolean {
    if (!this.localStream) {
      this.debug("toggleMute: no local stream");
      return false;
    }
    const tracks = this.localStream.getAudioTracks();
    if (tracks.length === 0) {
      this.debug("toggleMute: no audio tracks");
      return false;
    }
    // Toggle ALL audio tracks to handle multi-track scenarios
    const newEnabled = !tracks[0].enabled;
    tracks.forEach(track => { track.enabled = newEnabled; });
    const isMuted = !newEnabled;
    this.debug("toggleMute", { enabled: newEnabled, isMuted, trackCount: tracks.length });
    return isMuted;
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

  /** Add a video track dynamically during an audio call */
  addVideoTrack(track: MediaStreamTrack) {
    if (!this.pc || !this.localStream) return;
    this.pc.addTrack(track, this.localStream);
    this._isVideo = true;
    this.debug("addVideoTrack", { trackId: track.id });
  }

  /** Replace the current video track (e.g., camera flip) */
  replaceVideoTrack(newTrack: MediaStreamTrack) {
    if (!this.pc) return;
    const senders = this.pc.getSenders();
    const videoSender = senders.find(s => s.track?.kind === "video");
    if (videoSender) {
      videoSender.replaceTrack(newTrack).catch(() => {});
      this.debug("replaceVideoTrack", { trackId: newTrack.id });
    } else {
      // No existing video sender, add new one
      this.addVideoTrack(newTrack);
    }
  }

  /** Toggle speaker output — delegates to UI layer since Web Audio routing
   *  requires HTMLAudioElement.setSinkId or AudioSession API */
  toggleSpeaker(): boolean {
    // Actual routing is done in InAppCallDialog via remoteAudioRef
    // This method exists for interface completeness
    return false;
  }

  cleanup(reason = "unknown") {
    if (this._cleaned) {
      this.debug("cleanup skipped", { reason, cleanupInvocations: this._cleanupInvocations });
      return;
    }

    this._cleanupInvocations += 1;
    this.debug("cleanup", { reason, cleanupInvocations: this._cleanupInvocations });
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
    this._channelReady = false;

    if (this.channel) {
      try { supabase.removeChannel(this.channel); } catch {}
      this.channel = null;
    }
  }
}
