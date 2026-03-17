import * as React from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * SectionHeader — Consistent section heading within pages.
 * Replaces ad-hoc h2/h3 + description patterns.
 */
const SectionHeader = ({ title, description, actions, className }: SectionHeaderProps) => (
  <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5", className)}>
    <div className="min-w-0">
      <h2 className="section-block-title">{title}</h2>
      {description && <p className="text-2xs text-muted-foreground/70 mt-1">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

export { SectionHeader };
export type { SectionHeaderProps };
