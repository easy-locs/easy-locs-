import React from "react";
import { emitRuntimeError } from "@/lib/shared/runtime-error-hub";

type State = { hasError: boolean };

export class AppCrashBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    emitRuntimeError({
      scope: "react",
      code: "crash_boundary",
      message: error?.message || "React crash",
      details: { raw: String(error) },
      createdAt: new Date().toISOString(),
    });
    void import("@/lib/analytics/sentry")
      .then(({ captureException }) => {
        captureException(error, { boundary: "AppCrashBoundary" });
      })
      .catch(() => {});
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "hsl(225 28% 7%)", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
          <div style={{ textAlign: "center", padding: 32, maxWidth: 380 }}>
            <div style={{ marginBottom: 24 }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: "0 auto 16px", display: "block" }}>
                <circle cx="24" cy="24" r="8.4" stroke="hsl(168 72% 44%)" strokeWidth="0.8" strokeOpacity="0.35" fill="none" />
                <circle cx="24" cy="24" r="14.4" stroke="hsl(168 72% 44%)" strokeWidth="0.8" strokeOpacity="0.27" fill="none" />
                <circle cx="24" cy="24" r="20.4" stroke="hsl(168 72% 44%)" strokeWidth="0.8" strokeOpacity="0.19" fill="none" />
                <circle cx="24" cy="24" r="2.4" fill="hsl(168 72% 44%)" />
              </svg>
              <p style={{ fontSize: 11, fontWeight: 600, color: "#f8fafc", marginBottom: 4 }}>
                Easy-Locs
              </p>
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#f8fafc", marginBottom: 8 }}>Something went wrong</p>
            <p style={{ fontSize: 13, color: "hsl(215 12% 52%)", marginBottom: 20, lineHeight: 1.5 }}>Connect • Locate • Grow</p>
            <button
              onClick={() => { try { caches.keys().then(n => Promise.all(n.map(k => caches.delete(k)))).finally(() => window.location.reload()); } catch { window.location.reload(); } }}
              style={{ background: "linear-gradient(135deg, hsl(168 72% 44%), hsl(168 78% 32%))", color: "hsl(225 28% 7%)", border: "none", padding: "10px 28px", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 0 20px hsl(168 72% 44% / 0.25)" }}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
