/**
 * WebRTC Call Manager — Manages peer connections for voice/video calls.
 */

export class WebRtcCallManager {
  private pc: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream = new MediaStream();

  constructor(
    iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }]
  ) {
    this.pc = new RTCPeerConnection({ iceServers });
    this.pc.ontrack = (event) => {
      for (const track of event.streams[0].getTracks()) {
        this.remoteStream.addTrack(track);
      }
    };
  }

  async startLocalMedia(video = false) {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video,
    });
    for (const track of this.localStream.getTracks()) {
      this.pc.addTrack(track, this.localStream);
    }
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }

  onIceCandidate(handler: (candidate: RTCIceCandidate) => void) {
    this.pc.onicecandidate = (event) => {
      if (event.candidate) handler(event.candidate);
    };
  }

  async createOffer() {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(remoteOffer: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(remoteOffer);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async applyAnswer(answer: RTCSessionDescriptionInit) {
    await this.pc.setRemoteDescription(answer);
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    await this.pc.addIceCandidate(candidate);
  }

  setMuted(muted: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = !muted));
  }

  stopVideo(disabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = !disabled));
  }

  destroy() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.remoteStream.getTracks().forEach((t) => t.stop());
    this.pc.close();
  }
}
