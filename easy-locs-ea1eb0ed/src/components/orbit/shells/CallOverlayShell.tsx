/**
 * CallOverlayShell — Canonical shell for call UI overlays.
 * Slots: Header (caller info) | Center (status/timer) | Controls (bottom)
 */
import { memo, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  visible: boolean;
  header: ReactNode;
  center: ReactNode;
  controls: ReactNode;
}

function CallOverlayShell({ visible, header, center, controls }: Props) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="call-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-fullscreen flex flex-col"
          style={{ background: "hsl(var(--background) / 0.95)", backdropFilter: "blur(20px)" }}
        >
          {/* Header: caller identity */}
          <div className="shrink-0 pt-safe px-6 pt-12">{header}</div>

          {/* Center: status, timer, avatar */}
          <div className="flex-1 flex items-center justify-center">{center}</div>

          {/* Controls: mic, speaker, end call */}
          <div className="shrink-0 pb-safe px-6 pb-12">{controls}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(CallOverlayShell);
