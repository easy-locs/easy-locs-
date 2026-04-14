import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { animate } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
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
  loading?: boolean;
}

function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(
      "flex flex-col h-full bg-card rounded-2xl p-4 sm:p-5 border border-border/8 min-h-[110px] sm:min-h-[130px]",
      className,
    )}>
      <Skeleton className="w-9 h-9 rounded-xl mb-3" />
      <Skeleton className="w-20 h-3 rounded mb-2" />
      <Skeleton className="w-16 h-6 rounded mt-auto" />
    </div>
  );
}

function AnimatedValue({ value, className }: { value: string; className?: string }) {
  const isNumeric = /^[\d\s.,]+[€$£¥₹%]?$/.test(value.trim());
  const [displayed, setDisplayed] = useState(value);

  useEffect(() => {
    if (!isNumeric) {
      setDisplayed(value);
      return;
    }

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

const StatCard = ({
  icon: Icon,
  iconClassName = "text-muted-foreground",
  label,
  value,
  sub,
  path,
  valueClassName,
  className,
  loading,
}: StatCardProps) => {
  if (loading) return <StatCardSkeleton className={className} />;
  const content = (
    <div
      className={cn(
        "flex flex-col h-full bg-card rounded-2xl p-4 sm:p-5 border border-border/8 transition-colors duration-150 relative overflow-hidden min-h-[110px] sm:min-h-[130px]",
        path && "hover:border-accent/20 group cursor-pointer",
        className,
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-accent/6 flex items-center justify-center shrink-0 group-hover:bg-accent/10 transition-colors duration-150">
          <Icon className={cn("h-4 w-4", iconClassName)} />
        </div>
        {path && (
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-accent transition-all duration-150 shrink-0" />
        )}
      </div>
      <span className="text-2xs sm:text-xs text-muted-foreground leading-tight mb-1 line-clamp-2">{label}</span>
      <div className={cn(
        "font-bold text-foreground mt-auto break-words hyphens-auto",
        /^[\d\s.,€$£¥₹%—–-]+$/.test(value)
          ? "text-sm sm:text-lg lg:text-2xl tabular-nums"
          : "text-xs sm:text-sm lg:text-base",
        valueClassName,
      )}>
        <AnimatedValue value={value} />
      </div>
      {sub && (
        <div className="text-2xs sm:text-xs text-muted-foreground leading-tight mt-1 line-clamp-2">{sub}</div>
      )}
    </div>
  );

  if (path) {
    return <Link to={path} className="h-full block">{content}</Link>;
  }
  return content;
};

export { StatCard, StatCardSkeleton, AnimatedValue };
export type { StatCardProps };
