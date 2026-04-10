import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class MediaQualityEngine extends BaseEngine {
  constructor() {
    super({
      id: "calls-media-quality",
      name: "Media Quality Engine",
      category: "calls",
      intervalMs: 15_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const audioEls = document.querySelectorAll("audio");
    const videoEls = document.querySelectorAll("video:not([data-orbit-media])");

    audioEls.forEach(audio => {
      if (audio.error) {
        findings.push(`Audio element error: code ${audio.error.code}`);
      }
      if (audio.paused && audio.currentTime > 0 && !audio.ended) {
        findings.push("Audio unexpectedly paused mid-playback");
      }
    });

    videoEls.forEach(video => {
      if (video.error) {
        findings.push(`Video element error: code ${video.error.code}`);
      }
      const quality = video.getVideoPlaybackQuality?.();
      if (quality && quality.droppedVideoFrames > quality.totalVideoFrames * 0.1) {
        findings.push(`Video frame drops: ${quality.droppedVideoFrames}/${quality.totalVideoFrames}`);
      }
    });

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
