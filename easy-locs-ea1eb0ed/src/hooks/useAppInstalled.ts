/**
 * Detects whether the app is running as an installed PWA (standalone)
 * or inside a Capacitor native wrapper.
 * PASS 179: Also listens for appinstalled event for real-time detection.
 */
import { useState, useEffect } from "react";

function checkInstalled(): boolean {
  if (typeof window === "undefined") return false;
  if ((window as any).Capacitor?.isNativePlatform?.()) return true;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if ((navigator as any).standalone === true) return true; // iOS Safari
  return false;
}

export function useAppInstalled(): boolean {
  const [installed, setInstalled] = useState(checkInstalled);

  useEffect(() => {
    const mql = window.matchMedia("(display-mode: standalone)");
    const onMqlChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setInstalled("matches" in e ? e.matches : false);
    };
    // Modern API with fallback for older WebKit
    if (mql.addEventListener) {
      mql.addEventListener("change", onMqlChange as any);
    } else if (mql.addListener) {
      mql.addListener(onMqlChange as any);
    }

    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", onMqlChange as any);
      } else if (mql.removeListener) {
        mql.removeListener(onMqlChange as any);
      }
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return installed;
}
