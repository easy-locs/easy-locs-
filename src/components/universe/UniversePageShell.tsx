/**
 * UniversePageShell — Shared page wrapper for all universe hubs.
 * Hero gradient + title + subtitle + optional search + children.
 */
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface UniversePageShellProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  gradient?: string;
  children: React.ReactNode;
  className?: string;
  /** Optional search bar below hero */
  search?: React.ReactNode;
}

export default function UniversePageShell({
  title,
  subtitle,
  icon,
  gradient = "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
  children,
  className,
  search,
}: UniversePageShellProps) {
  return (
    <div className={cn("min-h-screen bg-background pb-24", className)}>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-b-3xl" style={{ background: gradient }}>
        <div className="px-4 pt-12 pb-8 relative z-10">
          <div className="flex items-center gap-2 mb-1">
            {icon}
            <h1 className="text-2xl font-black text-primary-foreground">{title}</h1>
          </div>
          {subtitle && (
            <p className="text-sm text-primary-foreground/70">{subtitle}</p>
          )}
        </div>
        <div
          className="absolute inset-0 opacity-10"
          style={{ background: "radial-gradient(circle at 80% 20%, white, transparent 60%)" }}
        />
      </div>

      {/* Search slot */}
      {search && <div className="px-4 -mt-5 relative z-20">{search}</div>}

      {/* Content */}
      <div className="px-4 mt-5">{children}</div>
    </div>
  );
}
