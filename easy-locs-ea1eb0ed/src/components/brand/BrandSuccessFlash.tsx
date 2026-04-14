/**
 * Brand recall — micro logo animation on success actions.
 * Shows a brief EL icon + gold pulse on success events.
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EasyLocsIcon } from "./EasyLocsLogo";

let _trigger: (() => void) | null = null;

/** Call this from anywhere to show a brief brand flash */
export function triggerBrandFlash() {
  _trigger?.();
}

export default function BrandSuccessFlash() {
  const [visible, setVisible] = useState(false);

  _trigger = useCallback(() => {
    setVisible(true);
    setTimeout(() => setVisible(false), 1200);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed top-6 left-1/2 z-[9998] pointer-events-none"
          initial={{ opacity: 0, y: -20, x: "-50%", scale: 0.7 }}
          animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
          exit={{ opacity: 0, y: -10, x: "-50%", scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div
            className="p-3 rounded-2xl"
            style={{
              background: "hsl(225 25% 9% / 0.95)",
              boxShadow: "0 0 30px hsl(168 72% 44% / 0.3), 0 4px 20px hsl(225 25% 7% / 0.5)",
              backdropFilter: "blur(12px)",
            }}
          >
            <EasyLocsIcon size={28} animate />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
