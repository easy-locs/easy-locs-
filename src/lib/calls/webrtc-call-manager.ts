/**
 * WebRTC Call Manager — Manages peer connections for voice/video calls.
 */
import { getRtcConfiguration } from "@/lib/calls/call-config";

export class WebRtcCallManager {
  private pc: RTCPeerConnection | null = null;
  private initialized = false;
  private localStream: MediaStream | null = null;
  private remoteStream = new MediaStream();

  private async ensurePc() {
    if (this.initialized && this.pc) return;

    const config = await getRtcConfiguration();
    this.pc = new RTCPeerConnection(config);

    this.pc.ontrack = (event) => {
      for (const track of event.streams[0].getTracks()) {
        this.remoteStream.addTrack(track);
      }
    };

    this.initialized = true;
  }

  async startLocalMedia(video = false) {
    await this.ensurePc();

    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video,
    });

    for (const track of this.localStream.getTracks()) {
      this.pc!.addTrack(track, this.localStream);
    }

    return this.localStream;
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
      if (event.candidate) handler(event.candidate);
    };
  }

  async createOffer() {
    await this.ensurePc();
    const offer = await this.pc!.createOffer();
    await this.pc!.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(remoteOffer: RTCSessionDescriptionInit) {
    await this.ensurePc();
    await this.pc!.setRemoteDescription(remoteOffer);
    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);
    return answer;
  }

  async applyAnswer(answer: RTCSessionDescriptionInit) {
    await this.ensurePc();
    await this.pc!.setRemoteDescription(answer);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    await this.ensurePc();
    await this.pc!.addIceCandidate(candidate);
  }

  setMuted(muted: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }

  setVideoEnabled(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }

  destroy() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.remoteStream.getTracks().forEach((t) => t.stop());
    this.pc?.close();
    this.pc = null;
    this.localStream = null;
    this.remoteStream = new MediaStream();
    this.initialized = false;
  }
}
