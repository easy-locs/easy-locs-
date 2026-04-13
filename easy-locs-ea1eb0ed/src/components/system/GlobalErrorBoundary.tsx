/**
 * GlobalErrorBoundary — Unified error boundary for the entire app tree.
 *
 * TASK 6: Merges AppCrashBoundary and ErrorBoundary into one intelligent boundary.
 * - Catches all React render errors (previously spread across two separate boundaries)
 * - Shows a recovery UI for fatal crashes
 * - Accepts an optional `fallback` prop for feature-level boundaries (FeatureErrorBoundary)
 * - Reports to Sentry + runtime error hub + AI audit trigger
 */
import React from "react";
import { emitRuntimeError } from "@/lib/shared/runtime-error-hub";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class GlobalErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    emitRuntimeError({
      scope: "react",
      code: "crash_boundary",
      message: error?.message || "React crash",
      details: { raw: String(error), componentStack: info.componentStack },
      createdAt: new Date().toISOString(),
    });

    void import("@/lib/analytics/sentry")
      .then(({ captureException }) => {
        captureException(error, {
          boundary: "GlobalErrorBoundary",
          componentStack: info.componentStack,
        });
      })
      .catch(() => {});

    void import("@/lib/ai-audit/triggers")
      .then(({ reportUIRegression }) => {
        reportUIRegression(
          info.componentStack?.split("\n")[1]?.trim() || "Unknown component",
          error.message,
        );
      })
      .catch(() => {});
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback !== undefined) return this.props.fallback;

    return (
      <div
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "#0F1117",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <p style={{ fontSize: 18, fontWeight: 600, color: "#f8fafc", marginBottom: 16 }}>
            App crashed
          </p>
          <button
            onClick={() => {
              try {
                caches
                  .keys()
                  .then((n) => Promise.all(n.map((k) => caches.delete(k))))
                  .finally(() => window.location.reload());
              } catch {
                window.location.reload();
              }
            }}
            style={{
              background: "#D4A853",
              color: "#0F1117",
              border: "none",
              padding: "10px 24px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
