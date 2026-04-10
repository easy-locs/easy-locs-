/**
 * PageBreadcrumb — Lightweight navigation breadcrumb for page hierarchy.
 * Provides clear "way back" for all detail pages.
 */
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface Props {
  items: BreadcrumbItem[];
  className?: string;
}

export default function PageBreadcrumb({ items, className = "" }: Props) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-1 text-xs text-muted-foreground pb-1 ${className}`}>
      <Link
        to="/dashboard"
        className="shrink-0 hover:text-foreground transition-colors p-1 rounded-md"
        aria-label="Dashboard"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex min-w-0 max-w-full items-center gap-1">
            <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />
            {isLast || !item.href ? (
              <span className={`min-w-0 whitespace-normal break-words leading-snug ${isLast ? "text-foreground font-medium" : ""}`}>
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="min-w-0 whitespace-normal break-words leading-snug hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
