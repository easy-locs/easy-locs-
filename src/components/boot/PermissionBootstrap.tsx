/**
 * PermissionBootstrap — Sync-only: probes current permission states and stores them.
 * Does NOT request any permissions. Requests happen on-demand:
 *   - Geo: Home/Radar via requestLocation()
 *   - Camera: QR scanner flow
 *   - Microphone: Call/voice flow
 *   - Notifications: After first order or relevant UX moment
 */
import { useEffect, useRef } from "react";
import { getAuthUser } from "@/repositories/auth-utils.repository";
import { updateOrbitPermissions } from "@/repositories/communication.repository";

async function probePermission(name: PermissionName): Promise<PermissionState> {
  try {
    const status = await navigator.permissions.query({ name });
    return status.state;
  } catch {
    return "prompt";
  }
}

export function PermissionBootstrap() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    (async () => {
      // Probe-only — no getUserMedia, no Notification.requestPermission
      const perms = {
        camera: (await probePermission("camera" as PermissionName)) === "granted",
        microphone: (await probePermission("microphone" as PermissionName)) === "granted",
        notifications: "Notification" in window ? Notification.permission === "granted" : false,
        geolocation: (await probePermission("geolocation")) === "granted",
      };

      // Sync to orbit profile if logged in
      try {
        const { user } = await getAuthUser();
        if (user?.id) {
          await updateOrbitPermissions(user.id, perms);
        }
      } catch {
        // Silent
      }
    })();
  }, []);

  return null;
}
