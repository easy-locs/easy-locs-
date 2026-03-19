/**
 * AppBottomNav — 5-pillar Careem-style bottom navigation.
 * Home | Explore | Orbit | Wallet | Profile
 */
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Compass, ShoppingBag, Wallet, User } from "lucide-react";

const TABS = [
  { label: "Home", path: "/home", icon: Home },
  { label: "Explore", path: "/explore", icon: Compass },
  { label: "Orders", path: "/my-orders", icon: ShoppingBag },
  { label: "Wallet", path: "/wallet/hub", icon: Wallet },
  { label: "Me", path: "/settings", icon: User },
] as const;

export default function AppBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed left-0 right-0 bottom-0 z-50"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "hsl(var(--card))",
        borderTop: "1px solid hsl(var(--border) / 0.12)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="grid grid-cols-5 max-w-md mx-auto">
        {TABS.map((tab) => {
          const active = pathname === tab.path
            || (tab.path === "/home" && pathname === "/")
            || (tab.path === "/settings" && pathname.startsWith("/settings"))
            || (tab.path === "/wallet/hub" && pathname.startsWith("/wallet"))
            || (tab.path === "/my-orders" && (pathname.startsWith("/my-orders") || pathname.startsWith("/order/")));
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-0.5 py-2.5 active:scale-90 transition-transform"
            >
              <tab.icon
                className="w-5 h-5 transition-colors"
                style={{ color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.5)" }}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <span
                className="text-[10px] font-semibold transition-colors"
                style={{ color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.5)" }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
