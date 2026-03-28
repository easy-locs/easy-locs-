/**
 * Media acquisition — getUserMedia with constraints.
 */

export interface MediaResult {
  stream: MediaStream;
  isVideo: boolean;
}

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: { ideal: true },
  noiseSuppression: { ideal: true },
  autoGainControl: { ideal: true },
  sampleRate: { ideal: 48000 },
  channelCount: { ideal: 1 },
};

export async function acquireMedia(isVideo: boolean): Promise<MediaResult> {
  let stream: MediaStream;

  if (isVideo) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: AUDIO_CONSTRAINTS,
        video: { facingMode: { ideal: "user" }, width: { ideal: 640 }, height: { ideal: 480 } },
      });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS, video: true });
    }
  } else {
    stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS, video: false });
  }

  // Force mic active at call start
  stream.getAudioTracks().forEach((track) => { track.enabled = true; });

  return { stream, isVideo: stream.getVideoTracks().length > 0 };
}
