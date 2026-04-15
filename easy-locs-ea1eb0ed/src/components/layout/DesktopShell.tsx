import React, { useState, useCallback } from "react";
import { useDeviceContext, useLayoutConfig } from "@/lib/platform/responsive-system";
import {
  Home, MessageCircle, Wallet, Compass, User,
  Store, ShoppingCart, Truck, Settings, BarChart3,
  ChevronLeft, ChevronRight, Menu,
  type LucideIcon,
} from "lucide-react";
import EasyLocsLogo from "@/components/brand/EasyLocsLogo";
import { useDynamicLogo } from "@/hooks/useDynamicLogo";

const ICON_MAP: Record<string, LucideIcon> = {
  Home, Compass, MessageCircle, Wallet, User, Store,
  ShoppingCart, Truck, Settings, BarChart3, Menu,
  LayoutDashboard: Home,
  DollarSign: Wallet,
  MapPin: Compass,
  Headphones: MessageCircle,
  ShoppingBag: Store,
  Package: ShoppingCart,
  HelpCircle: MessageCircle,
  Plane: Compass,
  Car: Truck,
  CreditCard: Wallet,
  Activity: BarChart3,
  Users: User,
};

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: number;
  active?: boolean;
}

interface DesktopShellProps {
  sidebarItems: SidebarItem[];
  activePath: string;
  onNavigate: (route: string) => void;
  children: React.ReactNode;
  sidePanel?: React.ReactNode;
  headerContent?: React.ReactNode;
  brandName?: string;
}

const NAVY = "hsl(var(--brand-navy))";
const NAVY_LIGHT = "hsl(var(--brand-navy-light))";

export function DesktopShell({
  sidebarItems,
  activePath,
  onNavigate,
  children,
  sidePanel,
  headerContent,
}: DesktopShellProps) {
  const device = useDeviceContext();
  const layout = useLayoutConfig();
  const [collapsed, setCollapsed] = useState(false);
  const logoCtx = useDynamicLogo();

  const handleNav = useCallback((route: string) => {
    onNavigate(route);
  }, [onNavigate]);

  if (!layout.showSidebar) {
    return <>{children}</>;
  }

  const sidebarWidth = collapsed ? 64 : 240;
  const accentColor = logoCtx.gradientColors[0];
  const accentColorDark = logoCtx.gradientColors[1];

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%", overflow: "hidden", background: "#f5f6f8" }}>
      <nav
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          height: "100vh",
          background: NAVY,
          display: "flex",
          flexDirection: "column",
          transition: "width 200ms ease",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            padding: collapsed ? "0 12px" : "0 16px",
            gap: 8,
            borderBottom: `1px solid ${NAVY_LIGHT}`,
          }}
        >
          <EasyLocsLogo
            variant={collapsed ? "icon" : "full"}
            size="sm"
            animate
            dynamic={{
              gradientColors: logoCtx.gradientColors,
              microIcon: logoCtx.microIcon,
              specialEvent: null,
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {sidebarItems.map((item) => {
            const isActive = activePath === item.route || activePath.startsWith(item.route + "/");
            const IconComponent = ICON_MAP[item.icon] || Home;

            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.route)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: collapsed ? "10px 20px" : "10px 20px",
                  background: isActive ? NAVY_LIGHT : "transparent",
                  border: "none",
                  borderLeft: isActive ? `3px solid ${accentColor}` : "3px solid transparent",
                  color: isActive ? accentColor : "rgba(255,255,255,0.7)",
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  textAlign: "left",
                  transition: "all 150ms ease",
                  position: "relative",
                }}
              >
                <IconComponent size={20} style={{ flexShrink: 0 }} />
                {!collapsed && (
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.label}
                  </span>
                )}
                {item.badge && item.badge > 0 && (
                  <span
                    style={{
                      position: collapsed ? "absolute" : "relative",
                      top: collapsed ? 6 : "auto",
                      right: collapsed ? 12 : "auto",
                      marginLeft: collapsed ? 0 : "auto",
                      background: `linear-gradient(135deg, ${accentColor}, ${accentColorDark})`,
                      color: NAVY,
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 10,
                      padding: "1px 6px",
                      minWidth: 18,
                      textAlign: "center",
                    }}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-end",
            padding: "0 16px",
            background: "transparent",
            border: "none",
            borderTop: `1px solid ${NAVY_LIGHT}`,
            color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
          }}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </nav>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {headerContent && (
          <header
            style={{
              height: 56,
              background: "#fff",
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              padding: "0 24px",
              flexShrink: 0,
            }}
          >
            {headerContent}
          </header>
        )}

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <main
            style={{
              flex: 1,
              overflowY: "auto",
              padding: device.isDesktop ? 24 : 16,
            }}
          >
            {children}
          </main>

          {sidePanel && layout.panelCount >= 2 && (
            <aside
              style={{
                width: device.width >= 1280 ? 360 : 320,
                borderLeft: "1px solid #e5e7eb",
                overflowY: "auto",
                background: "#fff",
                flexShrink: 0,
              }}
            >
              {sidePanel}
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
