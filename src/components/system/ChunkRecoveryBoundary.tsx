import { useEffect, useMemo, useState } from "react";

import { forceCleanRefresh } from "@/lib/version-check";

const RELOAD_KEY = "el_chunk_reload_once_v1";

function isChunkError(err: unknown) {
  const msg =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("Load failed") ||
    msg.includes("Loading chunk") ||
    msg.includes("ChunkLoadError")
  );
}

export default function ChunkRecoveryBoundary({
  children,
}: {
  children: React.ReactNode;
}) {
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (isChunkError(event.error || event.message)) {
        setError(event.error || event.message);
      }
    };
    const onUnhandled = (event: PromiseRejectionEvent) => {
      if (isChunkError(event.reason)) {
        setError(event.reason);
      }
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandled);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, []);

  const message = useMemo(() => {
    if (!error) return "";
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    try {
      return JSON.stringify(error);
    } catch {
      return "Unknown loading error";
    }
  }, [error]);

  useEffect(() => {
    if (!error) return;
    const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) === "1";
    if (!alreadyReloaded) {
      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
    }
  }, [error]);

  const handleHardReset = async () => {
    try {
      sessionStorage.removeItem(RELOAD_KEY);
      localStorage.removeItem("el_runtime_debug_events_v1");
      await forceCleanRefresh();
    } catch {
      window.location.reload();
    }
  };

  if (!error) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 space-y-4 text-center">
        <div className="text-2xl font-semibold">Unable to load Easy-Locs</div>
        <div className="text-sm text-muted-foreground">
          A network, cache, or outdated app bundle blocked this page.
        </div>
        <div className="text-xs text-muted-foreground break-words">
          {message}
        </div>
        <button
          onClick={handleHardReset}
          className="w-full rounded-xl px-4 py-3 bg-primary text-primary-foreground font-medium"
        >
          Clear cache and reload
        </button>
      </div>
    </div>
  );
}
