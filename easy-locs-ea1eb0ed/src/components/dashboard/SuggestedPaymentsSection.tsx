import { memo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CreditCard } from "lucide-react";
import { useI18n, tSafe } from "@/lib/i18n";
import type { SuggestedPayment } from "@/lib/dashboard/dashboard-intelligence";

const NAVY = "hsl(220 40% 18%)";
const GOLD = "hsl(38 65% 56%)";

const URGENCY_COLORS: Record<SuggestedPayment["urgency"], string> = {
  high: "hsl(0 72% 58%)",
  medium: GOLD,
  low: "hsl(210 80% 52%)",
};

interface Props {
  payments: SuggestedPayment[];
}

const SuggestedPaymentsSection = memo(({ payments }: Props) => {
  const { t } = useI18n();

  if (payments.length === 0) return null;

  return (
    <div style={{ marginBottom: "var(--section-gap)" }}>
      <div className="flex items-center gap-1.5 px-1 mb-2">
        <CreditCard className="w-3 h-3" style={{ color: GOLD }} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: NAVY }}>
          {tSafe(t, "home.suggested_payments", "Suggested Payments")}
        </span>
      </div>
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {payments.map((p, idx) => {
            const urgencyColor = URGENCY_COLORS[p.urgency] || GOLD;
            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
              >
                <Link
                  to={p.route}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl active:scale-[0.98] transition-all"
                  style={{
                    background: `${urgencyColor}06`,
                    border: `1px solid ${urgencyColor}18`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                    style={{ background: `${urgencyColor}12` }}
                  >
                    {p.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{p.title}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{p.subtitle}</p>
                  </div>
                  {p.amount !== null && (
                    <span className="text-xs font-extrabold tabular-nums shrink-0" style={{ color: urgencyColor }}>
                      {p.amount.toFixed(0)} {p.currency}
                    </span>
                  )}
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

export default SuggestedPaymentsSection;
