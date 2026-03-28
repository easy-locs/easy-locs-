/**
 * CardActions — Action buttons for cards (CTA, bookmark, etc).
 */
import type { ReactNode } from "react";

interface CardActionsProps {
  children: ReactNode;
  className?: string;
}

export function CardActions({ children, className }: CardActionsProps) {
  return (
    <div className={`flex items-center gap-1.5 shrink-0 ${className ?? ""}`}>
      {children}
    </div>
  );
}
