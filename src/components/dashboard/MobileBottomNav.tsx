import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, Home, MessageCircle, Wallet, Menu } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface MobileBottomNavProps {
  onMenuOpen: () => void;
}

const MobileBottomNav = ({ onMenuOpen }: MobileBottomNavProps) => {
  const { pathname } = useLocation();
  const { t } = useI18n();

  // Hide main nav inside Orbit-related pages to avoid stacked nav layers
  if (pathname.startsWith("/dashboard/communication") || pathname.startsWith("/app")) return null;

  const items = [
    { icon: LayoutDashboard, label: t("nav.dashboard_short") || "Home", path: "/dashboard" },
    { icon: Home, label: t("nav.properties_short") || "Props", path: "/dashboard/rental" },
    { icon: MessageCircle, label: "Orbit", path: "/dashboard/communication" },
    { icon: Wallet, label: "Wallet", path: "/dashboard/wallet" },
    { icon: Menu, label: t("nav.more") || "More", path: "__menu__" },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden safe-bottom"
      style={{
        background: "hsl(var(--card) / 0.95)",
        backdropFilter: "blur(12px) saturate(140%)",
        WebkitBackdropFilter: "blur(12px) saturate(140%)",
        borderTop: "1px solid hsl(var(--border) / 0.4)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -4px 24px hsl(var(--background) / 0.3)",
      }}
    >
      <div className="flex items-stretch justify-around h-[60px]">
        {items.map((item) => {
          if (item.path === "__menu__") {
            return (
              <button
                key="menu"
                onClick={onMenuOpen}
                className="flex flex-col items-center justify-center flex-1 gap-1 text-muted-foreground active:bg-muted/50 transition-colors min-w-[44px] min-h-[44px] max-w-[72px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg relative"
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </button>
            );
          }

          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 gap-1 transition-all min-w-[44px] min-h-[44px] max-w-[72px] active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg relative ${
                active ? "text-accent" : "text-muted-foreground"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="dash-tab-indicator"
                  className="absolute top-0 left-3 right-3 h-[2.5px] rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon className={`h-5 w-5 shrink-0 transition-colors ${active ? "text-accent" : ""}`} />
              <span className={`text-[10px] leading-tight transition-colors ${active ? "text-accent font-bold" : "font-medium"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
