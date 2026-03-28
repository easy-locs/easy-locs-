/**
 * CategoryCard — Compact category chip for universe hub grids.
 */
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

interface CategoryCardProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  count?: number;
  className?: string;
  index?: number;
  /** Active/selected state */
  active?: boolean;
}

export default function CategoryCard({
  to,
  icon,
  label,
  count,
  className,
  index = 0,
  active,
}: CategoryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
    >
      <Link
        to={to}
        className={cn(
          "flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border transition-all active:scale-95 text-center",
          active
            ? "bg-primary/10 border-primary/30 shadow-sm"
            : "bg-card/60 border-border/20 hover:border-border/40",
          className,
        )}
      >
        <span className="text-xl leading-none">{icon}</span>
        <span className="text-2xs font-bold text-foreground leading-snug line-clamp-2 break-words">{label}</span>
        {count != null && (
          <span className="text-[9px] text-muted-foreground font-medium">{count}+</span>
        )}
      </Link>
    </motion.div>
  );
}
