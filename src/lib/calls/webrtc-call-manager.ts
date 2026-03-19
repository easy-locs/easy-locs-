import { getRtcConfiguration } from "@/lib/calls/call-config";
import { debugLog } from "@/lib/debug/runtime-debug-bus";
import { safeErrorMessage } from "@/lib/debug/debug-helpers";
import { clearFrameEncryptionKey } from "@/lib/calls/call-media-key";
import { resetReplayGuard } from "@/lib/calls/call-replay-guard";

export interface MediaStatus {
  cameraReady: boolean;
  audioReady: boolean;
  fallbackActive: boolean;
  error: string | null;
}

const mediaStatusListeners = new Set<(s: MediaStatus) => void>();
let currentMediaStatus: MediaStatus = {
  cameraReady: false,
  audioReady: false,
  fallbackActive: false,
  error: null,
};

function setMediaStatus(patch: Partial<MediaStatus>) {
  currentMediaStatus = { ...currentMediaStatus, ...patch };
  mediaStatusListeners.forEach((fn) => fn(currentMediaStatus));
}

export function subscribeMediaStatus(fn: (s: MediaStatus) => void) {
  mediaStatusListeners.add(fn);
  fn(currentMediaStatus);
  return () => { mediaStatusListeners.delete(fn); };
}

export function getMediaStatus() {
  return currentMediaStatus;
}

