/**
 * OrbitPremiumCard — Consistent premium card component used across all Orbit pages.
 * Single-line truncated titles, proper hierarchy, tap scale, skeleton support.
 */
import { memo, type ReactNode } from "react";
import { motion } from "framer-motion";

interface OrbitPremiumCardProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
}

function OrbitPremiumCardInner({
  icon,
  title,
  subtitle,
  meta,
  badge,
  trailing,
  onClick,
  className = "",
}: OrbitPremiumCardProps) {
  const Wrapper = onClick ? motion.button : motion.div;
  return (
    <Wrapper
      {...(onClick ? { onClick, whileTap: { scale: 0.97 } } : {})}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-colors min-h-[56px] ${className}`}
      style={{
        background: "hsl(var(--hud-surface))",
        border: "1px solid hsl(var(--hud-border) / 0.08)",
      }}
    >
      {icon && (
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "hsl(var(--hud-surface-2))" }}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className="text-[13px] font-semibold leading-snug truncate"
            style={{ color: "hsl(var(--hud-text))" }}
          >
            {title}
          </p>
          {badge}
        </div>
        {subtitle && (
          <p
            className="text-[11px] leading-snug truncate mt-0.5"
            style={{ color: "hsl(var(--hud-text-dim) / 0.6)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {(meta || trailing) && (
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          {meta && (
            <span className="text-[10px] font-medium tabular-nums" style={{ color: "hsl(var(--hud-text-dim) / 0.5)" }}>
              {meta}
            </span>
          )}
          {trailing}
        </div>
      )}
    </Wrapper>
  );
}

export const OrbitPremiumCard = memo(OrbitPremiumCardInner);

/* ── Skeleton variant ── */
export function OrbitCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl animate-pulse"
          style={{ background: "hsl(var(--hud-surface))", border: "1px solid hsl(var(--hud-border) / 0.06)" }}
        >
          <div className="w-10 h-10 rounded-xl" style={{ background: "hsl(var(--hud-surface-2))" }} />
          <div className="flex-1 space-y-2">
            <div className="h-3 rounded-full w-2/3" style={{ background: "hsl(var(--hud-surface-2))" }} />
            <div className="h-2.5 rounded-full w-1/2" style={{ background: "hsl(var(--hud-surface-2) / 0.6)" }} />
          </div>
          <div className="w-10 h-3 rounded-full" style={{ background: "hsl(var(--hud-surface-2) / 0.4)" }} />
        </div>
      ))}
    </div>
  );
}
