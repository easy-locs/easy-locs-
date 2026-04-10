import type { BackendSecurityContract, HardenedRtcConfig } from "./types";

export async function getHardenedRtcConfig(backend: BackendSecurityContract): Promise<HardenedRtcConfig> {
  const cfg = await backend.issueTurnConfig();

  if (!cfg.iceServers?.length) {
    return {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
      iceTransportPolicy: "all",
      bundlePolicy: "max-bundle",
      rtcpMuxPolicy: "require",
    };
  }

  return {
    ...cfg,
    bundlePolicy: cfg.bundlePolicy ?? "max-bundle",
    rtcpMuxPolicy: cfg.rtcpMuxPolicy ?? "require",
  };
}
