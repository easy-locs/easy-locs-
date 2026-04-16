import { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

const GOLD = "hsl(var(--accent))";

interface Props {
  suggestion: { text: string; route: string; icon: string } | null;
}

const ContextualNudge = memo(({ suggestion }: Props) => {
  if (!suggestion) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      style={{ marginBottom: "var(--section-gap-compact)" }}
    >
      <Link
        to={suggestion.route}
        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl active:scale-[0.98] transition-all"
        style={{
          background: "linear-gradient(135deg, hsl(226 24% 14% / 0.06), hsl(var(--accent) / 0.06))",
          border: `1px solid ${GOLD}18`,
        }}
      >
        <span className="text-base shrink-0">{suggestion.icon}</span>
        <p className="text-[0.6875rem] font-bold text-foreground flex-1 truncate">{suggestion.text}</p>
        <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: `${GOLD}80` }} />
      </Link>
    </motion.div>
  );
});

export default ContextualNudge;