export class WebRtcCallManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream = new MediaStream();
  private remoteAudioEl: HTMLAudioElement | null = null;
  private remoteVideoEl: HTMLVideoElement | null = null;
  private initialized = false;

  private async ensurePc() {
    if (this.pc && this.initialized) return;

    const rtcConfig = await getRtcConfiguration();
    debugLog.info("call", "pc_init_start", "Creating RTCPeerConnection", rtcConfig);

    this.pc = new RTCPeerConnection(rtcConfig);

    this.pc.ontrack = (event) => {
      debugLog.success("call", "pc_ontrack", "Remote track received", {
        tracks: event.streams[0]?.getTracks()?.map((t) => t.kind),
      });
      for (const track of event.streams[0].getTracks()) {
        this.remoteStream.addTrack(track);
      }
      this.attachRemoteMedia();
    };

    this.pc.oniceconnectionstatechange = () => {
      debugLog.info("call", "pc_ice_state", this.pc?.iceConnectionState ?? "unknown");
    };

    this.pc.onconnectionstatechange = () => {
      debugLog.info("call", "pc_connection_state", this.pc?.connectionState ?? "unknown");
    };

    this.initialized = true;
    debugLog.success("call", "pc_init_success", "RTCPeerConnection ready");
  }

  private attachRemoteMedia() {
    // Audio
    if (!this.remoteAudioEl) {
      this.remoteAudioEl = document.createElement("audio");
      this.remoteAudioEl.autoplay = true;
      (this.remoteAudioEl as any).playsInline = true;
      this.remoteAudioEl.style.display = "none";
      document.body.appendChild(this.remoteAudioEl);
    }
    this.remoteAudioEl.srcObject = this.remoteStream;
    this.remoteAudioEl.play().catch((err) => {
      debugLog.warn("call", "remote_audio_autoplay_blocked", safeErrorMessage(err));
    });

    // Video — attach to any registered video element
    if (this.remoteVideoEl) {
      this.remoteVideoEl.srcObject = this.remoteStream;
      this.remoteVideoEl.autoplay = true;
      (this.remoteVideoEl as any).playsInline = true;
      this.remoteVideoEl.play().catch(() => {});
      debugLog.success("call", "remote_video_attached", "Remote video stream attached");
    }
  }

  /**
   * Start local media with progressive fallback for mobile Safari.
   * 1. Try optimal constraints (echoCancellation, facingMode, 1280x720)
   * 2. Fallback to simple { audio: true, video: true }
   * 3. Fallback to audio-only
   */
  async startLocalMedia(video = false): Promise<MediaStream> {
    try {
      await this.ensurePc();

      setMediaStatus({ cameraReady: false, audioReady: false, fallbackActive: false, error: null });
      debugLog.info("call", "camera_request_start", `video=${video}`);

      let stream: MediaStream;

      if (video) {
        stream = await this.tryVideoWithFallback();
      } else {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        setMediaStatus({ audioReady: true });
      }

      this.localStream = stream;

      for (const track of this.localStream.getTracks()) {
        this.pc!.addTrack(track, this.localStream);
      }

      const hasVideo = this.localStream.getVideoTracks().length > 0;
      const hasAudio = this.localStream.getAudioTracks().length > 0;

      setMediaStatus({
        cameraReady: hasVideo,
        audioReady: hasAudio,
        error: null,
      });

      debugLog.success("call", "camera_request_success", "Local stream ready", {
        tracks: this.localStream.getTracks().map((t) => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
        })),
      });

      return this.localStream;
    } catch (e) {
      const msg = safeErrorMessage(e);
      debugLog.error("call", "camera_request_failed", msg);
      setMediaStatus({ error: msg, cameraReady: false, audioReady: false });
      throw e;
    }
  }

  private async tryVideoWithFallback(): Promise<MediaStream> {
    // Step 1: Optimal constraints
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      debugLog.success("call", "camera_request_success", "Optimal video constraints OK");
      return stream;
    } catch (err1) {
      debugLog.warn("call", "camera_request_fallback", `Optimal failed: ${safeErrorMessage(err1)}, trying simple`);
    }

    // Step 2: Simple constraints
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      debugLog.success("call", "camera_request_success", "Simple video constraints OK");
      return stream;
    } catch (err2) {
      debugLog.warn("call", "camera_request_fallback", `Simple video failed: ${safeErrorMessage(err2)}, falling back to audio-only`);
    }

    // Step 3: Audio-only fallback
    setMediaStatus({ fallbackActive: true, error: "Camera unavailable, continuing with audio only" });
    debugLog.warn("call", "camera_request_fallback", "Audio-only fallback active");

    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
  }

  /** Register a video element for local preview */
  attachLocalVideo(el: HTMLVideoElement | null) {
    if (!el || !this.localStream) return;
    el.srcObject = this.localStream;
    el.muted = true;
    el.autoplay = true;
    (el as any).playsInline = true;
    el.play().catch(() => {});
    debugLog.success("call", "local_video_attached", "Local video element attached");
  }

  /** Register a video element for remote video */
  attachRemoteVideo(el: HTMLVideoElement | null) {
    this.remoteVideoEl = el;
    if (el && this.remoteStream.getTracks().length > 0) {
      el.srcObject = this.remoteStream;
      el.autoplay = true;
      (el as any).playsInline = true;
      el.play().catch(() => {});
      debugLog.success("call", "remote_video_attached", "Remote video element attached");
    }
  }

  /** Dynamically add video track to an active call */
  async addVideoTrack(): Promise<boolean> {
    if (!this.pc) return false;
    try {
      debugLog.info("call", "camera_request_start", "Adding video track dynamically");
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      const videoTrack = videoStream.getVideoTracks()[0];
      if (!videoTrack) return false;

      this.pc.addTrack(videoTrack, this.localStream ?? videoStream);
      if (this.localStream) {
        this.localStream.addTrack(videoTrack);
      }
      setMediaStatus({ cameraReady: true, fallbackActive: false, error: null });
      debugLog.success("call", "camera_request_success", "Video track added dynamically");
      return true;
    } catch (e) {
      const msg = safeErrorMessage(e);
      debugLog.error("call", "camera_request_failed", `Dynamic video add failed: ${msg}`);
      setMediaStatus({ error: `Camera toggle failed: ${msg}` });
      return false;
    }
  }

  /** Remove video tracks */
  removeVideoTracks() {
    this.localStream?.getVideoTracks().forEach((t) => {
      t.stop();
      this.localStream?.removeTrack(t);
    });
    setMediaStatus({ cameraReady: false });
    debugLog.info("call", "local_video_toggle", "Video tracks removed");
  }

  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }

  async onIceCandidate(handler: (candidate: RTCIceCandidate) => void) {
    await this.ensurePc();
    this.pc!.onicecandidate = (event) => {
      if (event.candidate) {
        debugLog.info("call", "emit_ice_candidate", event.candidate.candidate);
        handler(event.candidate);
      }
    };
  }

  async createOffer() {
    await this.ensurePc();
    const offer = await this.pc!.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.pc!.setLocalDescription(offer);
    debugLog.success("call", "offer_created", "Local offer set");
    return offer;
  }

  async createAnswer(remoteOffer: RTCSessionDescriptionInit) {
    await this.ensurePc();
    await this.pc!.setRemoteDescription(remoteOffer);
    debugLog.success("call", "remote_offer_applied", "Offer applied");
    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);
    debugLog.success("call", "answer_created", "Local answer set");
    return answer;
  }

  async applyAnswer(answer: RTCSessionDescriptionInit) {
    await this.ensurePc();
    await this.pc!.setRemoteDescription(answer);
    debugLog.success("call", "remote_answer_applied", "Answer applied");
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    await this.ensurePc();
    try {
      await this.pc!.addIceCandidate(candidate);
      debugLog.success("call", "remote_ice_added", "ICE candidate added");
    } catch (e) {
      debugLog.warn("call", "remote_ice_add_failed", safeErrorMessage(e));
    }
  }

  setMuted(muted: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
    debugLog.info("call", "local_audio_toggle", `muted=${muted}`);
  }

  setVideoEnabled(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => {
      t.enabled = enabled;
    });
    debugLog.info("call", "local_video_toggle", `enabled=${enabled}`);
  }

  destroy() {
    debugLog.warn("call", "pc_destroy", "Destroying call manager");

    // Stop all local tracks
    this.localStream?.getTracks().forEach((t) => {
      t.stop();
      debugLog.info("call", "camera_stopped", `${t.kind} track stopped`);
    });

    // Stop all remote tracks
    this.remoteStream.getTracks().forEach((t) => t.stop());

    // Close peer connection
    this.pc?.close();
    this.pc = null;
    this.localStream = null;
    this.remoteStream = new MediaStream();
    this.initialized = false;

    // Reset media status
    setMediaStatus({ cameraReady: false, audioReady: false, fallbackActive: false, error: null });

    // Cleanup audio element
    if (this.remoteAudioEl) {
      this.remoteAudioEl.srcObject = null;
      this.remoteAudioEl.remove();
      this.remoteAudioEl = null;
    }

    // Cleanup video element
    if (this.remoteVideoEl) {
      this.remoteVideoEl.srcObject = null;
      this.remoteVideoEl = null;
    }
  }
}

/**
 * Setup visibility change listener to cleanup stale calls on background.
 */
export function setupVisibilityCleanup(getManager: () => WebRtcCallManager | null, getCallState: () => string | null) {
  const handler = () => {
    if (document.visibilityState === "hidden") {
      const state = getCallState();
      // If call already ended/rejected/failed, cleanup immediately
      if (state && ["ended", "rejected", "failed"].includes(state)) {
        const mgr = getManager();
        if (mgr) {
          debugLog.warn("call", "visibility_cleanup", "Cleaning up ended call on background");
          mgr.destroy();
        }
      }
    }
  };
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}
