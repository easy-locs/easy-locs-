/**
 * AdminShellChunkBoundary — Dedicated lazy + ErrorBoundary wrapper for the
 * unified admin control shell.
 *
 * Why this exists (audit #946):
 *   The generic `safeLazy()` in `src/app/app-route-registry.tsx` intercepts
 *   chunk-load errors and renders its own grey fallback. That works as a
 *   last-resort safety net but is not specific enough for the admin shell —
 *   when the user opens /admin/control/* on a stale build or with a flaky
 *   network we want the shared `AdminAccessDenied` panel with
 *   `reason="chunk-load-failed"` so the message, retry button, and
 *   diagnostics are consistent with the other admin denial paths.
 *
 *   This component does NOT replace `safeLazy()` for the rest of the app.
 *   It only wires the admin shell to its own boundary so chunk failures on
 *   that route surface an explicit, branded message instead of falling
 *   through to a silent or generic state.
 */
import { Component, Suspense, lazy, type ErrorInfo, type ReactNode } from "react";
import AdminAccessDenied from "@/components/auth/AdminAccessDenied";

// Independent lazy import — bypasses safeLazy on purpose so chunk-load
// errors propagate to our boundary below instead of being swallowed by
// the generic fallback.
const AdminControlShellLazy = lazy(
  () => import("@/pages/admin/AdminControlShellPage"),
);

function ShellLoadingSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-background px-4 pt-6">
      <div className="h-6 w-32 rounded-lg skeleton-premium mb-4" />
      <div className="h-28 w-full rounded-2xl skeleton-premium mb-4" />
      <div className="space-y-3">
        <div className="h-4 w-3/4 rounded skeleton-premium" />
        <div className="h-4 w-1/2 rounded skeleton-premium" />
      </div>
    </div>
  );
}

interface BoundaryState {
  error: Error | null;
}

class ChunkBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Best-effort observability log; fall through silently if logger missing.
    console.error("[AdminShellChunkBoundary]", error.message, info.componentStack);
    void import("@/lib/observability/structured-logger")
      .then(({ structuredLogger }) => {
        structuredLogger.error(
          "admin",
          "admin_shell.chunk_load_failed",
          error.message,
          { component_stack: info.componentStack?.slice(0, 500) },
        );
      })
      .catch(() => {});
  }

  private handleRetry = () => {
    this.setState({ error: null });
    // Force a clean reload so a freshly cached chunk can be requested.
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <AdminAccessDenied
          reason="chunk-load-failed"
          onRetry={this.handleRetry}
        />
      );
    }
    return this.props.children;
  }
}

/**
 * Drop-in replacement for `<AdminControlShellPage />` in admin routes.
 * Routes wrapping this should still keep their auth guards
 * (ProtectedRoute / SuperAdminGate) on the outside.
 */
export default function AdminShellWithChunkBoundary() {
  return (
    <ChunkBoundary>
      <Suspense fallback={<ShellLoadingSkeleton />}>
        <AdminControlShellLazy />
      </Suspense>
    </ChunkBoundary>
  );
}
