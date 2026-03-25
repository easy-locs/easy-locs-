/**
 * UniversePageShell — Premium shared page wrapper for all universe hubs.
 * Back button + hero gradient + title + subtitle + search + content.
 */
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

interface UniversePageShellProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  gradient?: string;
  children: React.ReactNode;
  className?: string;
  search?: React.ReactNode;
  /** SEO meta */
  seoTitle?: string;
  seoDescription?: string;
  /** Filter chips below search */
  filters?: React.ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  isEmpty?: boolean;
}

export default function UniversePageShell({
  title,
  subtitle,
  icon,
  gradient = "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7))",
  children,
  className,
  search,
  seoTitle,
  seoDescription,
  filters,
  loading,
  emptyMessage = "Nothing here yet",
  isEmpty,
}: UniversePageShellProps) {
  const navigate = useNavigate();

  return (
    <div className={cn("min-h-screen bg-background pb-24", className)}>
      {seoTitle && (
        <SEOHead title={seoTitle} description={seoDescription || subtitle || ""} />
      )}

      {/* Hero header */}
      <div className="relative overflow-hidden rounded-b-3xl" style={{ background: gradient }}>
        <div className="px-4 pt-11 pb-7 relative z-10">
          {/* Back + title row */}
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-xl transition-transform active:scale-90"
              style={{ background: "hsl(0 0% 100% / 0.12)" }}
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4 text-primary-foreground" />
            </button>
            {icon}
            <h1 className="text-xl font-black text-primary-foreground tracking-tight">{title}</h1>
          </div>
          {subtitle && (
            <p className="text-xs text-primary-foreground/60 ml-11">{subtitle}</p>
          )}
        </div>
        <div
          className="absolute inset-0 opacity-10"
          style={{ background: "radial-gradient(circle at 80% 20%, white, transparent 60%)" }}
        />
      </div>

      {/* Search slot */}
      {search && <div className="px-4 -mt-5 relative z-20">{search}</div>}

      {/* Filter chips */}
      {filters && <div className="px-4 mt-3 flex gap-2 overflow-x-auto no-scrollbar">{filters}</div>}

      {/* Content — stable layout: keep structure identical between states */}
      <div className="px-4 mt-5" style={{ minHeight: 200 }}>
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-24 w-full rounded-2xl bg-muted/30" />
            <div className="h-24 w-full rounded-2xl bg-muted/25" />
            <div className="h-24 w-full rounded-2xl bg-muted/20" />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-4xl">🔍</span>
            <p className="text-sm text-muted-foreground font-medium">{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
