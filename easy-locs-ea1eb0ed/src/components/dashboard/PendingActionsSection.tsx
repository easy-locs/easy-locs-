import { memo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, AlertCircle } from "lucide-react";
import { useI18n, tSafe } from "@/lib/i18n";
import type { PendingAction } from "@/lib/dashboard/dashboard-intelligence";

const NAVY = "hsl(220 40% 18%)";
const GOLD = "hsl(38 65% 56%)";

const URGENCY_STYLES: Record<PendingAction["urgency"], { bg: string; border: string; dot: string }> = {
  high: {
    bg: "hsl(0 72% 58% / 0.06)",
    border: "hsl(0 72% 58% / 0.18)",
    dot: "hsl(0 72% 58%)",
  },
  medium: {
    bg: `${GOLD}08`,
    border: `${GOLD}18`,
    dot: GOLD,
  },
  low: {
    bg: "hsl(210 80% 52% / 0.06)",
    border: "hsl(210 80% 52% / 0.12)",
    dot: "hsl(210 80% 52%)",
  },
};

interface Props {
  actions: PendingAction[];
}

const PendingActionsSection = memo(({ actions }: Props) => {
  const { t } = useI18n();

  if (actions.length === 0) return null;

  return (
    <div style={{ marginBottom: "var(--section-gap)" }}>
      <div className="flex items-center gap-1.5 px-1 mb-2">
        <AlertCircle className="w-3 h-3" style={{ color: GOLD }} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: NAVY }}>
          {tSafe(t, "home.pending_actions", "Action Required")}
        </span>
      </div>
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {actions.map((action, idx) => {
            const style = URGENCY_STYLES[action.urgency] || URGENCY_STYLES.low;
            return (
              <motion.div
                key={action.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
              >
                <Link
                  to={action.route}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl active:scale-[0.98] transition-all"
                  style={{ background: style.bg, border: `1px solid ${style.border}` }}
                >
                  <div className="relative">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                      style={{ background: `${style.dot}14` }}
                    >
                      {action.icon}
                    </div>
                    {action.urgency === "high" && (
                      <div
                        className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                        style={{ background: style.dot, boxShadow: `0 0 6px ${style.dot}` }}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{action.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{action.subtitle}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default PendingActionsSection;
