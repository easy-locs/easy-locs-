/**
 * CategoryCard — Compact category entry point used in universe hub grids.
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
}

export default function CategoryCard({
  to,
  icon,
  label,
  count,
  className,
  index = 0,
}: CategoryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Link
        to={to}
        className={cn(
          "flex flex-col items-center gap-1.5 p-3 rounded-2xl border border-border/20 bg-card/50 active:scale-95 transition-transform text-center",
          className,
        )}
      >
        <span className="text-xl">{icon}</span>
        <span className="text-2xs font-bold text-foreground leading-tight">{label}</span>
        {count != null && (
          <span className="text-2xs text-muted-foreground">{count}+</span>
        )}
      </Link>
    </motion.div>
  );
}
