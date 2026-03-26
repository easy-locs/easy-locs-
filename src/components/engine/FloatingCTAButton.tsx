/**
 * FloatingCTAButton — Context-aware floating action button.
 * Shows "Contact now", "Quick pay", etc. based on AI decisions.
 */
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, CreditCard, MessageCircle } from "lucide-react";
import { eventBus } from "@/lib/core/event-bus";

interface FloatingAction {
  icon: "phone" | "pay" | "chat";
  label: string;
  route: string;
}

const ICONS = {
  phone: Phone,
  pay: CreditCard,
  chat: MessageCircle,
};

const ROUTE_ACTIONS: Record<string, FloatingAction> = {
  "/food": { icon: "phone", label: "Contact", route: "/orbit" },
  "/services": { icon: "phone", label: "Get quote", route: "/orbit" },
  "/marketplace": { icon: "chat", label: "Chat now", route: "/orbit" },
};

export function FloatingCTAButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const [action, setAction] = useState<FloatingAction | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(false);
    const base = Object.keys(ROUTE_ACTIONS).find((k) => location.pathname.startsWith(k));
    if (base) {
      setAction(ROUTE_ACTIONS[base]);
    } else {
      setAction(null);
    }
  }, [location.pathname]);

  useEffect(() => {
    const handler = (payload: any) => {
      if (payload?.decision?.type === "lead_inject") {
        setAction({ icon: "phone", label: "Contact now", route: "/orbit" });
        setDismissed(false);
      }
      if (payload?.decision?.type === "payment_boost") {
        setAction({ icon: "pay", label: "Quick pay", route: "/wallet/hub" });
        setDismissed(false);
      }
    };
    eventBus.on("AI_DECISION_EXECUTED", handler);
    return () => eventBus.off("AI_DECISION_EXECUTED", handler);
  }, []);

  if (!action || dismissed) return null;

  const Icon = ICONS[action.icon];

  return (
    <AnimatePresence>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate(action.route)}
        className="fixed bottom-24 right-4 z-50 flex items-center gap-2 rounded-full px-5 py-3 shadow-lg"
        style={{
          background: "hsl(var(--primary))",
          boxShadow: "0 8px 24px hsl(var(--primary) / 0.3)",
        }}
      >
        <Icon className="w-4 h-4 text-primary-foreground" />
        <span className="text-sm font-bold text-primary-foreground">{action.label}</span>
      </motion.button>
    </AnimatePresence>
  );
}
