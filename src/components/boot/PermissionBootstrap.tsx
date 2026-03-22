/**
 * PermissionBootstrap — Sync-only: probes current permission states and stores them.
 * Does NOT request any permissions. Requests happen on-demand:
 *   - Geo: Home/Radar via requestLocation()
 *   - Camera: QR scanner flow
 *   - Microphone: Call/voice flow
 *   - Notifications: After first order or relevant UX moment
 */
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

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
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          await (supabase as any)
            .from("orbit_profiles_v2")
            .update({ permissions: perms } as any)
            .eq("id", user.id);
        }
      } catch {
        // Silent
      }
    })();
  }, []);

  return null;
}
