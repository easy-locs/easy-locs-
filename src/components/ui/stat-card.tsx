import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion, animate } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  icon: React.ElementType;
  iconClassName?: string;
  label: string;
  value: string;
  sub?: string;
  path?: string;
  valueClassName?: string;
  className?: string;
}

/**
 * Animated number counter for stat values.
 * Detects numeric values and animates from 0 to target.
 */
function AnimatedValue({ value, className }: { value: string; className?: string }) {
  const isNumeric = /^[\d\s.,]+[€$£¥₹%]?$/.test(value.trim());
  const ref = useRef<HTMLSpanElement>(null);
  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    if (!isNumeric) {
      setDisplayed(value);
      return;
    }

    // Extract numeric part
    const cleaned = value.replace(/[^\d.,]/g, "").replace(",", ".");
    const target = parseFloat(cleaned);
    if (isNaN(target)) {
      setDisplayed(value);
      return;
    }

    const suffix = value.replace(/[\d\s.,]+/, "").trim();
    const hasDecimals = cleaned.includes(".") && cleaned.split(".")[1]?.length > 0;
    const decimals = hasDecimals ? Math.min(cleaned.split(".")[1].length, 2) : 0;

    try {
      const motionVal = { val: 0 };
      const controls = animate(motionVal, { val: target }, {
        duration: 0.8,
        ease: "easeOut",
        onUpdate: (latest) => {
          try {
            const v = typeof latest === "object" && latest !== null && "val" in latest
              ? (latest as { val: number }).val
              : typeof latest === "number" ? latest : 0;
            const formatted = v.toLocaleString(undefined, {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            });
            setDisplayed(`${formatted}${suffix ? ` ${suffix}` : ""}`);
          } catch {
            setDisplayed(value);
          }
        },
      });

      return () => controls.stop();
    } catch {
      setDisplayed(value);
    }

    return undefined;
  }, [value, isNumeric]);

  return <span className={className}>{displayed}</span>;
}

/**
 * Uniform stat/KPI card used across dashboard, finances, fiscal, tenant pages.
 * Structure: Icon → Label → Value → Sub-text, all vertically stacked with equal height.
 * Features: animated number counter, hover micro-interactions.
 */
const StatCard = ({
  icon: Icon,
  iconClassName = "text-muted-foreground",
  label,
  value,
  sub,
  path,
  valueClassName,
  className,
}: StatCardProps) => {
  const content = (
    <div
      className={cn(
        "flex flex-col h-full bg-card rounded-xl p-4 sm:p-5 shadow-card border border-border/50 transition-all duration-300 relative overflow-hidden min-h-[120px] sm:min-h-[140px]",
        path && "hover:shadow-card-hover hover:border-accent/30 group cursor-pointer",
        className,
      )}
    >
      {/* Hover accent line */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-0.5 bg-accent origin-left"
        initial={{ scaleX: 0, opacity: 0 }}
        whileInView={{ scaleX: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.5, ease: "easeOut" }}
      />

      {/* Row 1: Icon + optional arrow */}
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-accent/8 flex items-center justify-center shrink-0 group-hover:bg-accent/15 transition-colors duration-300">
          <Icon className={cn("h-4.5 w-4.5", iconClassName)} />
        </div>
        {path && (
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-accent group-hover:translate-x-0.5 transition-all duration-300 shrink-0" />
        )}
      </div>
      {/* Row 2: Label — wrap allowed for all languages */}
      <span className="text-[11px] sm:text-xs text-muted-foreground leading-tight mb-1 line-clamp-2">{label}</span>
      {/* Row 3: Value — prominent, animated counter, allow wrapping for large numbers */}
      <div className={cn(
        "font-bold text-foreground mt-auto break-words hyphens-auto",
        /^[\d\s.,€$£¥₹%—–-]+$/.test(value)
          ? "text-sm sm:text-lg lg:text-2xl tabular-nums"
          : "text-xs sm:text-sm lg:text-base",
        valueClassName,
      )}>
        <AnimatedValue value={value} />
      </div>
      {/* Row 4: Secondary info */}
      {sub && (
        <div className="text-[10px] sm:text-xs text-muted-foreground leading-tight mt-1 line-clamp-2">{sub}</div>
      )}
    </div>
  );

  if (path) {
    return <Link to={path} className="h-full block">{content}</Link>;
  }
  return content;
};

export { StatCard, AnimatedValue };
export type { StatCardProps };
