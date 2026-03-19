import { useEffect, useState } from "react";
import { subscribeMediaStatus, getMediaStatus, type MediaStatus } from "@/lib/calls/webrtc-call-manager";

/**
 * Hook to subscribe to real-time media status (camera/audio/fallback/error).
 */
export function useMediaStatus() {
  const [status, setStatus] = useState<MediaStatus>(getMediaStatus);

  useEffect(() => {
    return subscribeMediaStatus(setStatus);
  }, []);

  return status;
}
