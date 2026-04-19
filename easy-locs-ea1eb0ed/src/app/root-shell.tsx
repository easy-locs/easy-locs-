/**
 * RootShell — first-commit boot-flag guarantee.
 *
 * This is intentionally the ONLY component that owns the three boot signals:
 *   window.__EASYLOCS_REACT_MOUNTED__
 *   window.__EASYLOCS_BOOTED__
 *   window.dispatchEvent("react-splash-ready")
 *
 * It MUST stay ultra-minimal:
 *   - no auth, no query client, no theme, no analytics, no motion
 *   - no deferred providers, no hidden abstractions
 *   - only React as a dependency
 *
 * RootShell renders at the very first React commit (it is the outermost node
 * after BrowserRouter).  Its useEffect therefore fires before any provider,
 * auth layer, or route module has a chance to crash — guaranteeing the boot
 * flags are always set regardless of downstream failures.
 *
 * RootErrorBoundary (class-based, required by React's error boundary API)
 * renders an EXPLICIT, VISIBLE crash screen when App crashes.  It does NOT
 * silently swallow the error or pretend the app is healthy.
 */

import { Component, useEffect, type ErrorInfo, type ReactNode } from "react";

// ─── Explicit crash screen ────────────────────────────────────────────────────
// Shown when the entire App tree fails to render.  Must be styled inline so
// it renders even if CSS chunks failed to load.
class RootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface in console so Sentry's global handler (already installed in
    // main.tsx before createRoot) picks it up.
    console.error("[RootShell] App crashed — caught by RootErrorBoundary:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            background: "hsl(225 28% 7%)",
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 420, padding: "20px" }}>
            <h2 style={{ fontSize: 18, color: "#f8fafc", margin: "0 0 8px" }}>
              Application Error
            </h2>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "0 0 16px", wordBreak: "break-word" }}>
              {error.message || "An unexpected error occurred during startup."}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "linear-gradient(135deg, hsl(168 72% 44%), hsl(168 78% 32%))",
                color: "hsl(225 28% 7%)",
                border: "none",
                padding: "10px 24px",
                borderRadius: 10,
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
    return this.props.children;
  }
}

// ─── RootShell ────────────────────────────────────────────────────────────────
// The functional wrapper that owns the boot-flag commit point.
// useEffect runs after the first React commit (this component's own commit),
// before any child has a chance to throw.
export function RootShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      const w = window as Record<string, unknown>;
      w.__EASYLOCS_REACT_MOUNTED__ = true;
      w.__EASYLOCS_BOOTED__ = true;
    } catch {
      // Silently ignore — window may be unavailable in exotic SSR environments.
    }
    try {
      window.dispatchEvent(new Event("react-splash-ready"));
    } catch {
      // Ignore dispatch failures.
    }
  }, []);

  return <RootErrorBoundary>{children}</RootErrorBoundary>;
}
