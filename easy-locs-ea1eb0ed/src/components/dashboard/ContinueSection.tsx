import { memo, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useI18n, tSafe } from "@/lib/i18n";
import type { ContinueItem } from "@/lib/dashboard/dashboard-intelligence";

const NAVY = "hsl(220 40% 18%)";
const GOLD = "hsl(38 65% 56%)";

interface Props {
  items: ContinueItem[];
}

const ContinueSection = memo(({ items }: Props) => {
  const { t } = useI18n();

  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: "var(--section-gap)" }}>
      <div className="flex items-center gap-1.5 px-1 mb-2">
        <RotateCcw className="w-3 h-3" style={{ color: GOLD }} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: NAVY }}>
          {tSafe(t, "home.continue_where", "Continue where you left off")}
        </span>
      </div>
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {items.map((item, idx) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
            >
              <Link
                to={item.route}
                className="flex items-center gap-3 px-3 py-3 rounded-xl active:scale-[0.98] transition-all"
                style={{
                  background: "linear-gradient(135deg, hsl(220 40% 18% / 0.04), hsl(38 65% 56% / 0.04))",
                  border: "1px solid hsl(38 65% 56% / 0.12)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                  style={{ background: `${GOLD}14` }}
                >
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
                  {item.progress > 0 && item.progress < 100 && (
                    <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: "hsl(var(--muted) / 0.2)", width: "100%" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${item.progress}%`, background: GOLD }}
                      />
                    </div>
                  )}
                </div>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" style={{ color: "hsl(var(--muted-foreground) / 0.3)" }} />
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});

export default ContinueSection;
