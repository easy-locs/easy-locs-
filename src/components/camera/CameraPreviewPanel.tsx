import { useEffect, useRef } from "react";
import { useCameraStore } from "@/stores/cameraStore";

export function CameraPreviewPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stream = useCameraStore((s) => s.stream);
  const mode = useCameraStore((s) => s.mode);
  const closeCamera = useCameraStore((s) => s.closeCamera);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [stream]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-black/90 p-6">
      <div className="flex items-center justify-between w-full max-w-md mb-4">
        <h2 className="text-lg font-semibold text-white">
          Camera Preview ({mode ?? "none"})
        </h2>
        <button
          className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
          onClick={closeCamera}
        >
          Close
        </button>
      </div>

      <div className="w-full max-w-md aspect-video rounded-lg overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
      </div>
    </div>
  );
}
