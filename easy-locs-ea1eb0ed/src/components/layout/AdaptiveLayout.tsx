import React from "react";
import { useDeviceContext, useLayoutConfig, type DeviceContext } from "@/lib/platform/responsive-system";

interface AdaptiveContainerProps {
  children: React.ReactNode;
  mobileClassName?: string;
  desktopClassName?: string;
  style?: React.CSSProperties;
}

export function AdaptiveContainer({ children, mobileClassName, desktopClassName, style }: AdaptiveContainerProps) {
  const ctx = useDeviceContext();
  const layout = useLayoutConfig();

  return (
    <div
      className={ctx.isMobile ? mobileClassName : desktopClassName}
      style={{
        maxWidth: layout.contentMaxWidth,
        margin: "0 auto",
        width: "100%",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface AdaptiveSplitProps {
  left: React.ReactNode;
  right: React.ReactNode;
  leftWidth?: string;
  rightWidth?: string;
  mobileStack?: boolean;
  gap?: number;
}

export function AdaptiveSplit({ left, right, leftWidth = "40%", rightWidth = "60%", mobileStack = true, gap = 0 }: AdaptiveSplitProps) {
  const ctx = useDeviceContext();
  const layout = useLayoutConfig();

  const shouldStack = (ctx.isMobile && mobileStack) || !layout.showSplitView;

  if (shouldStack) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap }}>
        {left}
        {right}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap, height: "100%" }}>
      <div style={{ width: leftWidth, flexShrink: 0, overflow: "auto" }}>
        {left}
      </div>
      <div style={{ width: rightWidth, flex: 1, overflow: "auto" }}>
        {right}
      </div>
    </div>
  );
}

interface AdaptiveGridProps {
  children: React.ReactNode;
  mobileColumns?: number;
  tabletColumns?: number;
  desktopColumns?: number;
  gap?: number;
  minChildWidth?: number;
}

export function AdaptiveGrid({
  children,
  mobileColumns = 1,
  tabletColumns = 2,
  desktopColumns = 3,
  gap = 16,
  minChildWidth,
}: AdaptiveGridProps) {
  const ctx = useDeviceContext();

  const cols = ctx.isMobile ? mobileColumns : ctx.isTablet ? tabletColumns : desktopColumns;

  const gridTemplate = minChildWidth
    ? `repeat(auto-fill, minmax(${minChildWidth}px, 1fr))`
    : `repeat(${cols}, 1fr)`;

  return (
    <div style={{ display: "grid", gridTemplateColumns: gridTemplate, gap }}>
      {children}
    </div>
  );
}

interface AdaptiveModalProps {
  children: React.ReactNode;
  open: boolean;
  onClose: () => void;
  title?: string;
  maxWidth?: number;
}

export function AdaptiveModal({ children, open, onClose, title, maxWidth = 560 }: AdaptiveModalProps) {
  const ctx = useDeviceContext();
  const layout = useLayoutConfig();

  if (!open) return null;

  const isFullscreen = layout.modalBehavior === "fullscreen";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: isFullscreen ? "stretch" : "center",
        justifyContent: "center",
        background: isFullscreen ? "transparent" : "hsl(var(--foreground) / 0.5)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-card text-card-foreground"
        style={{
          borderRadius: isFullscreen ? 0 : "var(--card-radius)",
          width: isFullscreen ? "100%" : `min(${maxWidth}px, 90vw)`,
          height: isFullscreen ? "100%" : "auto",
          maxHeight: isFullscreen ? "100%" : "85vh",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {title && (
          <div
            className="border-b border-border"
            style={{
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <h2 style={{ margin: 0, fontSize: ctx.isMobile ? 18 : 20, fontWeight: 600 }}>{title}</h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
              style={{
                background: "none",
                border: "none",
                fontSize: 20,
                cursor: "pointer",
                padding: 4,
              }}
            >
              ✕
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflow: "auto", padding: ctx.isMobile ? 16 : 24 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

interface AdaptiveListProps<T> {
  items: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  renderRow?: (item: T, index: number) => React.ReactNode;
  renderHeader?: () => React.ReactNode;
  emptyState?: React.ReactNode;
  gap?: number;
}

export function AdaptiveList<T>({
  items,
  renderCard,
  renderRow,
  renderHeader,
  emptyState,
  gap = 12,
}: AdaptiveListProps<T>) {
  const ctx = useDeviceContext();
  const layout = useLayoutConfig();

  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  if (layout.listStyle === "table" && renderRow) {
    return (
      <div style={{ width: "100%", overflow: "auto" }}>
        {renderHeader && (
          <div className="bg-muted/30 border-b border-border text-muted-foreground" style={{
            display: "flex",
            padding: "8px 16px",
            fontWeight: 600,
            fontSize: 13,
          }}>
            {renderHeader()}
          </div>
        )}
        {items.map((item, i) => (
          <div key={i} className="border-b border-border/20">
            {renderRow(item, i)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {renderCard(item, i)}
        </React.Fragment>
      ))}
    </div>
  );
}

interface AdaptiveNavProps {
  items: Array<{ id: string; label: string; icon: React.ReactNode; active?: boolean; badge?: number }>;
  onSelect: (id: string) => void;
}

export function AdaptiveNav({ items, onSelect }: AdaptiveNavProps) {
  const ctx = useDeviceContext();
  const layout = useLayoutConfig();

  if (layout.showSidebar) {
    return null;
  }

  return (
    <nav
      className="bg-background border-t border-border"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 72,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "0 8px",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        zIndex: 100,
      }}
    >
      {items.slice(0, 5).map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={item.active ? "text-accent" : "text-muted-foreground"}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px 12px",
            position: "relative",
            minWidth: 44,
            minHeight: 44,
          }}
        >
          {item.icon}
          <span style={{ fontSize: 10, fontWeight: item.active ? 600 : 400 }}>
            {item.label}
          </span>
          {item.badge && item.badge > 0 && (
            <span
              className="bg-destructive text-destructive-foreground"
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                fontSize: 9,
                fontWeight: 700,
                borderRadius: 8,
                padding: "0 4px",
                minWidth: 14,
                textAlign: "center",
                lineHeight: "14px",
              }}
            >
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
        </button>
      ))}
    </nav>
  );
}

export function useAdaptiveValue<T>(mobile: T, tablet: T, desktop: T): T {
  const ctx = useDeviceContext();
  if (ctx.isMobile) return mobile;
  if (ctx.isTablet) return tablet;
  return desktop;
}
