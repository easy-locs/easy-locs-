/**
 * useOrbitSessionInit — Registers device session on auth state change
 * Call once in the app root (e.g., AuthContext or App.tsx)
 */
import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { registerDeviceSession, checkSuspiciousLogin } from "@/lib/orbit-session-manager";
import { toast } from "sonner";

export function useOrbitSessionInit() {
  const { user } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!user?.id || registered.current) return;
    registered.current = true;

    (async () => {
      try {
        const { isNewDevice } = await registerDeviceSession(user.id);
        if (isNewDevice) {
          const { isSuspicious, reason } = await checkSuspiciousLogin(user.id);
          if (isSuspicious && reason) {
            toast.warning(reason, { duration: 8000 });
          }
        }
      } catch {
        // Silent — session tracking is non-blocking
      }
    })();
  }, [user?.id]);
}
