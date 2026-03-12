/**
 * Guest WebRTC Call — Peer-to-peer encrypted calling for guest sessions.
 * Uses the guest-session edge function as a signaling relay.
 * WebRTC provides native SRTP/DTLS encryption for all media.
 */

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export type CallRole = "caller" | "callee";
export type CallStatus = "idle" | "requesting" | "ringing" | "connecting" | "active" | "ended" | "declined" | "failed";

export interface GuestCallState {
  status: CallStatus;
  callId: string | null;
  isVideo: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  error: string | null;
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
  private onStateChange: (state: Partial<GuestCallState>) => void;
  private role: CallRole;
  private callId: string | null = null;
  private token: string; // guest token or auth token
  private isGuest: boolean;
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
    // Start polling for answer
    this.startSignalPoll();
    return this.callId!;
  }

  /** Seller accepts call — creates answer */
  async acceptCall(callId: string, isVideo: boolean): Promise<void> {
    this.callId = callId;
    this.onStateChange({ status: "connecting", callId, isVideo });

    await this.setupMedia(isVideo);
    this.createPeerConnection();

    // Seller creates offer (callee in our flow creates offer since they accept)
    const offer = await this.pc!.createOffer();
    await this.pc!.setLocalDescription(offer);

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
  }

  /** Process incoming signals */
  private async processSignal(signalType: string, signalData: string) {
    if (!this.pc) {
      // Lazy init for guest when receiving offer
      const isVideo = false; // Will be updated
      await this.setupMedia(isVideo);
      this.createPeerConnection();
    }

    if (signalType === "offer") {
      const offer = JSON.parse(signalData);
      await this.pc!.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await this.pc!.createAnswer();
      await this.pc!.setLocalDescription(answer);

      await invokeSignal({
        action: "call_signal",
        call_id: this.callId,
        signal_type: "answer",
        signal_data: JSON.stringify(answer),
        from_role: this.role,
        token: this.isGuest ? this.token : undefined,
        auth_token: this.isGuest ? undefined : this.token,
      });
    } else if (signalType === "answer") {
      const answer = JSON.parse(signalData);
      await this.pc!.setRemoteDescription(new RTCSessionDescription(answer));
    } else if (signalType === "ice") {
      const candidate = JSON.parse(signalData);
      await this.pc!.addIceCandidate(new RTCIceCandidate(candidate));
    } else if (signalType === "declined" || signalType === "ended") {
      this.onStateChange({ status: signalType === "declined" ? "declined" : "ended" });
      this.cleanup();
    }
  }

  private createPeerConnection() {
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.remoteStream = new MediaStream();
    this.onStateChange({ remoteStream: this.remoteStream });

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.pc!.addTrack(track, this.localStream!);
      });
    }

    // Handle remote tracks
    this.pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        this.remoteStream!.addTrack(track);
      });
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

    this.pc.onconnectionstatechange = () => {
      if (this.pc?.connectionState === "connected") {
        this.onStateChange({ status: "active" });
      } else if (this.pc?.connectionState === "failed") {
        this.onStateChange({ status: "failed", error: "Connection failed" });
        this.cleanup();
      }
    };
  }

  private async setupMedia(isVideo: boolean) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });
      this.onStateChange({ localStream: this.localStream });
    } catch (err: any) {
      this.onStateChange({ status: "failed", error: "Camera/microphone permission denied" });
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
      return !audioTrack.enabled; // true = muted
    }
    return false;
  }

  /** Toggle video */
  toggleVideo(): boolean {
    if (!this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      return !videoTrack.enabled; // true = off
    }
    return false;
  }

  cleanup() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.pollTimer = null;
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.remoteStream = null;
    this.pc?.close();
    this.pc = null;
  }
}
