import { useEffect, useMemo, useState } from "react";

const RAINVIEWER_STATIC_TILE = "https://tilecache.rainviewer.com/v2/radar/{z}/{x}/{y}/256/2/1_1.png";

type RainRadarState = {
  activeTileUrl: string | null;
  frameCount: number;
  loading: boolean;
};

export function useRainRadar(enabled: boolean) {
  const [frames, setFrames] = useState<string[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const loadFrames = async () => {
      setLoading(true);

      try {
        const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        const json = await res.json();
        const host = typeof json?.host === "string" ? json.host : "https://tilecache.rainviewer.com";
        const radarFrames = [
          ...(Array.isArray(json?.radar?.past) ? json.radar.past : []),
          ...(Array.isArray(json?.radar?.nowcast) ? json.radar.nowcast : []),
        ]
          .map((frame: { path?: string }) => frame?.path)
          .filter((path: unknown): path is string => typeof path === "string" && path.length > 0)
          .slice(-6)
          .map((path: string) => `${host}${path}/256/{z}/{x}/{y}/2/1_1.png`);

        if (cancelled) return;
        setFrames(radarFrames.length > 0 ? radarFrames : [RAINVIEWER_STATIC_TILE]);
      } catch {
        if (cancelled) return;
        setFrames([RAINVIEWER_STATIC_TILE]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadFrames();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || frames.length <= 1) return;

    const interval = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % frames.length);
    }, 900);

    return () => window.clearInterval(interval);
  }, [enabled, frames]);

  useEffect(() => {
    if (frameIndex >= frames.length) {
      setFrameIndex(0);
    }
  }, [frameIndex, frames.length]);

  return useMemo<RainRadarState>(() => ({
    activeTileUrl: frames[frameIndex] ?? null,
    frameCount: frames.length,
    loading,
  }), [frameIndex, frames, loading]);
}