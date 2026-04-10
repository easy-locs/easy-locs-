import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class MediaFlowEngine extends BaseEngine {
  constructor() {
    super({
      id: "orbit-media-flow",
      name: "Media Flow Engine",
      category: "orbit",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const images = document.querySelectorAll("img[data-orbit-media]");
    let broken = 0;
    images.forEach(img => {
      if ((img as HTMLImageElement).naturalWidth === 0 && (img as HTMLImageElement).complete) broken++;
    });
    if (broken > 0) {
      findings.push(`${broken} broken orbit media images`);
    }

    const videos = document.querySelectorAll("video[data-orbit-media]");
    let erroredVideos = 0;
    videos.forEach(v => {
      const video = v as HTMLVideoElement;
      if (video.error) erroredVideos++;
    });
    if (erroredVideos > 0) {
      findings.push(`${erroredVideos} errored orbit video elements`);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
