import { useEffect, useRef, useState } from "react";

interface UseNetworkRecoveryOptions {
  enabled: boolean;
  onReconnect: () => void;
  debounceMs?: number;
}

export function useNetworkRecovery({
  enabled,
  onReconnect,
  debounceMs = 2000,
}: UseNetworkRecoveryOptions) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const callbackRef = useRef(onReconnect);
  callbackRef.current = onReconnect;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callbackRef.current();
      }, debounceMs);
    };

    const handleOffline = () => {
      setIsOffline(true);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, debounceMs]);

  return { isOffline };
}
