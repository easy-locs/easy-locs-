/**
 * Detects whether the app is running as an installed PWA (standalone)
 * or inside a Capacitor native wrapper.
 */
import { useState, useEffect } from "react";

export function useAppInstalled(): boolean {
  const [installed, setInstalled] = useState(() => {
    if (typeof window === "undefined") return false;
    // Capacitor native app
    if ((window as any).Capacitor?.isNativePlatform?.()) return true;
    // PWA standalone
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if ((navigator as any).standalone === true) return true; // iOS Safari
    return false;
  });

  useEffect(() => {
    const mql = window.matchMedia("(display-mode: standalone)");
    const handler = (e: MediaQueryListEvent) => setInstalled(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return installed;
}
