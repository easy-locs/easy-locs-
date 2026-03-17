/**
 * MobileBottomNav — V7 Bottom navigation with 4 strict pillars.
 */
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Store, Briefcase, Building2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const FALLBACKS: Record<string, string> = {
  "nav.marketplace": "Marketplace",
  "nav.shops": "Shops",
  "nav.business": "Business",
  "nav.property": "Property",
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
      icon: Compass, labelKey: "nav.marketplace", path: "/discover",
      match: (p: string) =>
        p.startsWith("/discover") || p.startsWith("/search") || p.startsWith("/explore") ||
        p.startsWith("/listing/") || p.startsWith("/trending") || p.startsWith("/nearby") ||
        p.startsWith("/top-rated") || p.startsWith("/rentals") || p.startsWith("/book/"),
    },
    {
      icon: Store, labelKey: "nav.shops", path: "/shops",
      match: (p: string) => p === "/shops" || p.startsWith("/shops/") || p.startsWith("/s/"),
    },
    {
      icon: Briefcase, labelKey: "nav.business", path: "/business",
      match: (p: string) =>
        p.startsWith("/business") || p === "/pos" || p === "/my-orders" ||
        p.startsWith("/dashboard/my-shop") || p.startsWith("/dashboard/seller") ||
        p.startsWith("/dashboard/wallet") || p.startsWith("/dashboard/driver") ||
        p.startsWith("/dashboard/reporting") || p.startsWith("/dashboard/communication") ||
        p.startsWith("/dashboard/deals") || p.startsWith("/dashboard/ops"),
    },
    {
      icon: Building2, labelKey: "nav.property", path: "/property-hub",
      match: (p: string) =>
        p.startsWith("/property-hub") || p.startsWith("/dashboard/properties") ||
        p.startsWith("/dashboard/property/") || p.startsWith("/dashboard/tenants") ||
        p.startsWith("/dashboard/leases") || p.startsWith("/dashboard/finances") ||
        p.startsWith("/dashboard/buildings") || p.startsWith("/dashboard/accounting") ||
        p.startsWith("/dashboard/real-estate") || p.startsWith("/tenant"),
    },
  ];

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
          const active = item.match(pathname);
          const label = tr(item.labelKey);
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
              {active && (
                <motion.div
                  layoutId="v7-tab-indicator"
                  className="absolute top-0 left-3 right-3 h-[2.5px] rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon className={`h-5 w-5 shrink-0 transition-colors ${active ? "text-accent" : ""}`} />
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
