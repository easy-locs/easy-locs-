/**
 * MobileBottomNav — V7 Bottom navigation with 4 clear pillars.
 * 1. Marketplace (browse listings) 2. Shops (directory) 3. My Business (management) 4. Property (separate module)
 */
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, Store, Briefcase, Building2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const MobileBottomNav = () => {
  const { pathname } = useLocation();
  const { t } = useI18n();

  if (pathname.startsWith("/app")) return null;

  const items = [
    {
      icon: Compass,
      label: "Marketplace",
      path: "/discover",
      match: (p: string) => p.startsWith("/discover") || p.startsWith("/search") || p.startsWith("/explore") || p.startsWith("/listing/") || p.startsWith("/trending") || p.startsWith("/nearby"),
    },
    {
      icon: Store,
      label: "Shops",
      path: "/shops",
      match: (p: string) => p === "/shops" || p.startsWith("/shops/") || p.startsWith("/s/"),
    },
    {
      icon: Briefcase,
      label: "Business",
      path: "/business",
      match: (p: string) => p.startsWith("/business") || p === "/pos" || p === "/my-orders" || p.startsWith("/dashboard/my-shop") || p.startsWith("/dashboard/seller") || p.startsWith("/dashboard/wallet") || p.startsWith("/dashboard/driver"),
    },
    {
      icon: Building2,
      label: "Property",
      path: "/property-hub",
      match: (p: string) => p.startsWith("/property-hub") || p.startsWith("/dashboard/properties") || p.startsWith("/dashboard/property/") || p.startsWith("/dashboard/tenants") || p.startsWith("/dashboard/leases") || p.startsWith("/dashboard/finances") || p.startsWith("/tenant"),
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
          return (
            <Link
              key={item.path}
              to={item.path}
              role="tab"
              aria-selected={active}
              aria-label={item.label}
              className={`flex flex-col items-center justify-center flex-1 gap-1 transition-all min-w-[44px] min-h-[44px] max-w-[80px] active:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg relative ${
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
