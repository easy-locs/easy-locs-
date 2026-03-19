/**
 * ToggleCameraButton — Dynamically add/remove video track during a call.
 */
import React, { useCallback, useState } from "react";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMediaStatus } from "@/hooks/useMediaStatus";

interface Props {
  getManager: () => { addVideoTrack: () => Promise<boolean>; removeVideoTracks: () => void } | null;
}

const ToggleCameraButton = React.memo(function ToggleCameraButton({ getManager }: Props) {
  const { cameraReady } = useMediaStatus();
  const [loading, setLoading] = useState(false);

  const toggle = useCallback(async () => {
    const mgr = getManager();
    if (!mgr) return;
    setLoading(true);
    try {
      if (cameraReady) {
        mgr.removeVideoTracks();
      } else {
        await mgr.addVideoTrack();
      }
    } finally {
      setLoading(false);
    }
  }, [cameraReady, getManager]);

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggle}
      disabled={loading}
      className="rounded-full"
      aria-label={cameraReady ? "Turn off camera" : "Turn on camera"}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : cameraReady ? (
        <Camera className="h-4 w-4" />
      ) : (
        <CameraOff className="h-4 w-4" />
      )}
    </Button>
  );
});

export default ToggleCameraButton;
