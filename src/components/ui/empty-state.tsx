import * as React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface EmptyStateAction {
  label: string;
  to?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "ghost";
}

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  illustration?: "search" | "inbox" | "calendar" | "chart" | "default";
  className?: string;
  compact?: boolean;
}

/**
 * Premium empty state component with subtle animation and optional illustrations.
 */
const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) => {
  const ActionButton = ({ act, variant = "default" }: { act: EmptyStateAction; variant?: "default" | "outline" | "ghost" }) => {
    const v = act.variant ?? variant;
    if (act.to) {
      return (
        <Button asChild size="sm" variant={v}>
          <Link to={act.to}>{act.label}</Link>
        </Button>
      );
    }
    return <Button size="sm" variant={v} onClick={act.onClick}>{act.label}</Button>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-6 px-3" : "py-12 px-4",
        className
      )}
    >
      {/* Animated icon container with glow */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 20 }}
        className={cn(
          "rounded-2xl bg-muted/80 flex items-center justify-center mb-4 relative",
          compact ? "w-11 h-11" : "w-14 h-14"
        )}
      >
        <div className="absolute inset-0 rounded-2xl bg-accent/5 blur-xl" />
        <Icon className={cn("text-muted-foreground/50 relative", compact ? "h-5 w-5" : "h-7 w-7")} />
      </motion.div>

      <h3 className={cn(
        "font-semibold text-foreground mb-1",
        compact ? "text-sm" : "text-base"
      )}>
        {title}
      </h3>

      {description && (
        <p className={cn(
          "text-muted-foreground max-w-sm",
          compact ? "text-xs" : "text-sm"
        )}>
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className={cn("flex items-center gap-2", compact ? "mt-3" : "mt-5")}>
          {action && <ActionButton act={action} />}
          {secondaryAction && <ActionButton act={secondaryAction} variant="outline" />}
        </div>
      )}
    </motion.div>
  );
};

export { EmptyState };
export type { EmptyStateProps };
