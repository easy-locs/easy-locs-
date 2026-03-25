/**
 * SplashScreen — Non-blocking splash overlay. Smooth seamless transition.
 * No flicker, no gap — immediate render with clean fade-out.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import EasyLocsLogo from "./EasyLocsLogo";

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShow(false), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ background: "hsl(220 45% 8%)" }}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <EasyLocsLogo variant="splash" size="lg" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {!show && children}
    </>
  );
}
