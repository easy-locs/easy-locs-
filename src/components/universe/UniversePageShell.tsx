/**
 * UniversePageShell — Premium shared page wrapper for all universe hubs.
 * Supports optional 4K hero video banner with gradient overlay.
 * Back button + hero gradient + title + subtitle + search + content.
 */
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useRef, useState } from "react";
import SEOHead from "@/components/SEOHead";

interface UniversePageShellProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  gradient?: string;
  children: React.ReactNode;
  className?: string;
  search?: React.ReactNode;
  seoTitle?: string;
  seoDescription?: string;
  filters?: React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  isEmpty?: boolean;
  heroVideoUrl?: string;
  heroBannerUrl?: string;
  heroEmoji?: string;
  tagline?: string;
  /** Explicit back route (default: navigate(-1)) */
  backTo?: string;
  /** Slot rendered above content, below hero (e.g. cuisine slider) */
  heroSlot?: React.ReactNode;
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
  heroVideoUrl,
  heroBannerUrl,
  heroEmoji,
  tagline,
}: UniversePageShellProps) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  const hasMedia = !!(heroVideoUrl || heroBannerUrl);

  return (
    <div className={cn("min-h-screen bg-background pb-24", className)}>
      {seoTitle && (
        <SEOHead title={seoTitle} description={seoDescription || subtitle || ""} />
      )}

      {/* ── Hero header ── */}
      <div
        className="relative overflow-hidden rounded-b-3xl"
        style={{
          background: hasMedia ? "hsl(var(--background))" : gradient,
          minHeight: hasMedia ? 200 : undefined,
        }}
      >
        {/* Video layer */}
        {heroVideoUrl && (
          <video
            ref={videoRef}
            src={heroVideoUrl}
            className={cn(
              "absolute inset-0 w-full h-full object-cover transition-opacity duration-700",
              videoLoaded ? "opacity-100" : "opacity-0",
            )}
            autoPlay
            loop
            muted
            playsInline
            onCanPlay={() => setVideoLoaded(true)}
          />
        )}

        {/* Fallback banner image */}
        {heroBannerUrl && !videoLoaded && (
          <img
            src={heroBannerUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
          />
        )}

        {/* Gradient overlay for readability */}
        {hasMedia && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
        )}

        {/* Radial accent (non-media) */}
        {!hasMedia && (
          <div
            className="absolute inset-0 opacity-10"
            style={{ background: "radial-gradient(circle at 80% 20%, white, transparent 60%)" }}
          />
        )}

        {/* Content */}
        <div className={cn("relative z-10 px-4", hasMedia ? "pt-12 pb-6" : "pt-11 pb-7")}>
          {/* Back + title row */}
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-xl transition-transform active:scale-90 shrink-0"
              style={{ background: "hsl(0 0% 100% / 0.15)" }}
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4 text-white" />
            </button>
            {icon}
          </div>

          {/* Hero emoji */}
          {heroEmoji && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
              className="text-5xl mt-2 mb-1 drop-shadow-lg"
            >
              {heroEmoji}
            </motion.div>
          )}

          {/* Title — never truncated */}
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className={cn(
              "text-2xl font-black tracking-tight",
              hasMedia ? "text-white" : "text-primary-foreground",
            )}
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            {title}
          </motion.h1>

          {/* Tagline */}
          {tagline && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={cn(
                "text-sm font-medium mt-1",
                hasMedia ? "text-white/80" : "text-primary-foreground/70",
              )}
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              {tagline}
            </motion.p>
          )}

          {subtitle && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className={cn(
                "text-xs mt-1.5",
                hasMedia ? "text-white/60" : "text-primary-foreground/60",
              )}
            >
              {subtitle}
            </motion.p>
          )}
        </div>
      </div>

      {/* Search slot */}
      {search && <div className="px-4 -mt-5 relative z-20">{search}</div>}

      {/* Filter chips */}
      {filters && <div className="px-4 mt-3 flex gap-2 overflow-x-auto no-scrollbar">{filters}</div>}

      {/* Content */}
      <div className="px-4 mt-5" style={{ minHeight: 200 }}>
        {loading ? (
          <div className="space-y-3">
            {[0.3, 0.25, 0.2].map((op, i) => (
              <div key={i} className="h-24 w-full rounded-2xl animate-pulse" style={{ background: `hsl(var(--muted) / ${op})` }} />
            ))}
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
