/**
 * HealthCheckProvider — boot-time Supabase connectivity probe.
 *
 * On mount it issues a single lightweight HEAD-equivalent request to the
 * Supabase REST endpoint. If the project is unreachable (network offline,
 * wrong URL, DB paused) it sets a global `window.__EASYLOCS_DB_DEGRADED__`
 * flag and renders a dismissable degraded-mode banner at the bottom of the
 * viewport so users know why some features may not work — instead of
 * silently hanging or showing blank cards.
 *
 * The probe is intentionally:
 *  • Best-effort — errors are caught; never blocks render
 *  • Skipped when `supabaseEnvMissing` is true (EnvDiagnosticScreen handles that)
 *  • Re-run once after a visibility change (tab re-focus) so the banner clears
 *    when the user comes back online
 *  • Zero external deps beyond React
 */

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabaseEnvMissing } from "@/services/db";

type HealthStatus = "unknown" | "ok" | "degraded";

interface HealthState {
  status: HealthStatus;
  dismissBanner: () => void;
}

const HealthCtx = createContext<HealthState>({ status: "unknown", dismissBanner: () => {} });

/** Returns the current Supabase connectivity status detected at boot. */
export function useHealthStatus(): HealthStatus {
  return useContext(HealthCtx).status;
}

const PROBE_TIMEOUT_MS = 5_000;

async function probeSupabase(): Promise<boolean> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url) return false;
  // Hit the health endpoint exposed by every Supabase project — it returns 200
  // with a tiny JSON body and does not require auth. We only care about the
  // status code; we abort early via AbortController to cap latency.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "x-client-info": "easy-locs-health-probe" },
    });
    return res.ok || res.status === 400; // 400 = "no table" but DB is reachable
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// ── Degraded-mode banner ──────────────────────────────────────────────────────

function DegradedBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: "hsl(30 95% 55%)",
        color: "#1a0000",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 16px",
        fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
        fontSize: 13,
        fontWeight: 600,
        gap: 12,
        boxShadow: "0 -2px 12px rgba(0,0,0,0.3)",
      }}
    >
      <span>
        ⚠️ Connexion à la base de données indisponible. Certaines fonctionnalités sont limitées.
        Vérifiez votre connexion internet ou réessayez dans quelques instants.
      </span>
      <button
        onClick={onDismiss}
        aria-label="Fermer"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 18,
          lineHeight: 1,
          color: "inherit",
          padding: "2px 6px",
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

interface HealthCheckProviderProps {
  children: ReactNode;
}

export function HealthCheckProvider({ children }: HealthCheckProviderProps) {
  const [status, setStatus] = useState<HealthStatus>("unknown");
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const hasProbed = useRef(false);

  function runProbe() {
    if (supabaseEnvMissing) {
      // EnvDiagnosticScreen already handles this case — no banner needed.
      setStatus("unknown");
      return;
    }
    probeSupabase()
      .then((ok) => {
        const next: HealthStatus = ok ? "ok" : "degraded";
        setStatus(next);
        if (typeof window !== "undefined") {
          (window as Record<string, unknown>).__EASYLOCS_DB_DEGRADED__ = !ok;
        }
        if (ok) setBannerDismissed(false); // auto-clear banner when back online
      })
      .catch(() => {
        setStatus("degraded");
      });
  }

  useEffect(() => {
    if (hasProbed.current) return;
    hasProbed.current = true;
    // Delay slightly so it never races with the first render commit.
    const t = setTimeout(runProbe, 1500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-probe when the user returns to the tab (handles network recovery).
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisible = () => {
      if (document.visibilityState === "visible") runProbe();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showBanner = status === "degraded" && !bannerDismissed;

  return (
    <HealthCtx.Provider value={{ status, dismissBanner: () => setBannerDismissed(true) }}>
      {children}
      {showBanner && <DegradedBanner onDismiss={() => setBannerDismissed(true)} />}
    </HealthCtx.Provider>
  );
}
