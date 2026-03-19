/**
 * Easy-Locs Splash Screen — premium app launch experience.
 * Duration: ~1.5s then fades out.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import EasyLocsLogo from "./EasyLocsLogo";

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShow(false), 1600);
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
            exit={{ opacity: 0, transition: { duration: 0.4, ease: "easeInOut" } }}
          >
            <EasyLocsLogo variant="splash" size="lg" animate />
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
