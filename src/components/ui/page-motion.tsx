import { motion, type Variants, AnimatePresence } from "framer-motion";
import { type ReactNode } from "react";

/* ─── Reusable page-level animation wrappers ─── */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] } },
};

/** Animates children with staggered fade-up */
export const PageHeader = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.4, ease: "easeOut" }} className={className}>
    {children}
  </motion.div>
);

/** Grid container that staggers children */
export const StaggerGrid = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <motion.div initial="hidden" animate="visible" variants={stagger} className={className}>
    {children}
  </motion.div>
);

/** Single stagger item */
export const StaggerItem = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <motion.div variants={fadeIn} className={className}>
    {children}
  </motion.div>
);

/** Animated section with delay based on index */
export const AnimatedSection = ({ children, index = 0, className = "" }: { children: ReactNode; index?: number; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1 + index * 0.06, duration: 0.4, ease: "easeOut" }}
    className={className}
  >
    {children}
  </motion.div>
);

/** Page wrapper with entry animation */
export const PageContainer = ({ children, className = "max-w-5xl mx-auto" }: { children: ReactNode; className?: string }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
    className={className}
  >
    {children}
  </motion.div>
);

/** Premium page transition — smooth scale + fade for route transitions */
export const PageTransition = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 12, scale: 0.995 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    className={className}
  >
    {children}
  </motion.div>
);

/** Floating entrance from bottom — great for cards and modals */
export const FloatUp = ({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
    transition={{ delay, duration: 0.5, ease: "easeOut" }}
    className={className}
  >
    {children}
  </motion.div>
);

/** Shimmer effect wrapper for premium buttons/CTAs */
export const ShimmerWrap = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`relative overflow-hidden ${className}`}>
    {children}
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none"
      animate={{ x: ["-100%", "200%"] }}
      transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 4 }}
    />
  </div>
);
