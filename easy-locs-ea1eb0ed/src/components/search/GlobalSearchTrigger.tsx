import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Search, X } from "lucide-react";
import { useLocation } from "react-router-dom";

const UnifiedSearchBar = lazy(() => import("./UnifiedSearchBar"));

const EXCLUDED_PATHS = ["/explore", "/search", "/"];

export default function GlobalSearchTrigger() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

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

  if (isExcluded) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open search (Ctrl+K)"
        className="fixed bottom-20 right-4 z-[999] w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95"
        style={{
          background: "hsl(220 40% 18%)",
          border: "1px solid hsl(38 65% 56%)",
          color: "hsl(38 65% 56%)",
        }}
      >
        <Search className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center pt-16"
      style={{ background: "hsla(220, 40%, 8%, 0.85)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Search"
    >
      <div
        className="w-full max-w-lg mx-4 rounded-xl overflow-hidden shadow-2xl"
        style={{ background: "hsl(220 30% 14%)", border: "1px solid hsl(220 30% 22%)" }}
      >
        <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: "1px solid hsl(220 30% 22%)" }}>
          <span className="text-xs font-medium" style={{ color: "hsl(220 15% 55%)" }}>
            Search everywhere
          </span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close search"
            className="p-1 rounded"
            style={{ color: "hsl(220 15% 55%)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-3">
          <Suspense fallback={<div className="h-10" />}>
            <UnifiedSearchBar variant="fullscreen" autoFocus />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
