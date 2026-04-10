import { useEffect, useMemo, useState } from "react";

import { forceCleanRefresh } from "@/lib/version-check";

const RELOAD_KEY = "el_chunk_reload_v2";
const MAX_AUTO_RETRIES = 3;

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
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (isChunkError(event.error || event.message)) {
        event.preventDefault();
        setError(event.error || event.message);
      }
    };
    const onUnhandled = (event: PromiseRejectionEvent) => {
      if (isChunkError(event.reason)) {
        event.preventDefault();
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
    const retryCount = parseInt(sessionStorage.getItem(RELOAD_KEY) || "0", 10);
    if (retryCount < MAX_AUTO_RETRIES) {
      sessionStorage.setItem(RELOAD_KEY, String(retryCount + 1));
      void (async () => {
        try {
          await forceCleanRefresh();
        } catch {
          window.location.reload();
        }
      })();
    }
  }, [error]);

  const handleHardReset = async () => {
    setRecovering(true);
    try {
      sessionStorage.removeItem(RELOAD_KEY);
      localStorage.removeItem("el_runtime_debug_events_v1");
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
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
          disabled={recovering}
          className="w-full rounded-xl px-4 py-3 bg-primary text-primary-foreground font-medium disabled:opacity-60"
        >
          {recovering ? "Clearing cache…" : "Clear cache and reload"}
        </button>
      </div>
    </div>
  );
}
