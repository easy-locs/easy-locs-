import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { findMissingRequiredEnv, type MissingEnvReport } from "@/lib/integrations";

/**
 * Dev-only banner that lists integrations missing required env vars.
 *
 * Shown as a small fixed footer chip in development so engineers notice the
 * misconfiguration without losing the app to a hard throw on boot. Hidden in
 * production and never blocks rendering.
 *
 * Scope: only renders on internal/admin routes (paths under `/admin`) so it
 * never overlays public/visitor-facing pages. The boot-time console warning
 * about missing env vars is emitted once from `main.tsx` regardless of route,
 * so engineers don't lose that signal.
 */
export default function MissingIntegrationsBanner() {
  const [missing, setMissing] = useState<MissingEnvReport[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!isAdminRoute) return;
    try {
      setMissing(findMissingRequiredEnv());
    } catch {
      // Defensive: registry should never throw, but never let the banner
      // crash the tree.
    }
  }, [isAdminRoute]);

  if (!import.meta.env.DEV) return null;
  if (!isAdminRoute) return null;
  if (dismissed) return null;
  if (missing.length === 0) return null;

  const summary = missing.map((m) => m.label).join(", ");
  const detail = missing
    .map((m) => `${m.label}: ${m.missing.join(", ")}`)
    .join(" \u2022 ");

  return (
    <div
      role="status"
      aria-label="Missing integration environment variables"
      style={{
        position: "fixed",
        left: 12,
        bottom: 12,
        zIndex: 99998,
        maxWidth: 380,
        padding: "8px 12px",
        background: "rgba(20, 24, 32, 0.92)",
        color: "#fde68a",
        border: "1px solid rgba(251, 191, 36, 0.4)",
        borderRadius: 10,
        fontSize: 12,
        fontFamily: "system-ui, -apple-system, sans-serif",
        boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontWeight: 700 }}>Integrations not configured</span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            cursor: "pointer",
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      <div style={{ color: "#e2e8f0", marginBottom: 4 }}>{summary}</div>
      <div style={{ color: "#94a3b8", fontSize: 11 }}>{detail}</div>
      <div style={{ marginTop: 6 }}>
        <a
          href="/admin/diagnostics"
          style={{ color: "#5eead4", fontSize: 11, textDecoration: "underline" }}
        >
          Open diagnostics →
        </a>
      </div>
    </div>
  );
}
