/**
 * GlobalOverlayRenderer — Renders all global overlays from the SSOT overlay store.
 * Mount once at app root. No local overlay state anywhere else.
 */
import { memo } from "react";
import { useOverlayStore } from "@/stores/overlay.store";
import { AnimatePresence, motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";

function GlobalOverlayRendererInner() {
  const modal = useOverlayStore((s) => s.modal);
  const loader = useOverlayStore((s) => s.loader);
  const closeOverlay = useOverlayStore((s) => s.closeOverlay);

  return (
    <>
      {/* ── Global Modal ── */}
      <AnimatePresence>
        {modal && (
          <motion.div
            key="global-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-fullscreen flex items-center justify-center p-4"
            style={{ background: "hsl(0 0% 0% / 0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => closeOverlay("modal")}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
              style={{ background: "hsl(var(--background))" }}
              onClick={(e) => e.stopPropagation()}
            >
              {modal.title && (
                <h3 className="text-lg font-bold mb-2" style={{ color: "hsl(var(--foreground))" }}>
                  {modal.title}
                </h3>
              )}
              {modal.message && (
                <p className="text-sm mb-5" style={{ color: "hsl(var(--muted-foreground))" }}>
                  {modal.message}
                </p>
              )}
              <div className="flex items-center justify-end gap-3">
                {modal.onCancel && (
                  <button
                    onClick={() => { modal.onCancel?.(); closeOverlay("modal"); }}
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                    style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
                  >
                    Cancel
                  </button>
                )}
                {modal.onConfirm && (
                  <button
                    onClick={() => { modal.onConfirm?.(); closeOverlay("modal"); }}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                    style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                  >
                    Confirm
                  </button>
                )}
                {!modal.onConfirm && !modal.onCancel && (
                  <button
                    onClick={() => closeOverlay("modal")}
                    className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                    style={{ background: "hsl(var(--muted))", color: "hsl(var(--foreground))" }}
                  >
                    OK
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Global Blocking Loader ── */}
      <AnimatePresence>
        {loader && (
          <motion.div
            key="global-loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-fullscreen flex items-center justify-center"
            style={{ background: "hsl(0 0% 0% / 0.5)", backdropFilter: "blur(8px)" }}
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "hsl(var(--primary))" }} />
              {loader.message && (
                <p className="text-sm font-medium" style={{ color: "white" }}>
                  {loader.message}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export const GlobalOverlayRenderer = memo(GlobalOverlayRendererInner);
