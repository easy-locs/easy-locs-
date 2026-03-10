import { motion, type Variants } from "framer-motion";
import { type ReactNode } from "react";

/* ─── Reusable page-level animation wrappers ─── */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
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
