/**
 * PermissionBootstrap — Auto-requests camera, microphone, and notification
 * permissions on first app load (like Careem, Grab, Uber).
 * Silent — no UI. Runs once per session. Stores probe results in orbit profile.
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
      // 1. Camera + Mic: probe via permissions API, request if "prompt"
      const camState = await probePermission("camera" as PermissionName);
      const micState = await probePermission("microphone" as PermissionName);

      if (camState === "prompt" || micState === "prompt") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: camState === "prompt",
            audio: micState === "prompt",
          });
          // Immediately release — we only wanted the permission grant
          stream.getTracks().forEach((t) => t.stop());
          console.log("[PermissionBootstrap] Camera/Mic granted");
        } catch (err) {
          console.log("[PermissionBootstrap] Camera/Mic denied or unavailable", (err as Error).message);
        }
      }

      // 2. Notifications: request if "default"
      if ("Notification" in window && Notification.permission === "default") {
        try {
          const result = await Notification.requestPermission();
          console.log("[PermissionBootstrap] Notification permission:", result);
        } catch {
          console.log("[PermissionBootstrap] Notification request failed");
        }
      }

      // 3. Update orbit profile permissions snapshot
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
          const perms = {
            camera: (await probePermission("camera" as PermissionName)) === "granted",
            microphone: (await probePermission("microphone" as PermissionName)) === "granted",
            notifications: "Notification" in window ? Notification.permission === "granted" : false,
            geolocation: (await probePermission("geolocation")) === "granted",
          };
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
