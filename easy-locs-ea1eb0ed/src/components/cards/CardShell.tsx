/**
 * CardShell — Outer container for all card variants.
 * Handles link wrapping, border, radius, shadow, and tap interaction.
 * DS-hardened: min-w-0, overflow protection, null-safe children.
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
  if (!children) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: layout === "vertical" ? 10 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="min-w-0"
    >
      <Link
        to={to}
        data-card="shell"
        className={cn(
          "min-w-0",
          layout === "vertical"
            ? "block rounded-2xl border border-border/15 bg-card overflow-hidden active:scale-[0.97] transition-transform shadow-sm"
            : "flex gap-3 p-3 rounded-2xl border border-border/15 bg-card overflow-hidden active:scale-[0.97] transition-transform shadow-sm min-w-0",
          className,
        )}
      >
        {children}
      </Link>
    </motion.div>
  );
}
