/**
 * FullscreenMediaViewer — Canonical fullscreen media viewer.
 * Supports: image, video, grouped navigation (next/prev), download, safe close.
 * Isolated from thread state. Mobile-safe with safe-area layout.
 */
import { memo, useCallback, useEffect, useState } from "react";
import { X, Download, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { useGroupedMediaViewer } from "@/families/media/media-group";
import { saveMediaToGallery } from "@/domains/orbit/services/gallery-save.service";
import { toast } from "sonner";

function FullscreenMediaViewerInner() {
  const { isOpen, items, currentIndex, close, next, prev, goTo } = useGroupedMediaViewer();
  const [imageLoaded, setImageLoaded] = useState(false);

  const currentItem = items[currentIndex];
  const hasMultiple = items.length > 1;

  // Reset image loaded state when item changes
  useEffect(() => {
    setImageLoaded(false);
  }, [currentIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, close, next, prev]);

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  const handleDownload = useCallback(() => {
    if (!currentItem) return;
    const a = document.createElement("a");
    a.href = currentItem.url;
    a.download = currentItem.url.split("/").pop() || "download";
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [currentItem]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) close();
    },
    [close],
  );

  if (!isOpen || !currentItem) return null;

  const isImage = currentItem.kind === "image";
  const isVideo = currentItem.kind === "video";

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: "hsl(0 0% 0% / 0.95)" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{
          paddingTop: "max(env(safe-area-inset-top, 12px), 12px)",
          height: "calc(48px + max(env(safe-area-inset-top, 0px), 0px))",
        }}
      >
        <button
          onClick={close}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ background: "hsl(0 0% 100% / 0.1)" }}
        >
          <X className="h-5 w-5 text-white" />
        </button>

        {hasMultiple && (
          <span className="text-sm font-medium text-white/80">
            {currentIndex + 1} / {items.length}
          </span>
        )}

        <button
          onClick={handleDownload}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
          style={{ background: "hsl(0 0% 100% / 0.1)" }}
        >
          <Download className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Main media area */}
      <div
        className="flex-1 min-h-0 flex items-center justify-center relative"
        onClick={handleBackdropClick}
      >
        {isImage && (
          <img
            src={currentItem.url}
            alt="Media"
            className={`max-w-full max-h-full object-contain transition-opacity duration-200 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImageLoaded(true)}
            draggable={false}
          />
        )}

        {isVideo && (
          <video
            key={currentItem.url}
            src={currentItem.url}
            controls
            autoPlay
            playsInline
            className="max-w-full max-h-full"
            style={{ outline: "none" }}
          />
        )}

        {!isImage && !isVideo && (
          <div className="text-center space-y-3">
            <p className="text-white/60 text-sm">Cannot preview this file</p>
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors"
              style={{ background: "hsl(0 0% 100% / 0.15)" }}
            >
              Download
            </button>
          </div>
        )}

        {/* Prev/Next arrows for grouped */}
        {hasMultiple && currentIndex > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "hsl(0 0% 0% / 0.5)" }}
          >
            <ChevronLeft className="h-5 w-5 text-white" />
          </button>
        )}
        {hasMultiple && currentIndex < items.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "hsl(0 0% 0% / 0.5)" }}
          >
            <ChevronRight className="h-5 w-5 text-white" />
          </button>
        )}
      </div>

      {/* Bottom dots for grouped */}
      {hasMultiple && (
        <div
          className="flex items-center justify-center gap-1.5 py-3 shrink-0"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 12px), 12px)" }}
        >
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: idx === currentIndex ? "white" : "hsl(0 0% 100% / 0.3)",
                transform: idx === currentIndex ? "scale(1.3)" : "scale(1)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const FullscreenMediaViewer = memo(FullscreenMediaViewerInner);
FullscreenMediaViewer.displayName = "FullscreenMediaViewer";
