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
    // Listen for display-mode change (e.g. user opens PWA)
    const mql = window.matchMedia("(display-mode: standalone)");
    const onMqlChange = (e: MediaQueryListEvent) => setInstalled(e.matches);
    mql.addEventListener("change", onMqlChange);

    // Listen for appinstalled (Chrome fires this after install)
    const onInstalled = () => setInstalled(true);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      mql.removeEventListener("change", onMqlChange);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return installed;
}
