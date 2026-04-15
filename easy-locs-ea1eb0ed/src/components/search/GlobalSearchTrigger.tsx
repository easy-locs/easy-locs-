import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { Search, X } from "lucide-react";
import { useLocation } from "react-router-dom";

const UnifiedSearchBar = lazy(() => import("./UnifiedSearchBar"));

const EXCLUDED_PATHS = ["/explore", "/search", "/"];

export default function GlobalSearchTrigger() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const inputContainerRef = useRef<HTMLDivElement>(null);

  const isExcluded = EXCLUDED_PATHS.some((p) => location.pathname === p);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    },
    [open]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        const input = inputContainerRef.current?.querySelector("input");
        input?.focus();
      });
    }
  }, [open]);

  if (isExcluded) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open search (Ctrl+K)"
        className="fixed bottom-20 right-4 z-fullscreen w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
        style={{
          background: "hsl(226 24% 11%)",
          border: "1px solid hsl(var(--accent) / 0.3)",
          color: "hsl(var(--accent))",
          boxShadow: "0 4px 20px hsl(0 0% 0% / 0.3), 0 0 0 1px hsl(var(--accent) / 0.1)",
        }}
      >
        <Search className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-fullscreen flex items-start justify-center pt-16"
      style={{ background: "hsla(228, 28%, 7%, 0.88)", backdropFilter: "blur(12px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div
        className="w-full max-w-lg mx-4 rounded-xl overflow-hidden shadow-2xl"
        style={{ background: "hsl(226 24% 10%)", border: "1px solid hsl(0 0% 100% / 0.06)", boxShadow: "0 24px 80px hsl(0 0% 0% / 0.5), 0 8px 24px hsl(0 0% 0% / 0.3)" }}
      >
        <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.05)" }}>
          <span className="text-xs font-medium" style={{ color: "hsl(0 0% 100% / 0.4)" }}>
            Search everywhere
          </span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close search"
            className="p-1 rounded"
            style={{ color: "hsl(0 0% 100% / 0.4)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3" ref={inputContainerRef}>
          <Suspense fallback={<div className="h-10" />}>
            <UnifiedSearchBar variant="compact" autoFocus />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
