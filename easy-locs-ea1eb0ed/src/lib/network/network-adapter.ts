/**
 * Network Adapter — Adjusts app behavior based on network quality.
 * Detects slow networks and reduces sync frequency, media quality, etc.
 */

export type NetworkQuality = "excellent" | "good" | "degraded" | "poor" | "offline";

export interface NetworkProfile {
  quality: NetworkQuality;
  effectiveType: string;
  downlink: number;     // Mbps
  rtt: number;          // ms
  saveData: boolean;
}

/** Get current network profile */
export function getNetworkProfile(): NetworkProfile {
  const conn = (navigator as any).connection;
  if (!navigator.onLine) {
    return { quality: "offline", effectiveType: "none", downlink: 0, rtt: 0, saveData: false };
  }
  if (!conn) {
    return { quality: "good", effectiveType: "4g", downlink: 10, rtt: 50, saveData: false };
  }

  const profile: NetworkProfile = {
    quality: "good",
    effectiveType: conn.effectiveType || "4g",
    downlink: conn.downlink ?? 10,
    rtt: conn.rtt ?? 50,
    saveData: conn.saveData ?? false,
  };

  // Classify quality
  if (profile.saveData || profile.effectiveType === "slow-2g") {
    profile.quality = "poor";
  } else if (profile.effectiveType === "2g" || profile.rtt > 500) {
    profile.quality = "degraded";
  } else if (profile.effectiveType === "3g" || profile.rtt > 200) {
    profile.quality = "degraded";
  } else if (profile.downlink > 5) {
    profile.quality = "excellent";
  }

  return profile;
}

/** Adaptive settings based on network */
export interface AdaptiveSettings {
  syncIntervalMs: number;
  mediaQuality: number;        // 0-1
  maxConcurrentUploads: number;
  enablePresence: boolean;
  enableTypingIndicator: boolean;
  prefetchMessages: boolean;
  maxImageSizeKB: number;
}

export function getAdaptiveSettings(profile?: NetworkProfile): AdaptiveSettings {
  const p = profile ?? getNetworkProfile();

  switch (p.quality) {
    case "excellent":
      return {
        syncIntervalMs: 5000,
        mediaQuality: 0.92,
        maxConcurrentUploads: 4,
        enablePresence: true,
        enableTypingIndicator: true,
        prefetchMessages: true,
        maxImageSizeKB: 5000,
      };
    case "good":
      return {
        syncIntervalMs: 10000,
        mediaQuality: 0.85,
        maxConcurrentUploads: 3,
        enablePresence: true,
        enableTypingIndicator: true,
        prefetchMessages: true,
        maxImageSizeKB: 3000,
      };
    case "degraded":
      return {
        syncIntervalMs: 30000,
        mediaQuality: 0.72,
        maxConcurrentUploads: 1,
        enablePresence: false,
        enableTypingIndicator: false,
        prefetchMessages: false,
        maxImageSizeKB: 1000,
      };
    case "poor":
      return {
        syncIntervalMs: 60000,
        mediaQuality: 0.5,
        maxConcurrentUploads: 1,
        enablePresence: false,
        enableTypingIndicator: false,
        prefetchMessages: false,
        maxImageSizeKB: 500,
      };
    case "offline":
      return {
        syncIntervalMs: 0, // no sync
        mediaQuality: 0,
        maxConcurrentUploads: 0,
        enablePresence: false,
        enableTypingIndicator: false,
        prefetchMessages: false,
        maxImageSizeKB: 0,
      };
  }
}

/** Subscribe to network quality changes */
export function onNetworkChange(callback: (profile: NetworkProfile) => void): () => void {
  const conn = (navigator as any).connection;
  const handler = () => callback(getNetworkProfile());

  window.addEventListener("online", handler);
  window.addEventListener("offline", handler);
  conn?.addEventListener?.("change", handler);

  return () => {
    window.removeEventListener("online", handler);
    window.removeEventListener("offline", handler);
    conn?.removeEventListener?.("change", handler);
  };
}
