import type { ReactNode, CSSProperties, HTMLAttributes } from "react";
import { motion } from "framer-motion";

interface PillarPageProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  noPadding?: boolean;
  noSafeArea?: boolean;
}

export default function PillarPage({ children, className = "", style, noPadding, noSafeArea, ...rest }: PillarPageProps) {
  return (
    <div
      className={`pillar-page ${noSafeArea ? "" : "app-mobile-page"} ${noPadding ? "" : "pillar-page--padded"} ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}

interface PageSectionProps {
  children: ReactNode;
  title?: string;
  icon?: ReactNode;
  action?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  compact?: boolean;
  noPaddingX?: boolean;
  divider?: boolean;
}

export function PageSection({
  children,
  title,
  icon,
  action,
  actionLabel,
  onAction,
  className = "",
  compact,
  noPaddingX,
  divider,
}: PageSectionProps) {
  const hasHeader = title || action || actionLabel;
  const gap = compact ? "var(--section-gap-compact)" : "var(--section-gap)";

  return (
    <section
      className={`page-section ${noPaddingX ? "" : "page-section--px"} ${className}`}
      style={{ marginBottom: gap }}
    >
      {divider && <div className="page-section__divider" />}

      {hasHeader && (
        <div className="page-section__header">
          <div className="page-section__title-group">
            {icon && <span className="page-section__icon">{icon}</span>}
            {title && <h2 className="page-section__title">{title}</h2>}
          </div>
          {(action || actionLabel) && (
            <div className="page-section__action">
              {action || (
                <button
                  onClick={onAction}
                  className="page-section__action-btn"
                >
                  {actionLabel}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className="page-section__content">
        {children}
      </div>
    </section>
  );
}

interface PageHeroProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function PageHero({ children, className = "", style }: PageHeroProps) {
  return (
    <div className={`page-hero ${className}`} style={style}>
      {children}
    </div>
  );
}

export function SectionDivider() {
  return <div className="page-section__divider" />;
}
