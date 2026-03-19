import { getRtcConfiguration } from "@/lib/calls/call-config";
import { debugLog } from "@/lib/debug/runtime-debug-bus";
import { safeErrorMessage } from "@/lib/debug/debug-helpers";

export class WebRtcCallManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream = new MediaStream();
  private remoteAudioEl: HTMLAudioElement | null = null;
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
      this.attachRemoteAudio();
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

  private attachRemoteAudio() {
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
  }

  async startLocalMedia(video = false) {
    try {
      await this.ensurePc();
      debugLog.info("call", "local_media_start", `video=${video}`);

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video,
      });

      for (const track of this.localStream.getTracks()) {
        this.pc!.addTrack(track, this.localStream);
      }

      debugLog.success("call", "local_media_success", "Local stream ready", {
        tracks: this.localStream.getTracks().map((t) => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState,
        })),
      });

      return this.localStream;
    } catch (e) {
      debugLog.error("call", "local_media_error", safeErrorMessage(e));
      throw e;
    }
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
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.remoteStream.getTracks().forEach((t) => t.stop());
    this.pc?.close();
    this.pc = null;
    this.localStream = null;
    this.remoteStream = new MediaStream();
    this.initialized = false;

    if (this.remoteAudioEl) {
      this.remoteAudioEl.srcObject = null;
      this.remoteAudioEl.remove();
      this.remoteAudioEl = null;
    }
  }
}
