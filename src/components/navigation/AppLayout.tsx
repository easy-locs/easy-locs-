/**
 * AppLayout — Global layout wrapper for the main app.
 * Renders children + MainBottomNav with page transition animations.
 */
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MainBottomNav from "./MainBottomNav";

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12 } },
};

export default function AppLayout({ children }: { children?: React.ReactNode }) {
  const { pathname } = useLocation();
  // Extract base route for grouping (avoid re-animating within same section)
  const routeGroup = pathname.split("/").slice(0, 2).join("/");

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      <main className="flex-1 overflow-y-auto pb-[calc(56px+env(safe-area-inset-bottom,0px))] lg:pb-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={routeGroup}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="min-h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <MainBottomNav />
    </div>
  );
}
