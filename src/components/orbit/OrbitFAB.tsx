/**
 * OrbitFAB — Smart Floating Action Button
 * Auto-closes after 5s inactivity. Click outside closes. No red X button.
 * Smooth fade+scale animations. Local state only.
 */
import { useState, useRef, useCallback, useEffect, memo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";
import {
  MessageCircle, Phone, Wallet, ScanLine, Store, Plus,
} from "lucide-react";

const ACTIONS = [
  { icon: MessageCircle, label: "Message", path: "/dashboard/communication", color: "hsl(var(--hud-cyan))" },
  { icon: Phone, label: "Call", path: "/dashboard/communication?section=calls", color: "hsl(var(--hud-success))" },
  { icon: Wallet, label: "Pay", path: "/wallet/hub", color: "hsl(var(--hud-warning))" },
  { icon: ScanLine, label: "Scan", path: "/qr/entry/scan", color: "hsl(var(--hud-purple))" },
  { icon: Store, label: "Shop", path: "/explore", color: "hsl(var(--hud-cyan-dim))" },
] as const;

const SWIPE_THRESHOLD = 60;
const AUTO_CLOSE_MS = 5000;

function OrbitFAB() {
  const [open, setOpen] = useState(false);
  const [swipeHint, setSwipeHint] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  // Auto-close timer management
  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => setOpen(false), AUTO_CLOSE_MS);
  }, [clearTimer]);

  // Start timer when menu opens, clear when closes
  useEffect(() => {
    if (open) startTimer();
    else clearTimer();
    return clearTimer;
  }, [open, startTimer, clearTimer]);

  // Click outside handler
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-orbit-fab]")) return;
      setOpen(false);
    };
    // Use setTimeout to avoid closing on the same tap that opened
    const id = setTimeout(() => {
      document.addEventListener("mousedown", handler);
      document.addEventListener("touchstart", handler);
    }, 50);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  const handlePanEnd = useCallback((_: any, info: PanInfo) => {
    setSwipeHint(null);
    const { offset } = info;
    if (offset.y < -SWIPE_THRESHOLD) { navigate("/dashboard/communication?section=calls"); return; }
    if (offset.x > SWIPE_THRESHOLD) { navigate("/wallet/hub"); return; }
    if (offset.x < -SWIPE_THRESHOLD) { navigate("/qr/entry/scan"); return; }
  }, [navigate]);

  const handlePan = useCallback((_: any, info: PanInfo) => {
    const { offset } = info;
    if (offset.y < -SWIPE_THRESHOLD) setSwipeHint("Call");
    else if (offset.x > SWIPE_THRESHOLD) setSwipeHint("Pay");
    else if (offset.x < -SWIPE_THRESHOLD) setSwipeHint("Scan");
    else setSwipeHint(null);
  }, []);

  const handleTap = useCallback(() => {
    setOpen(p => !p);
  }, []);

  const handleAction = useCallback((path: string) => {
    navigate(path);
    setOpen(false);
  }, [navigate]);

  const handleMenuInteraction = useCallback(() => {
    // Reset timer on any menu interaction
    startTimer();
  }, [startTimer]);

  return (
    <div data-orbit-fab className="fixed bottom-[calc(64px+env(safe-area-inset-bottom,8px))] right-4 z-50 flex flex-col-reverse items-end gap-2.5">
      {/* Action items */}
      <AnimatePresence>
        {open && ACTIONS.map((action, i) => (
          <motion.button
            key={action.label}
            data-orbit-fab
            initial={{ opacity: 0, scale: 0.4, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.4, y: 16 }}
            transition={{ delay: i * 0.035, duration: 0.25, type: "spring", stiffness: 500, damping: 28 }}
            onPointerDown={handleMenuInteraction}
            onClick={() => handleAction(action.path)}
            className="flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full active:scale-95 transition-transform min-h-[44px]"
            style={{
              background: "hsl(var(--hud-surface))",
              border: "1px solid hsl(var(--hud-border) / 0.12)",
              boxShadow: "0 4px 16px hsl(0 0% 0% / 0.25)",
            }}
          >
            <action.icon className="w-4.5 h-4.5" style={{ color: action.color }} strokeWidth={2} />
            <span className="text-xs font-semibold" style={{ color: "hsl(var(--hud-text))" }}>
              {action.label}
            </span>
          </motion.button>
        ))}
      </AnimatePresence>

      {/* Swipe hint */}
      <AnimatePresence>
        {swipeHint && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -top-12 right-0 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{
              background: "hsl(var(--hud-cyan))",
              color: "hsl(var(--hud-bg))",
              boxShadow: "0 2px 12px hsl(var(--hud-cyan) / 0.4)",
            }}
          >
            {swipeHint}
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAB button — always cyan gradient, + icon rotates */}
      <motion.button
        data-orbit-fab
        drag
        dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
        dragElastic={0.4}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        onClick={handleTap}
        whileTap={{ scale: 0.9 }}
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, hsl(var(--hud-cyan)), hsl(var(--hud-cyan-dim)))",
          boxShadow: "0 4px 20px hsl(var(--hud-cyan) / 0.35)",
        }}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2, type: "spring", stiffness: 300 }}
        >
          <Plus className="w-6 h-6 text-white" />
        </motion.div>
      </motion.button>
    </div>
  );
}

export default memo(OrbitFAB);
