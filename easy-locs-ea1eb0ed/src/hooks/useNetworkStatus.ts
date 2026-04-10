/**
 * useNetworkStatus — Detects online/offline state with reconnection events
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean; // true if we just came back online
  lastOnlineAt: number | null;
  connectionType: string | null;
}

export function useNetworkStatus() {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    wasOffline: false,
    lastOnlineAt: navigator.onLine ? Date.now() : null,
    connectionType: (navigator as any).connection?.effectiveType || null,
  });
  const wasOfflineRef = useRef(false);
  const reconnectCallbacks = useRef<Array<() => void>>([]);

  const onReconnect = useCallback((cb: () => void) => {
    reconnectCallbacks.current.push(cb);
    return () => {
      reconnectCallbacks.current = reconnectCallbacks.current.filter(fn => fn !== cb);
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      const justReconnected = wasOfflineRef.current;
      wasOfflineRef.current = false;
      setStatus({
        isOnline: true,
        wasOffline: justReconnected,
        lastOnlineAt: Date.now(),
        connectionType: (navigator as any).connection?.effectiveType || null,
      });
      if (justReconnected) {
        reconnectCallbacks.current.forEach(cb => {
          try { cb(); } catch {}
        });
      }
    };

    const handleOffline = () => {
      wasOfflineRef.current = true;
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        wasOffline: false,
      }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return useMemo(() => ({ ...status, onReconnect }), [status, onReconnect]);
}
