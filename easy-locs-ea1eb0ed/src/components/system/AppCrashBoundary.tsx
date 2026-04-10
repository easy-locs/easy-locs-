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
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "#0F1117", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ textAlign: "center", padding: 24 }}>
            <p style={{ fontSize: 18, fontWeight: 600, color: "#f8fafc", marginBottom: 16 }}>App crashed</p>
            <button
              onClick={() => { try { caches.keys().then(n => Promise.all(n.map(k => caches.delete(k)))).finally(() => window.location.reload()); } catch { window.location.reload(); } }}
              style={{ background: "#D4A853", color: "#0F1117", border: "none", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
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
