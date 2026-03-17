import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Search, Store, ShoppingBag, User } from "lucide-react";

interface MobileBottomNavProps {
  onMenuOpen?: () => void;
}

const MobileBottomNav = ({ onMenuOpen }: MobileBottomNavProps) => {
  const { pathname } = useLocation();

  // Hide inside Orbit shell to avoid stacked nav layers
  if (pathname.startsWith("/app")) return null;

  const items = [
    { icon: Home, label: "Home", path: "/dashboard" },
    { icon: Search, label: "Search", path: "/discover" },
    { icon: Store, label: "Shops", path: "/dashboard/my-shop" },
    { icon: ShoppingBag, label: "Orders", path: "/my-orders" },
    { icon: User, label: "Profile", path: "/dashboard/settings" },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    if (path === "/my-orders") return pathname === "/my-orders";
    if (path === "/discover") return pathname.startsWith("/discover") || pathname.startsWith("/s/");
    if (path === "/dashboard/my-shop") return pathname === "/dashboard/my-shop";
    if (path === "/dashboard/settings") return pathname.startsWith("/dashboard/settings");
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
