import { memo } from "react";
import { Link } from "react-router-dom";
import { useI18n, tSafe } from "@/lib/i18n";
import { motion } from "framer-motion";
import type { MenuNode } from "@/lib/menu/menu-types";

interface IconMenuCardProps {
  node: MenuNode;
  index?: number;
  onClick?: () => void;
}

export const IconMenuCard = memo(function IconMenuCard({ node, index = 0, onClick }: IconMenuCardProps) {
  const { t } = useI18n();
  const Icon = node.icon;
  const label = tSafe(t, node.labelKey, node.label);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.025, duration: 0.2 }}
    >
      <Link
        to={node.route}
        onClick={onClick}
        className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border/10 p-3 min-h-[72px] active:scale-[0.95] transition-all"
        style={{ background: "hsl(226 24% 14% / 0.03)" }}
      >
        {Icon ? (
          <Icon className="w-5 h-5 shrink-0" style={{ color: "hsl(226 24% 14%)" }} />
        ) : node.emoji ? (
          <span className="text-xl">{node.emoji}</span>
        ) : null}
        <span className="text-[10px] font-bold text-foreground leading-tight text-center line-clamp-2 w-full">
          {label}
        </span>
      </Link>
    </motion.div>
  );
});
