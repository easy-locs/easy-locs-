import { useEffect, useState } from "react";

/**
 * Live countdown from an initial ETA in minutes.
 * Returns remaining minutes (rounded up).
 */
export function useEtaCountdown(initialMinutes: number) {
  const [remaining, setRemaining] = useState(initialMinutes * 60);

  useEffect(() => {
    setRemaining(initialMinutes * 60);
  }, [initialMinutes]);

  useEffect(() => {
    if (remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [remaining > 0]);

  return {
    minutes: Math.ceil(remaining / 60),
    seconds: remaining,
    isExpired: remaining <= 0,
  };
}
