/**
 * call-media-engine — Canonical pipelines for ALL call device/media operations.
 *
 * Pipelines:
 *   1. Microphone     — acquire, mute/unmute, release
 *   2. Audio Output   — route to earpiece/speaker
 *   3. Camera         — acquire, toggle, release
 *   4. Remote Audio   — attach stream to playback element, detach
 *   5. Ringtone       — delegated to CallRingtone (already canonical)
 *   6. Ringback       — delegated to CallAudioEngine (already canonical)
 *   7. Permissions    — check/request mic+camera
 *   8. Stream Attach  — wire local/remote to PeerConnection
 *   9. Cleanup        — release all tracks, close streams, reset store
 *
 * NO idempotency locks on toggles — they are instant state flips.
 * Locks only on acquire (async) to prevent double-acquire races.
 */
import { useCallMediaStore, type OutputState } from "./call-media-store";

let acquireLock = false;

export const CallMediaEngine = {
  // ═══════════════════════════════════════════
  // 1. MICROPHONE PIPELINE
  // ═══════════════════════════════════════════

  /** Acquire microphone — returns the stream or null */
  async acquireMic(constraints?: MediaTrackConstraints): Promise<MediaStream | null> {
    if (acquireLock) return null;
    acquireLock = true;
    const store = useCallMediaStore.getState();
    store.setMic("acquiring");
    store.setCallMedia("acquiring");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: constraints || {
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
          autoGainControl: { ideal: true },
          sampleRate: { ideal: 48000 },
          channelCount: { ideal: 1 },
        },
        video: false,
      });
      store.setMic("active");
      store.setLocalStream("attached", stream);
      return stream;
    } catch (err) {
      const msg = err instanceof DOMException ? err.name : String(err);
      store.setMic("failed");
      store.setCallMedia("failed");
      store.setError(msg);
      return null;
    } finally {
      acquireLock = false;
    }
  },

  /** Toggle mute — instant, no lock needed */
  toggleMute(stream: MediaStream | null): boolean {
    if (!stream) return false;
    const tracks = stream.getAudioTracks();
    if (tracks.length === 0) return false;
    const newEnabled = !tracks[0].enabled;
    tracks.forEach((t) => { t.enabled = newEnabled; });
    useCallMediaStore.getState().setMic(newEnabled ? "active" : "muted");
    return !newEnabled; // returns isMuted
  },

  /** Release microphone tracks */
  releaseMic(stream: MediaStream | null) {
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => t.stop());
    useCallMediaStore.getState().setMic("released");
  },

  // ═══════════════════════════════════════════
  // 2. AUDIO OUTPUT PIPELINE
  // ═══════════════════════════════════════════

  /** Switch audio output — web API limited, best-effort */
  async setOutput(target: OutputState, audioElement?: HTMLAudioElement | null) {
    const store = useCallMediaStore.getState();

    // Web standard: setSinkId (Chrome/Edge)
    if (audioElement && "setSinkId" in audioElement && target === "speaker") {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const speaker = devices.find(
          (d) => d.kind === "audiooutput" && d.label.toLowerCase().includes("speaker")
        );
        if (speaker) {
          await (audioElement as any).setSinkId(speaker.deviceId);
        }
      } catch {
        // setSinkId not supported or failed
      }
    }

    store.setOutput(target);
  },

  /** Toggle between earpiece and speaker */
  toggleSpeaker(audioElement?: HTMLAudioElement | null): OutputState {
    const current = useCallMediaStore.getState().output;
    const next: OutputState = current === "speaker" ? "earpiece" : "speaker";
    void CallMediaEngine.setOutput(next, audioElement);
    return next;
  },

  // ═══════════════════════════════════════════
  // 3. CAMERA PIPELINE
  // ═══════════════════════════════════════════

  /** Acquire camera — appends video track to existing stream or creates new */
  async acquireCamera(existingStream?: MediaStream | null): Promise<MediaStreamTrack | null> {
    const store = useCallMediaStore.getState();
    store.setCamera("acquiring");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      const track = stream.getVideoTracks()[0];
      if (existingStream && track) {
        existingStream.addTrack(track);
      }
      store.setCamera("active");
      return track || null;
    } catch (err) {
      const msg = err instanceof DOMException ? err.name : String(err);
      store.setCamera("failed");
      store.setError(msg);
      return null;
    }
  },

  /** Toggle camera on/off — instant */
  toggleCamera(stream: MediaStream | null): boolean {
    if (!stream) return false;
    const track = stream.getVideoTracks()[0];
    if (!track) return false;
    track.enabled = !track.enabled;
    useCallMediaStore.getState().setCamera(track.enabled ? "active" : "off");
    return track.enabled;
  },

  /** Release camera tracks */
  releaseCamera(stream: MediaStream | null) {
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => t.stop());
    useCallMediaStore.getState().setCamera("released");
  },

  // ═══════════════════════════════════════════
  // 4. REMOTE AUDIO PLAYBACK PIPELINE
  // ═══════════════════════════════════════════

  /** Attach remote stream to an <audio> element */
  attachRemoteAudio(audioEl: HTMLAudioElement | null, stream: MediaStream | null) {
    const store = useCallMediaStore.getState();
    if (!audioEl) return;

    if (stream && stream.getAudioTracks().length > 0) {
      store.setRemoteStream("attaching", stream);
      audioEl.srcObject = stream;
      audioEl.play().catch((err) => {
        console.warn("[CallMediaEngine] autoplay blocked:", err);
      });
      store.setRemoteStream("attached", stream);
    } else {
      audioEl.srcObject = null;
      store.setRemoteStream("detached", null);
    }
  },

  /** Detach remote stream */
  detachRemoteAudio(audioEl: HTMLAudioElement | null) {
    if (audioEl) audioEl.srcObject = null;
    useCallMediaStore.getState().setRemoteStream("detached", null);
  },

  // ═══════════════════════════════════════════
  // 7. PERMISSIONS PIPELINE
  // ═══════════════════════════════════════════

  /** Check current mic/camera permission states */
  async checkPermissions(): Promise<{ mic: PermissionState; camera: PermissionState }> {
    const result = { mic: "prompt" as PermissionState, camera: "prompt" as PermissionState };
    try {
      const nav = navigator as any;
      if (!nav.permissions?.query) return result;
      const micResult = await nav.permissions.query({ name: "microphone" });
      result.mic = micResult.state;
      try {
        const camResult = await nav.permissions.query({ name: "camera" });
        result.camera = camResult.state;
      } catch { /* camera query not supported in all browsers */ }
    } catch { /* permissions API not supported */ }
    return result;
  },

  /** Request mic permission (acquire then immediately release) */
  async requestMicPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  },

  /** Request camera permission (acquire then immediately release) */
  async requestCameraPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  },

  // ═══════════════════════════════════════════
  // 8. STREAM ATTACH/DETACH PIPELINE
  // ═══════════════════════════════════════════

  /** Add local tracks to PeerConnection */
  attachLocalToPeer(pc: RTCPeerConnection, stream: MediaStream) {
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    useCallMediaStore.getState().setLocalStream("attached", stream);
  },

  /** Set up remote track handler on PeerConnection */
  onRemoteTrack(pc: RTCPeerConnection, onStream: (stream: MediaStream) => void) {
    const remote = new MediaStream();
    useCallMediaStore.getState().setRemoteStream("attaching", remote);

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => remote.addTrack(track));
      useCallMediaStore.getState().setRemoteStream("attached", remote);
      onStream(remote);
    };

    return remote;
  },

  // ═══════════════════════════════════════════
  // 9. CLEANUP PIPELINE
  // ═══════════════════════════════════════════

  /** Full cleanup — stop all tracks, detach everything, reset store */
  cleanup(audioEl?: HTMLAudioElement | null) {
    const store = useCallMediaStore.getState();
    store.setCallMedia("releasing");

    // Stop local tracks
    if (store._localStreamRef) {
      store._localStreamRef.getTracks().forEach((t) => t.stop());
    }

    // Detach remote audio
    if (audioEl) audioEl.srcObject = null;

    // Reset store to initial
    store.reset();
  },
};
