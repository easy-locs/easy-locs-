/**
 * CardShell — Outer container for all card variants.
 * Handles link wrapping, border, radius, shadow, and tap interaction.
 */
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface CardShellProps {
  to: string;
  className?: string;
  index?: number;
  layout?: "horizontal" | "vertical";
  children: ReactNode;
}

export function CardShell({ to, className, index = 0, layout = "horizontal", children }: CardShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: layout === "vertical" ? 10 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Link
        to={to}
        className={cn(
          layout === "vertical"
            ? "block rounded-2xl border border-border/30 bg-card overflow-hidden active:scale-[0.97] transition-transform shadow-sm"
            : "flex gap-3 p-2.5 rounded-2xl border border-border/20 bg-card active:scale-[0.98] transition-transform shadow-sm",
          className,
        )}
      >
        {children}
      </Link>
    </motion.div>
  );
}
