import { createRoot } from "react-dom/client";
import "./index.css";

const CHUNK_RELOAD_KEY = "easylocs_chunk_reload_once";

const safeReloadOnce = () => {
  try {
    const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1";
    if (!alreadyReloaded) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
      window.location.reload();
      return;
    }
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    window.location.reload();
  }
};

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

// Guard against HMR re-execution calling createRoot twice
const root = (rootElement as any).__reactRoot ?? createRoot(rootElement);
(rootElement as any).__reactRoot = root;

const BootScreen = ({
  title,
  description,
  showRetry = false,
}: {
  title: string;
  description?: string;
  showRetry?: boolean;
}) => (
  <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
    <div className="w-full max-w-md text-center space-y-4">
      <div className="mx-auto h-10 w-10 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
      <div className="space-y-2">
        <h1 className="text-lg font-semibold">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {showRetry ? (
        <button
          type="button"
          onClick={safeReloadOnce}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Reload app
        </button>
      ) : null}
    </div>
  </div>
);

const bootApp = async () => {
  root.render(<BootScreen title="Loading Easy-Locs…" description="Starting the application safely." />);

  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const appModule = await import("./App");
      const App = appModule?.default;
      if (!App) {
        // Module loaded but default export missing — chunk init race condition.
        // Wait a tick for module graph to settle, then retry.
        if (attempt < MAX_RETRIES) {
          console.warn(`[boot] attempt ${attempt}: default export missing, retrying in ${attempt * 200}ms…`);
          await new Promise((r) => setTimeout(r, attempt * 200));
          continue;
        }
        throw new Error("App module loaded but default export is missing after retries.");
      }
      root.render(<App />);
      return; // success
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        console.warn(`[boot] attempt ${attempt} failed, retrying…`, error);
        await new Promise((r) => setTimeout(r, attempt * 300));
        continue;
      }

      console.error("[boot] App failed to start after all retries:", error);

      const message =
        error instanceof Error
          ? error.message
          : "A startup error prevented the application from rendering.";

      root.render(
        <BootScreen
          title="Easy-Locs failed to start"
          description={message}
          showRetry
        />,
      );
    }
  }
};

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    safeReloadOnce();
  });

  window.addEventListener("unhandledrejection", (event) => {
    const message = String((event.reason as Error)?.message || event.reason || "").toLowerCase();
    if (message.includes("failed to fetch dynamically imported module") || message.includes("importing a module script failed")) {
      event.preventDefault();
      safeReloadOnce();
    }
  });

  // Intentionally keep the reload guard for the whole tab session.
  // This prevents protected-area lazy chunks from causing endless reload loops.
}

void bootApp();

const runDeferredInit = () => {
  // Install platform-wide cross-module reactions
  void import("./lib/shared/platform-bus")
    .then((mod) => mod?.installPlatformReactions?.())
    .catch((error) => {
      console.warn("[boot] platform-bus init skipped:", error);
    });

  void import("./lib/analytics")
    .then((mod) => mod?.initAnalytics?.())
    .catch((error) => {
      console.warn("[boot] analytics init skipped:", error);
    });

  void import("./lib/monitoring")
    .then((mod) => mod?.initMonitoring?.())
    .catch((error) => {
      console.warn("[boot] monitoring init skipped:", error);
    });
};

// Defer non-critical init to after first paint
if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
  window.requestIdleCallback(runDeferredInit);
} else {
  setTimeout(runDeferredInit, 2000);
}


