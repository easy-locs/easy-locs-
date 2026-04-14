import { getIceServers } from "./ice-config";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";
import { acquireMedia } from "./media";
import type {
  GroupCallParticipant,
  GroupCallStatus,
  GroupCallSignal,
} from "./group-call-types";
import { MAX_GROUP_PARTICIPANTS } from "./group-call-types";
import { NetworkQualityMonitor } from "./network-quality";

interface PeerConnection {
  pc: RTCPeerConnection;
  remoteStream: MediaStream;
  qualityMonitor: NetworkQualityMonitor;
}

export class GroupCallManager {
  private roomId: string;
  private userId: string;
  private localStream: MediaStream | null = null;
  private peers: Map<string, PeerConnection> = new Map();
  private channel: ReturnType<typeof createRealtimeChannel> | null = null;
  private elapsedTimer: ReturnType<typeof setInterval> | null = null;
  private startTime: number = 0;
  private _isVideo = false;
  private _cleaned = false;

  onParticipantJoined: ((p: GroupCallParticipant) => void) | null = null;
  onParticipantLeft: ((userId: string) => void) | null = null;
  onParticipantStateChanged: ((userId: string, updates: Partial<GroupCallParticipant>) => void) | null = null;
  onParticipantStreamUpdated: ((userId: string, stream: MediaStream) => void) | null = null;
  onStatusChange: ((status: GroupCallStatus) => void) | null = null;
  onLocalStream: ((stream: MediaStream) => void) | null = null;
  onElapsed: ((seconds: number) => void) | null = null;
  onError: ((error: string) => void) | null = null;

  constructor(roomId: string, userId: string) {
    this.roomId = roomId;
    this.userId = userId;
  }

  get participantCount(): number {
    return this.peers.size + 1;
  }

  get isAtCapacity(): boolean {
    return this.participantCount >= MAX_GROUP_PARTICIPANTS;
  }

  async createRoom(isVideo: boolean): Promise<void> {
    this._isVideo = isVideo;
    this._cleaned = false;
    this.onStatusChange?.("creating");

    await this.setupMedia(isVideo);
    await this.joinSignalingChannel();

    this.broadcastSignal({
      type: "join",
      from: this.userId,
      data: JSON.stringify({ isVideo, action: "create" }),
      roomId: this.roomId,
    });

    this.startElapsedTimer();
    this.onStatusChange?.("active");
  }

  async joinRoom(isVideo: boolean): Promise<void> {
    this._isVideo = isVideo;
    this._cleaned = false;
    this.onStatusChange?.("joining");

    await this.setupMedia(isVideo);
    await this.joinSignalingChannel();

    this.broadcastSignal({
      type: "join",
      from: this.userId,
      data: JSON.stringify({ isVideo, action: "join" }),
      roomId: this.roomId,
    });

    this.startElapsedTimer();
    this.onStatusChange?.("active");
  }

  async leaveRoom(): Promise<void> {
    if (this._cleaned) return;

    this.broadcastSignal({
      type: "leave",
      from: this.userId,
      data: "{}",
      roomId: this.roomId,
    });

    this.cleanup();
    this.onStatusChange?.("ended");
  }

  toggleMute(): boolean {
    if (!this.localStream) return false;
    const tracks = this.localStream.getAudioTracks();
    if (tracks.length === 0) return false;
    const newEnabled = !tracks[0].enabled;
    tracks.forEach((t) => (t.enabled = newEnabled));

    this.broadcastSignal({
      type: "mute_change",
      from: this.userId,
      data: JSON.stringify({ muted: !newEnabled }),
      roomId: this.roomId,
    });

    return !newEnabled;
  }

  toggleCamera(): boolean {
    if (!this.localStream) return false;
    const track = this.localStream.getVideoTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;

    this.broadcastSignal({
      type: "camera_change",
      from: this.userId,
      data: JSON.stringify({ cameraOn: track.enabled }),
      roomId: this.roomId,
    });

    return track.enabled;
  }

