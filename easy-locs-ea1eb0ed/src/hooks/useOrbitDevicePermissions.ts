import { useCallback, useEffect, useState } from "react";
import type { OrbitDevicePermissionState } from "@/lib/orbit/orbit-call-types";

export function useOrbitDevicePermissions() {
  const [permissions, setPermissions] = useState<OrbitDevicePermissionState>({
    microphone: "unknown",
    camera: "unknown",
  });

  const checkPermissions = useCallback(async () => {
    try {
      const navAny = navigator as any;
      if (!navAny.permissions?.query) return;

      const mic = await navAny.permissions.query({ name: "microphone" });
      let cam: PermissionStatus | null = null;

      try {
        cam = await navAny.permissions.query({ name: "camera" });
      } catch {
        cam = null;
      }

      setPermissions({
        microphone: (mic.state as any) || "unknown",
        camera: (cam?.state as any) || "unknown",
      });
    } catch {
      // ignore
    }
  }, []);

  const requestMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach((t) => t.stop());
      setPermissions((prev) => ({ ...prev, microphone: "granted" }));
      return true;
    } catch {
      setPermissions((prev) => ({ ...prev, microphone: "denied" }));
      return false;
    }
  }, []);

  const requestCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      stream.getTracks().forEach((t) => t.stop());
      setPermissions((prev) => ({ ...prev, camera: "granted" }));
      return true;
    } catch {
      setPermissions((prev) => ({ ...prev, camera: "denied" }));
      return false;
    }
  }, []);

  useEffect(() => {
    void checkPermissions();
  }, [checkPermissions]);

  return {
    permissions,
    checkPermissions,
    requestMicrophone,
    requestCamera,
  };
}
