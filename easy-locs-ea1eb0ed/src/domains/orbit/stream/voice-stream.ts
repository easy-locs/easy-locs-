/**
 * Voice Stream — Live waveform capture with AudioContext.
 * Provides real-time amplitude data for waveform visualization.
 */

export interface VoiceStreamHandle {
  stop: () => void;
  getWaveform: () => number[];
}

/**
 * Start live voice capture with waveform streaming.
 * @param onLevel Callback fired every ~100ms with normalized amplitude (0-1).
 * @returns Handle to stop recording and get accumulated waveform.
 */
export async function startVoiceStream(
  onLevel: (level: number) => void,
): Promise<VoiceStreamHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;

  source.connect(analyser);

  const buffer = new Uint8Array(analyser.frequencyBinCount);
  const waveform: number[] = [];
  let running = true;

  const tick = () => {
    if (!running) return;
    analyser.getByteFrequencyData(buffer);
    const avg = buffer.reduce((a, b) => a + b, 0) / buffer.length / 255;
    waveform.push(Math.round(avg * 100) / 100);
    onLevel(avg);
    setTimeout(tick, 100);
  };

  tick();

  return {
    stop: () => {
      running = false;
      stream.getTracks().forEach((t) => t.stop());
      ctx.close().catch(() => {});
    },
    getWaveform: () => [...waveform],
  };
}
