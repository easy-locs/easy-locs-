/**
 * MobileBottomNav — V7 Bottom navigation with 5 pillars.
 * Dashboard · Radar · Orbit (center) · Wallet · Me
 * NOTE: MainBottomNav is the canonical nav. This is kept for backward compat.
 */
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Radar, MessageCircle, Wallet, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const FALLBACKS: Record<string, string> = {
  "nav.home": "Home",
  "nav.radar": "Radar",
  "nav.orbit": "Orbit",
  "nav.wallet": "Wallet",
  "nav.me": "Me",
};

const MobileBottomNav = () => {
  const { pathname } = useLocation();
  const { t } = useI18n();

  if (pathname.startsWith("/app")) return null;

  const tr = (key: string) => {
    const val = t(key);
    return val && val !== key ? val : FALLBACKS[key] || key.split(".").pop() || "";
  };

  const items = [
    {
      icon: Home, labelKey: "nav.home", path: "/",
      match: (p: string) => p === "/",
    },
    {
      icon: Radar, labelKey: "nav.radar", path: "/radar",
      match: (p: string) =>
        p === "/radar" || p.startsWith("/explore") || p.startsWith("/search") || p.startsWith("/discover") ||
        p.startsWith("/listing/") || p.startsWith("/trending") || p.startsWith("/nearby") ||
        p.startsWith("/top-rated") || p.startsWith("/shops") || p.startsWith("/s/") ||
        p.startsWith("/super-map") || p.startsWith("/food") || p.startsWith("/grocery"),
    },
    {
      icon: MessageCircle, labelKey: "nav.orbit", path: "/orbit",
      match: (p: string) =>
        p.startsWith("/orbit") || p.startsWith("/dashboard/communication") || p.startsWith("/ghost"),
      isCenter: true,
    },
    {
      icon: Wallet, labelKey: "nav.wallet", path: "/wallet/hub",
      match: (p: string) =>
        p.startsWith("/wallet") || p === "/pos" || p === "/my-orders" ||
        p.startsWith("/dashboard/wallet"),
    },
    {
      icon: User, labelKey: "nav.me", path: "/me",
      match: (p: string) =>
        p === "/me" || p.startsWith("/dashboard/settings") || p.startsWith("/business") ||
        p.startsWith("/dashboard/my-shop") || p.startsWith("/dashboard/seller") ||
        p.startsWith("/dashboard/driver") || p.startsWith("/property-hub") || p.startsWith("/settings"),
    },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden safe-bottom"
      role="tablist"
      aria-label="Main navigation"
      style={{
        background: "hsl(var(--card))",
        borderTop: "1px solid hsl(var(--border) / 0.3)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -2px 16px hsl(var(--background) / 0.3)",
      }}
    >
      <div className="flex items-stretch justify-around h-[60px]">
        {items.map((item) => {
          const active = item.match(pathname);
          const label = tr(item.labelKey);
          const isCenter = (item as any).isCenter;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              role="tab"
              aria-selected={active}
              aria-label={label}
              className={`flex flex-col items-center justify-center flex-1 gap-1 transition-all min-w-[44px] min-h-[44px] max-w-[80px] active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg relative ${
                active ? "text-accent" : "text-muted-foreground"
              }`}
            >
              {active && !isCenter && (
                <motion.div
                  layoutId="v7-tab-indicator"
                  className="absolute top-0 left-3 right-3 h-[2.5px] rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {isCenter ? (
                <div className={`w-10 h-10 rounded-full flex items-center justify-center -mt-3 ${active ? "bg-accent" : "bg-accent/15"}`}>
                  <item.icon className={`h-5 w-5 shrink-0 ${active ? "text-accent-foreground" : "text-accent"}`} />
                </div>
              ) : (
                <item.icon className={`h-5 w-5 shrink-0 transition-colors ${active ? "text-accent" : ""}`} />
              )}
              <span className={`text-[10px] leading-tight transition-colors ${active ? "text-accent font-bold" : "font-medium"}`}>
                {label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
