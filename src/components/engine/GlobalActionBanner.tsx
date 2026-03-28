/**
 * GlobalActionBanner — Renders the highest-priority AI decision as a visible banner.
 * Supports: payment_boost, wallet_activate, lead_inject, orbit_engage, event_mode.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, CreditCard, Wallet, Phone, MessageCircle, Sparkles } from "lucide-react";
import { eventBus } from "@/lib/core/event-bus";

interface ActiveAction {
  id: string;
  type: string;
  title: string;
  description: string;
  cta?: string;
  route?: string;
  gradient?: string;
  icon?: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  payment_boost: <CreditCard className="w-5 h-5 text-primary-foreground" />,
  wallet_activate: <Wallet className="w-5 h-5 text-primary-foreground" />,
  lead_inject: <Phone className="w-5 h-5 text-primary-foreground" />,
  orbit_engage: <MessageCircle className="w-5 h-5 text-primary-foreground" />,
  event_mode: <Sparkles className="w-5 h-5 text-primary-foreground" />,
};

const ACTION_GRADIENTS: Record<string, string> = {
  payment_boost: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8))",
  wallet_activate: "linear-gradient(135deg, hsl(142, 71%, 45%), hsl(142, 71%, 35%))",
  lead_inject: "linear-gradient(135deg, hsl(221, 83%, 53%), hsl(221, 83%, 43%))",
  orbit_engage: "linear-gradient(135deg, hsl(280, 60%, 50%), hsl(280, 60%, 40%))",
  event_mode: "linear-gradient(135deg, hsl(45, 93%, 47%), hsl(30, 80%, 40%))",
};

export function GlobalActionBanner() {
  const navigate = useNavigate();
  const [actions, setActions] = useState<ActiveAction[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handler = (payload: any) => {
      if (!payload?.decision) return;
      const d = payload.decision;
      const action: ActiveAction = {
        id: d.id || crypto.randomUUID(),
        type: d.type || "general",
        title: d.reason || "Optimization active",
        description: d.expectedImpact || "Improving your experience",
        cta: d.cta || "View",
        route: d.route,
      };
      setActions((prev) => {
        if (prev.some((a) => a.type === action.type)) return prev;
        return [...prev, action].slice(-3);
      });
    };

    eventBus.on("AI_DECISION_EXECUTED", handler);
    return () => eventBus.off("AI_DECISION_EXECUTED", handler);
  }, []);

  const visible = actions.filter((a) => !dismissed.has(a.id));
  if (!visible.length) return null;

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {visible.map((action) => (
          <motion.div
            key={action.id}
            layout
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            className="rounded-2xl p-4 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
            style={{ background: ACTION_GRADIENTS[action.type] || ACTION_GRADIENTS.payment_boost }}
            onClick={() => action.route && navigate(action.route)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setDismissed((p) => new Set(p).add(action.id)); }}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"
            >
              <X className="w-3 h-3 text-white" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                {ACTION_ICONS[action.type] || <Sparkles className="w-5 h-5 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white line-clamp-2 break-words leading-snug">{action.title}</p>
                <p className="text-[11px] text-white/70 line-clamp-2 break-words leading-snug">{action.description}</p>
              </div>
            </div>
            {action.cta && (
              <div className="mt-2.5 inline-block px-4 py-1.5 rounded-xl text-xs font-bold bg-white/20 text-white backdrop-blur-sm">
                {action.cta} →
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
