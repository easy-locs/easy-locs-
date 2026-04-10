import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PageEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: PageEmptyStateProps) {
  return (
    <div className={cn("page-empty-state", className)}>
      <motion.div
        className="page-empty-state__inner"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {icon ? <div className="page-empty-state__icon">{icon}</div> : null}
        <h3 className="page-empty-state__title text-foreground">{title}</h3>
        {description ? (
          <p className="page-empty-state__desc text-muted-foreground">
            {description}
          </p>
        ) : null}
        {action ? <div className="mt-4">{action}</div> : null}
      </motion.div>
    </div>
  );
}
