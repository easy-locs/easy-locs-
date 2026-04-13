/**
 * SmartSuggestions — AI-powered contextual suggestions strip.
 * Adapts based on user behavior, profile completeness, and usage patterns.
 */
import { memo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, Sparkles, Wallet, User, MessageCircle, TrendingUp } from "lucide-react";
import { useI18n, tSafe } from "@/lib/i18n";
import type { SmartSuggestion } from "@/lib/smart-core";

const ICON_MAP: Record<string, typeof Sparkles> = {
  profile: User,
  feature: Sparkles,
  performance: TrendingUp,
  engagement: MessageCircle,
};

const COLOR_MAP: Record<string, string> = {
  profile: "hsl(38 65% 56%)",
  feature: "hsl(270 60% 55%)",
  performance: "hsl(152 60% 42%)",
  engagement: "hsl(210 80% 52%)",
};

interface Props {
  suggestions: SmartSuggestion[];
  onDismiss: (id: string) => void;
}

const SmartSuggestions = memo(({ suggestions, onDismiss }: Props) => {
  const { t } = useI18n();

  if (suggestions.length === 0) return null;

  const visible = suggestions.slice(0, 3);

  return (
    <div className="mb-5 space-y-2">
      <div className="flex items-center gap-1.5 px-1">
        <Sparkles className="w-3 h-3" style={{ color: "hsl(38 65% 56%)" }} />
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "hsl(220 40% 18%)" }}>
          {tSafe(t, "home.smart_suggestions", "For You")}
        </span>
      </div>
      <AnimatePresence mode="popLayout">
        {visible.map((s) => {
          const Icon = ICON_MAP[s.type] || Sparkles;
          const color = COLOR_MAP[s.type] || "hsl(38 65% 56%)";
          return (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                to={s.route}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl active:scale-[0.98] transition-all"
                style={{ background: `${color}08`, border: `1px solid ${color}14` }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${color}14` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground line-clamp-2 break-words">
                    {tSafe(t, s.titleKey, s.titleKey)}
                  </p>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 break-words">
                    {tSafe(t, s.descKey, s.descKey)}
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground/30" />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDismiss(s.id);
                  }}
                  className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-transform"
                  style={{ background: "hsl(var(--muted) / 0.3)" }}
                >
                  <X className="w-3 h-3 text-muted-foreground/50" />
                </button>
              </Link>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
});

export default SmartSuggestions;