  async startScreenShare(): Promise<MediaStream | null> {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const videoTrack = screenStream.getVideoTracks()[0];
      videoTrack.addEventListener("ended", () => {
        this.stopScreenShare();
      });

      for (const [, peer] of this.peers) {
        const sender = peer.pc
          .getSenders()
          .find((s) => s.track?.kind === "video");
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }

      this.broadcastSignal({
        type: "screen_share",
        from: this.userId,
        data: JSON.stringify({ sharing: true }),
        roomId: this.roomId,
      });

      return screenStream;
    } catch {
      return null;
    }
  }

  async stopScreenShare(): Promise<void> {
    const localVideoTrack = this.localStream?.getVideoTracks()[0];
    if (!localVideoTrack) return;

    for (const [, peer] of this.peers) {
      const sender = peer.pc
        .getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender) {
        await sender.replaceTrack(localVideoTrack);
      }
    }

    this.broadcastSignal({
      type: "screen_share",
      from: this.userId,
      data: JSON.stringify({ sharing: false }),
      roomId: this.roomId,
    });
  }

  cleanup() {
    if (this._cleaned) return;
    this._cleaned = true;

    if (this.elapsedTimer) {
      clearInterval(this.elapsedTimer);
      this.elapsedTimer = null;
    }

    for (const [userId, peer] of this.peers) {
      peer.qualityMonitor.stop();
      try {
        peer.pc.close();
      } catch {}
      this.peers.delete(userId);
    }

    try {
      this.localStream?.getTracks().forEach((t) => t.stop());
    } catch {}
    this.localStream = null;

    if (this.channel) {
      try {
        removeRealtimeChannel(this.channel);
      } catch {}
      this.channel = null;
    }
  }

  private async setupMedia(isVideo: boolean) {
    const result = await acquireMedia(isVideo);
    this.localStream = result.stream;
    this._isVideo = result.isVideo;
    this.onLocalStream?.(this.localStream);
  }

  private async joinSignalingChannel() {
    this.channel = createRealtimeChannel(`group-call:${this.roomId}`, {
      config: { broadcast: { self: false } },
    });

    this.channel.on("broadcast", { event: "signal" }, ({ payload }) => {
      const signal = payload as GroupCallSignal;
      if (signal.from === this.userId) return;
      void this.handleSignal(signal);
    });

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Group call channel timeout")),
        10_000
      );
      this.channel!.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);
          resolve();
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          clearTimeout(timeout);
          reject(new Error(`Channel failed: ${status}`));
        }
      });
    });
  }

  private broadcastSignal(signal: GroupCallSignal) {
    if (!this.channel) return;
    void this.channel
      .send({
        type: "broadcast",
        event: "signal",
        payload: signal,
      })
      .catch(() => {});
  }

  private async handleSignal(signal: GroupCallSignal) {
    try {
      switch (signal.type) {
        case "join":
          await this.handlePeerJoin(signal);
          break;
        case "leave":
          this.handlePeerLeave(signal.from);
          break;
        case "offer":
          await this.handleOffer(signal);
          break;
        case "answer":
          await this.handleAnswer(signal);
          break;
        case "ice":
          await this.handleIce(signal);
          break;
        case "mute_change": {
          const muteData = JSON.parse(signal.data || "{}");
          this.onParticipantStateChanged?.(signal.from, { isMuted: muteData.muted });
          break;
        }
        case "camera_change": {
          const camData = JSON.parse(signal.data || "{}");
          this.onParticipantStateChanged?.(signal.from, { isCameraOn: camData.cameraOn });
          break;
        }
        case "screen_share": {
          const shareData = JSON.parse(signal.data || "{}");
          this.onParticipantStateChanged?.(signal.from, { isScreenSharing: shareData.sharing });
          break;
        }
      }
    } catch (err) {
      console.error("[GroupCallManager] Signal error:", err);
    }
  }

  private async handlePeerJoin(signal: GroupCallSignal) {
    if (this.isAtCapacity) return;
    if (this.peers.has(signal.from)) return;

    const pc = await this.createPeerConnection(signal.from);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.broadcastSignal({
      type: "offer",
      from: this.userId,
      to: signal.from,
      data: JSON.stringify(offer),
      roomId: this.roomId,
    });

    const joinData = JSON.parse(signal.data || "{}");
    this.onParticipantJoined?.({
      userId: signal.from,
      orbitId: signal.from,
      name: signal.from,
      isMuted: false,
      isCameraOn: joinData.isVideo || false,
      isScreenSharing: false,
      isSpeaking: false,
      stream: null,
      connectionState: "pending",
      joinedAt: Date.now(),
    });
  }

  private handlePeerLeave(userId: string) {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.qualityMonitor.stop();
      try {
        peer.pc.close();
      } catch {}
      this.peers.delete(userId);
    }
    this.onParticipantLeft?.(userId);
  }

  private async handleOffer(signal: GroupCallSignal) {
    if (signal.to && signal.to !== this.userId) return;

    let peerEntry = this.peers.get(signal.from);
    if (!peerEntry) {
      const pc = await this.createPeerConnection(signal.from);
      peerEntry = this.peers.get(signal.from)!;
    }

    const offer = new RTCSessionDescription(JSON.parse(signal.data));
    await peerEntry.pc.setRemoteDescription(offer);

    const answer = await peerEntry.pc.createAnswer();
    await peerEntry.pc.setLocalDescription(answer);

    this.broadcastSignal({
      type: "answer",
      from: this.userId,
      to: signal.from,
      data: JSON.stringify(answer),
      roomId: this.roomId,
    });
  }

  private async handleAnswer(signal: GroupCallSignal) {
    if (signal.to && signal.to !== this.userId) return;
    const peerEntry = this.peers.get(signal.from);
    if (!peerEntry) return;

    const answer = new RTCSessionDescription(JSON.parse(signal.data));
    await peerEntry.pc.setRemoteDescription(answer);
  }

  private async handleIce(signal: GroupCallSignal) {
    if (signal.to && signal.to !== this.userId) return;
    const peerEntry = this.peers.get(signal.from);
    if (!peerEntry) return;

    const candidate = new RTCIceCandidate(JSON.parse(signal.data));
    try {
      await peerEntry.pc.addIceCandidate(candidate);
    } catch {}
  }

  private async createPeerConnection(
    peerId: string
  ): Promise<RTCPeerConnection> {
    const iceServers = await getIceServers();
    const pc = new RTCPeerConnection({ iceServers, iceTransportPolicy: "all" });
    const remoteStream = new MediaStream();
    const qualityMonitor = new NetworkQualityMonitor();

    this.peers.set(peerId, { pc, remoteStream, qualityMonitor });

    if (this.localStream) {
      this.localStream
        .getTracks()
        .forEach((track) => pc.addTrack(track, this.localStream!));
    }

    pc.ontrack = (event) => {
      event.streams[0]
        ?.getTracks()
        .forEach((track) => remoteStream.addTrack(track));
      this.onParticipantStreamUpdated?.(peerId, remoteStream);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.broadcastSignal({
          type: "ice",
          from: this.userId,
          to: peerId,
          data: JSON.stringify(event.candidate),
          roomId: this.roomId,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        qualityMonitor.start(pc, (metrics) => {
          this.onParticipantStateChanged?.(peerId, {
            qualityLabel: metrics.qualityLabel,
          });
        });
      } else if (state === "disconnected" || state === "failed") {
        qualityMonitor.stop();
        if (state === "failed") {
          this.handlePeerLeave(peerId);
        }
      }
    };

    return pc;
  }

  private startElapsedTimer() {
    this.startTime = Date.now();
    this.elapsedTimer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      this.onElapsed?.(elapsed);
    }, 1000);
  }
}
