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
        background: isFullscreen ? "transparent" : "rgba(0,0,0,0.5)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: isFullscreen ? 0 : 12,
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
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <h2 style={{ margin: 0, fontSize: ctx.isMobile ? 18 : 20, fontWeight: 600 }}>{title}</h2>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: 20,
                cursor: "pointer",
                color: "#6b7280",
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
          <div style={{
            display: "flex",
            padding: "8px 16px",
            background: "#f9fafb",
            borderBottom: "1px solid #e5e7eb",
            fontWeight: 600,
            fontSize: 13,
            color: "#6b7280",
          }}>
            {renderHeader()}
          </div>
        )}
        {items.map((item, i) => (
          <div key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
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
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 72,
        background: "#fff",
        borderTop: "1px solid #e5e7eb",
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
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 4,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "8px 12px",
            color: item.active ? "hsl(38 65% 56%)" : "#9ca3af",
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
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                background: "#ef4444",
                color: "#fff",
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
