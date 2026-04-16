import { useState, useEffect, useRef, useCallback } from "react";

export interface UseVisibilityAwareIntervalReturn {
  countdown: number;
  isVisible: boolean;
  reset: () => void;
}

export function useVisibilityAwareInterval(
  callback: () => void,
  intervalSeconds: number,
  enabled: boolean = true
): UseVisibilityAwareIntervalReturn {
  const [countdown, setCountdown] = useState(intervalSeconds);
  const visibleRef = useRef(
    typeof document !== "undefined" ? !document.hidden : true
  );
  const [isVisible, setIsVisible] = useState(visibleRef.current);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const reset = useCallback(() => {
    setCountdown(intervalSeconds);
  }, [intervalSeconds]);

  useEffect(() => {
    if (!enabled) return;

    const nowVisible = typeof document !== "undefined" ? !document.hidden : true;
    visibleRef.current = nowVisible;
    setIsVisible(nowVisible);
    setCountdown(intervalSeconds);

    const handleVisibilityChange = () => {
      const nowVisible = !document.hidden;
      visibleRef.current = nowVisible;
      setIsVisible(nowVisible);
      if (nowVisible) {
        setCountdown(intervalSeconds);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const tickId = setInterval(() => {
      if (!visibleRef.current) return;

      setCountdown((prev) => {
        if (prev <= 1) {
          callbackRef.current();
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(tickId);
    };
  }, [enabled, intervalSeconds]);

  return { countdown, isVisible, reset };
}
