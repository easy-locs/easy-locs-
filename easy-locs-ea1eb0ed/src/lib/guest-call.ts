/**
 * Guest WebRTC Call — Peer-to-peer encrypted calling for guest sessions.
 * Uses the guest-session edge function as a signaling relay.
 * WebRTC provides native SRTP/DTLS encryption for all media.
 *
 * UAE/GCC Network Resilience:
 * - TURN relay fallback for restricted networks
 * - ICE connection timeout with graceful degradation
 * - Automatic relay mode when direct P2P fails
 */

/** STUN + TURN servers for UAE/GCC resilience */
const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  // Free TURN relays (Metered.ca public TURN)
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

/** Timeout before declaring ICE connection failed (ms) */
const ICE_TIMEOUT_MS = 15_000;

/** Max time waiting for any remote stream (ms) */
const STREAM_TIMEOUT_MS = 25_000;

export type CallRole = "caller" | "callee";
export type CallStatus =
  | "idle"
  | "requesting"
  | "ringing"
  | "connecting"
  | "active"
  | "ended"
  | "declined"
  | "failed"
  | "network_blocked";

export type CallFailureReason =
  | "permission_denied"
  | "network_blocked"
  | "ice_timeout"
  | "connection_failed"
  | "unknown";

export interface GuestCallState {
  status: CallStatus;
  callId: string | null;
  isVideo: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  error: string | null;
  failureReason?: CallFailureReason;
  usingRelay?: boolean;
}

