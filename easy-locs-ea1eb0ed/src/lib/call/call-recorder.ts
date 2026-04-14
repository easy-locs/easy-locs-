import { db } from "@/services/db";

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  durationMs: number;
  blobUrl: string | null;
  consent: RecordingConsent;
}

export interface RecordingConsent {
  localConsent: boolean;
  remoteConsent: boolean;
  bothConsented: boolean;
}

const MIME_PREFERENCES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

function getSupportedMimeType(): string {
  for (const mime of MIME_PREFERENCES) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return "audio/webm";
}

export class CallRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private startTime = 0;
  private _state: RecordingState = {
    isRecording: false,
    isPaused: false,
    durationMs: 0,
    blobUrl: null,
    consent: { localConsent: false, remoteConsent: false, bothConsented: false },
  };
  private onStateChange: ((state: RecordingState) => void) | null = null;
  private durationTimer: ReturnType<typeof setInterval> | null = null;

  get state() {
    return this._state;
  }

  setOnStateChange(cb: (state: RecordingState) => void) {
    this.onStateChange = cb;
  }

  grantLocalConsent() {
    this._state.consent.localConsent = true;
    this._state.consent.bothConsented =
      this._state.consent.localConsent && this._state.consent.remoteConsent;
    this.emitState();
  }

  grantRemoteConsent() {
    this._state.consent.remoteConsent = true;
    this._state.consent.bothConsented =
      this._state.consent.localConsent && this._state.consent.remoteConsent;
    this.emitState();
  }

  revokeConsent() {
    this._state.consent = { localConsent: false, remoteConsent: false, bothConsented: false };
    if (this._state.isRecording) {
      this.stop();
    }
    this.emitState();
  }

  start(localStream: MediaStream, remoteStream: MediaStream | null): boolean {
    if (!this._state.consent.bothConsented) {
      console.warn("[CallRecorder] Cannot record without both parties' consent");
      return false;
    }

    if (this._state.isRecording) return false;

    try {
      const ctx = new AudioContext();
      const destination = ctx.createMediaStreamDestination();

      const localSource = ctx.createMediaStreamSource(localStream);
      localSource.connect(destination);

      if (remoteStream && remoteStream.getAudioTracks().length > 0) {
        const remoteSource = ctx.createMediaStreamSource(remoteStream);
        remoteSource.connect(destination);
      }

      const mimeType = getSupportedMimeType();
      this.recorder = new MediaRecorder(destination.stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      this.chunks = [];
      this.recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.chunks.push(e.data);
      };

      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);
        this._state.blobUrl = blobUrl;
        this._state.isRecording = false;
        this._state.isPaused = false;
        this.clearDurationTimer();
        this.emitState();
      };

      this.recorder.start(1000);
      this.startTime = Date.now();
      this._state.isRecording = true;
      this._state.isPaused = false;
      this._state.durationMs = 0;
      this._state.blobUrl = null;

      this.durationTimer = setInterval(() => {
        this._state.durationMs = Date.now() - this.startTime;
        this.emitState();
      }, 1000);

      this.emitState();
      return true;
    } catch (err) {
      console.error("[CallRecorder] Failed to start recording:", err);
      return false;
    }
  }

  pause() {
    if (this.recorder?.state === "recording") {
      this.recorder.pause();
      this._state.isPaused = true;
      this.emitState();
    }
  }

  resume() {
    if (this.recorder?.state === "paused") {
      this.recorder.resume();
      this._state.isPaused = false;
      this.emitState();
    }
  }

  stop() {
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.stop();
    }
    this.clearDurationTimer();
  }

  async uploadRecording(
    callId: string,
    userId: string
  ): Promise<{ path: string; url: string } | null> {
    if (!this._state.blobUrl || this.chunks.length === 0) return null;

    try {
      const mimeType = getSupportedMimeType();
      const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("ogg") ? "ogg" : "mp4";
      const blob = new Blob(this.chunks, { type: mimeType });
      const path = `call-recordings/${userId}/${callId}.${ext}`;

      const { error } = await db.storage
        .from("private-media")
        .upload(path, blob, {
          contentType: mimeType,
          upsert: false,
        });

      if (error) throw error;

      const { data: urlData } = await db.storage
        .from("private-media")
        .createSignedUrl(path, 7 * 24 * 60 * 60);

      await db.from("call_logs").update({
        recording_path: path,
        recording_duration_ms: this._state.durationMs,
      }).eq("id", callId);

      return { path, url: urlData?.signedUrl || "" };
    } catch (err) {
      console.error("[CallRecorder] Upload failed:", err);
      return null;
    }
  }

  cleanup() {
    this.stop();
    if (this._state.blobUrl) {
      URL.revokeObjectURL(this._state.blobUrl);
    }
    this._state = {
      isRecording: false,
      isPaused: false,
      durationMs: 0,
      blobUrl: null,
      consent: { localConsent: false, remoteConsent: false, bothConsented: false },
    };
    this.onStateChange = null;
  }

  private clearDurationTimer() {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  private emitState() {
    this.onStateChange?.({ ...this._state });
  }
}
