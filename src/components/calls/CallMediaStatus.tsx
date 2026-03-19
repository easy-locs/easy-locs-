/**
 * CallMediaStatus — Visible media status indicator for calls.
 * Shows camera/audio state and fallback warnings.
 */
import { useMediaStatus } from "@/hooks/useMediaStatus";
import { Camera, CameraOff, Mic, MicOff, AlertTriangle } from "lucide-react";
import React from "react";

const CallMediaStatus = React.memo(function CallMediaStatus() {
  const { cameraReady, audioReady, fallbackActive, error } = useMediaStatus();

  return (
    <div className="flex flex-col gap-1.5 text-xs">
      {/* Status indicators */}
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          {audioReady ? (
            <Mic className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <MicOff className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className={audioReady ? "text-emerald-600" : "text-muted-foreground"}>
            {audioReady ? "Audio ready" : "No audio"}
          </span>
        </span>
        <span className="flex items-center gap-1">
          {cameraReady ? (
            <Camera className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <CameraOff className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className={cameraReady ? "text-emerald-600" : "text-muted-foreground"}>
            {cameraReady ? "Camera ready" : "No camera"}
          </span>
        </span>
      </div>

      {/* Fallback warning */}
      {fallbackActive && (
        <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1.5 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Camera unavailable, continuing with audio only</span>
        </div>
      )}

      {/* Error display */}
      {error && !fallbackActive && (
        <div className="flex items-center gap-1.5 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
});

export default CallMediaStatus;
