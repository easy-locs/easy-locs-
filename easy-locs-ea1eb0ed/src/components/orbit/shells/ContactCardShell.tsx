/**
 * ContactCardShell — Canonical shell for contact profile display.
 * Slots: Avatar | Identity | Actions | Info | DangerZone
 */
import { memo, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

function ContactCardShell({ open, onClose, children }: Props) {
  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="contact-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-fullscreen"
            style={{ background: "hsl(var(--background) / 0.6)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />
          <motion.div
            key="contact-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-fullscreen rounded-t-2xl max-h-[85vh] overflow-y-auto"
            style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border) / 0.2)" }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full" style={{ background: "hsl(var(--muted-foreground) / 0.3)" }} />
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default memo(ContactCardShell);
