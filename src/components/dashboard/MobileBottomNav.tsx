/**
 * MobileBottomNav — Bottom navigation for non-Orbit authenticated pages.
 * PASS 157-163: i18n, accessibility, consistent active states.
 */
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Search, Store, ShoppingBag, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const MobileBottomNav = () => {
  const { pathname } = useLocation();
  const { t } = useI18n();

  // Hide inside Orbit shell to avoid stacked nav layers
  if (pathname.startsWith("/app")) return null;

  const items = [
    { icon: Home, labelKey: "nav.home", path: "/dashboard" },
    { icon: Search, labelKey: "nav.search", path: "/discover" },
    { icon: Store, labelKey: "nav.shops", path: "/shops" },
    { icon: ShoppingBag, labelKey: "nav.orders", path: "/my-orders" },
    { icon: User, labelKey: "nav.me", path: "/dashboard/settings" },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    if (path === "/my-orders") return pathname === "/my-orders" || pathname.startsWith("/my-orders/");
    if (path === "/discover") return pathname.startsWith("/discover") || pathname.startsWith("/search") || pathname.startsWith("/s/");
    if (path === "/shops") return pathname === "/shops" || pathname.startsWith("/shops/") || pathname === "/dashboard/my-shop";
    if (path === "/dashboard/settings") return pathname.startsWith("/dashboard/settings");
    return pathname.startsWith(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden safe-bottom"
      role="tablist"
      aria-label="Main navigation"
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
          const active = isActive(item.path);
          const label = t(item.labelKey) || item.labelKey.split(".").pop() || "";
          return (
            <Link
              key={item.path}
              to={item.path}
              role="tab"
              aria-selected={active}
              aria-label={label}
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
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