const invokeSignal = async (body: Record<string, unknown>) => {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/guest-session`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};

export class GuestCallManager {
  private pc: RTCPeerConnection | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private iceTimer: ReturnType<typeof setTimeout> | null = null;
  private streamTimer: ReturnType<typeof setTimeout> | null = null;
  onStateChange: (state: Partial<GuestCallState>) => void;
  private role: CallRole;
  private callId: string | null = null;
  private token: string;
  private isGuest: boolean;
  private iceConnected = false;
  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;

  constructor(opts: {
    token: string;
    isGuest: boolean;
    role: CallRole;
    onStateChange: (state: Partial<GuestCallState>) => void;
  }) {
    this.token = opts.token;
    this.isGuest = opts.isGuest;
    this.role = opts.role;
    this.onStateChange = opts.onStateChange;
  }

  /** Guest initiates a call request */
  async requestCall(isVideo: boolean): Promise<string> {
    this.onStateChange({ status: "requesting", isVideo });
    const data = await invokeSignal({
      action: "call_request",
      token: this.token,
      is_video: isVideo,
    });
    this.callId = data.call_id;
    this.onStateChange({ status: "ringing", callId: this.callId });
    this.startSignalPoll();
    return this.callId!;
  }

  /** Seller accepts call — creates offer */
  async acceptCall(callId: string, isVideo: boolean): Promise<void> {
    this.callId = callId;
    this.onStateChange({ status: "connecting", callId, isVideo });

    await this.setupMedia(isVideo);
    this.createPeerConnection();

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    await invokeSignal({
      action: "call_signal",
      call_id: callId,
      signal_type: "offer",
      signal_data: JSON.stringify(offer),
      from_role: "callee",
      auth_token: this.isGuest ? undefined : this.token,
      token: this.isGuest ? this.token : undefined,
    });

    this.startSignalPoll();
    this.startIceTimeout();
  }

  /** Process incoming signals */
  private async processSignal(signalType: string, signalData: string) {
    if (!this.pc) {
      const isVideo = false;
      await this.setupMedia(isVideo);
      this.createPeerConnection();
    }

    if (signalType === "offer") {
      const offer = JSON.parse(signalData);
      await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);

      await invokeSignal({
        action: "call_signal",
        call_id: this.callId,
        signal_type: "answer",
        signal_data: JSON.stringify(answer),
        from_role: this.role,
        token: this.isGuest ? this.token : undefined,
        auth_token: this.isGuest ? undefined : this.token,
      });

      this.startIceTimeout();
    } else if (signalType === "answer") {
      const answer = JSON.parse(signalData);
      await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
    } else if (signalType === "ice") {
      const candidate = JSON.parse(signalData);
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else if (signalType === "declined" || signalType === "ended") {
      this.onStateChange({ status: signalType === "declined" ? "declined" : "ended" });
      this.cleanup();
    }
  }

  private createPeerConnection() {
    this.pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      // Prefer relay for UAE/GCC restricted networks — try all then fall back
      iceTransportPolicy: "all",
    });
    this.remoteStream = new MediaStream();
    this.iceConnected = false;
    this.onStateChange({ remoteStream: this.remoteStream });

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.pc.addTrack(track, this.localStream);
      });
    }

    // Handle remote tracks
    this.pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        this.remoteStream!.addTrack(track);
      });
      this.clearStreamTimeout();
      this.onStateChange({ remoteStream: this.remoteStream, status: "active" });
    };

    // ICE candidates
    this.pc.onicecandidate = async (event) => {
      if (event.candidate) {
        try {
          await invokeSignal({
            action: "call_signal",
            call_id: this.callId,
            signal_type: "ice",
            signal_data: JSON.stringify(event.candidate),
            from_role: this.role,
            token: this.isGuest ? this.token : undefined,
            auth_token: this.isGuest ? undefined : this.token,
          });
        } catch { /* best effort */ }
      }
    };

    // Detect relay vs direct connection
    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc?.iceConnectionState;
      if (state === "connected" || state === "completed") {
        this.iceConnected = true;
        this.clearIceTimeout();
        this.detectRelayUsage();
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
          // Never connected — likely network blocked (UAE/GCC)
          this.onStateChange({
            status: "network_blocked",
            error: "Call could not connect. Your network may restrict internet calls.",
            failureReason: "network_blocked",
          });
        } else {
          this.onStateChange({
            status: "failed",
            error: "Connection lost",
            failureReason: "connection_failed",
          });
        }
        this.cleanup();
      }
    };
  }

  /** Detect if we're using a TURN relay */
  private async detectRelayUsage() {
    if (!this.pc) return;
    try {
      const stats = await this.pc.getStats();
      let usingRelay = false;
      stats.forEach((report) => {
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          // Check if the selected candidate is relay type
          stats.forEach((r) => {
            if (r.id === report.localCandidateId && r.candidateType === "relay") {
              usingRelay = true;
            }
          });
        }
      });
      this.onStateChange({ usingRelay });
    } catch { /* stats not available */ }
  }

  /** ICE timeout — if no connection after threshold, declare network issue */
  private startIceTimeout() {
    this.clearIceTimeout();
    this.iceTimer = setTimeout(() => {
      if (!this.iceConnected) {
        console.warn("[GuestCall] ICE timeout — network may be blocking WebRTC");
        // Try relay-only as last resort
        this.retryRelayOnly();
      }
    }, ICE_TIMEOUT_MS);

    // Also set stream timeout
    this.streamTimer = setTimeout(() => {
      if (!this.iceConnected) {
        this.onStateChange({
          status: "network_blocked",
          error: "Unable to establish call. Your network may restrict internet calls.",
          failureReason: "ice_timeout",
        });
        this.cleanup();
      }
    }, STREAM_TIMEOUT_MS);
  }

  /** Retry with relay-only transport policy */
  private async retryRelayOnly() {
    if (!this.pc || this.iceConnected) return;
    console.log("[GuestCall] Retrying with relay-only transport policy");

    try {
      // Close existing PC and recreate with relay-only
      const oldLocalDesc = this.pc.localDescription;
      const oldRemoteDesc = this.pc.remoteDescription;

      this.pc.close();
      this.pc = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
        iceTransportPolicy: "relay", // Force TURN relay
      });

      this.remoteStream = new MediaStream();
      this.onStateChange({ remoteStream: this.remoteStream, usingRelay: true });

      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          this.pc.addTrack(track, this.localStream);
        });
      }

      this.pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => {
          this.remoteStream!.addTrack(track);
        });
        this.onStateChange({ remoteStream: this.remoteStream, status: "active" });
      };

      this.pc.onicecandidate = async (event) => {
        if (event.candidate) {
          try {
            await invokeSignal({
              action: "call_signal",
              call_id: this.callId,
              signal_type: "ice",
              signal_data: JSON.stringify(event.candidate),
              from_role: this.role,
              token: this.isGuest ? this.token : undefined,
              auth_token: this.isGuest ? undefined : this.token,
            });
          } catch { /* best effort */ }
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
            error: "Internet calling is not available on your network. Please use chat or WhatsApp instead.",
            failureReason: "network_blocked",
          });
          this.cleanup();
        }
      };

      // Re-negotiate
      if (oldRemoteDesc) {
        await this.pc.setRemoteDescription(oldRemoteDesc);
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        await invokeSignal({
          action: "call_signal",
          call_id: this.callId,
          signal_type: "answer",
          signal_data: JSON.stringify(answer),
          from_role: this.role,
          token: this.isGuest ? this.token : undefined,
          auth_token: this.isGuest ? undefined : this.token,
        });
      }
    } catch (err) {
      console.error("[GuestCall] Relay retry failed:", err);
      // Don't fail here — the stream timeout will handle final failure
    }
  }

  private clearIceTimeout() {
    if (this.iceTimer) { clearTimeout(this.iceTimer); this.iceTimer = null; }
  }

  private clearStreamTimeout() {
    if (this.streamTimer) { clearTimeout(this.streamTimer); this.streamTimer = null; }
  }

  private async setupMedia(isVideo: boolean) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });
      this.onStateChange({ localStream: this.localStream });
    } catch (err: any) {
      this.onStateChange({
        status: "failed",
        error: "Camera/microphone permission denied",
        failureReason: "permission_denied",
      });
      throw err;
    }
  }

  private startSignalPoll() {
    this.pollTimer = setInterval(async () => {
      try {
        const data = await invokeSignal({
          action: "call_poll",
          call_id: this.callId,
          role: this.role,
          token: this.isGuest ? this.token : undefined,
          auth_token: this.isGuest ? undefined : this.token,
        });

        if (data.signals && data.signals.length > 0) {
          for (const sig of data.signals) {
            await this.processSignal(sig.signal_type, sig.signal_data);
          }
        }

        if (data.call_status === "declined" || data.call_status === "ended") {
          this.onStateChange({ status: data.call_status });
          this.cleanup();
        }
      } catch { /* silent */ }
    }, 1000);
  }

  /** Decline an incoming call (seller) */
  async declineCall(callId: string) {
    await invokeSignal({
      action: "call_signal",
      call_id: callId,
      signal_type: "declined",
      signal_data: "{}",
      from_role: "callee",
      auth_token: this.isGuest ? undefined : this.token,
      token: this.isGuest ? this.token : undefined,
    });
  }

  /** End active call */
  async endCall() {
    if (this.callId) {
      try {
        await invokeSignal({
          action: "call_signal",
          call_id: this.callId,
          signal_type: "ended",
          signal_data: "{}",
          from_role: this.role,
          token: this.isGuest ? this.token : undefined,
          auth_token: this.isGuest ? undefined : this.token,
        });
      } catch { /* best effort */ }
    }
    this.onStateChange({ status: "ended" });
    this.cleanup();
  }

  /** Toggle mute */
  toggleMute(): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      return !audioTrack.enabled;
    }
    return false;
  }

  /** Toggle video */
  toggleVideo(): boolean {
    if (!this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return !videoTrack.enabled;
    }
    return false;
  }

  cleanup() {
    this.clearIceTimeout();
    this.clearStreamTimeout();
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.remoteStream = null;
    this.pc?.close();
    this.pc = null;
    this.iceConnected = false;
  }
}
