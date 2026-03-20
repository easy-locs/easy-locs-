/**
 * MainBottomNav — Clean 5-tab navigation.
 * Home (Orbit) | Explore (Achille) | Map (Ride) | Wallet | Profile
 * Single source of truth for primary navigation.
 */
import { useLocation, useNavigate } from "react-router-dom";
import { Home, Compass, MapPin, Wallet, User } from "lucide-react";
import { motion } from "framer-motion";

const TABS = [
  {
    key: "home",
    label: "Home",
    path: "/",
    icon: Home,
    match: (p: string) => p === "/" || p === "/home" || p.startsWith("/dashboard/communication") || p.startsWith("/orbit"),
  },
  {
    key: "explore",
    label: "Explore",
    path: "/explore",
    icon: Compass,
    match: (p: string) =>
      p.startsWith("/explore") || p.startsWith("/achille") || p.startsWith("/food") ||
      p.startsWith("/grocery") || p.startsWith("/shops") || p.startsWith("/search") ||
      p.startsWith("/discover") || p.startsWith("/listing/") || p.startsWith("/store/") ||
      p.startsWith("/services-hub") || p.startsWith("/s/"),
  },
  {
    key: "map",
    label: "Map",
    path: "/map",
    icon: MapPin,
    match: (p: string) =>
      p === "/map" || p.startsWith("/ride") || p.startsWith("/send") ||
      p.startsWith("/track/") || p.startsWith("/nearby") || p.startsWith("/super-map"),
  },
  {
    key: "wallet",
    label: "Wallet",
    path: "/wallet/hub",
    icon: Wallet,
    match: (p: string) => p.startsWith("/wallet") || p === "/pos",
  },
  {
    key: "profile",
    label: "Profile",
    path: "/settings",
    icon: User,
    match: (p: string) =>
      p.startsWith("/settings") || p.startsWith("/me") || p.startsWith("/business") ||
      p.startsWith("/notifications"),
  },
] as const;

const HIDE_ON = ["/login", "/signup", "/forgot-password", "/reset-password", "/verify-email", "/tenant-signup", "/onboarding", "/emergency-test"];

export default function MainBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Hide on auth/onboarding pages and /app/* orbit shell
  if (HIDE_ON.some((p) => pathname.startsWith(p)) || pathname.startsWith("/app")) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      role="tablist"
      aria-label="Main navigation"
      style={{
        background: "hsl(var(--card) / 0.97)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderTop: "1px solid hsl(var(--border) / 0.3)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -2px 20px hsl(var(--background) / 0.4)",
      }}
    >
      <div className="flex items-stretch justify-around h-[56px] max-w-md mx-auto">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active}
              aria-label={tab.label}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center flex-1 gap-0.5 relative
                         min-w-[44px] min-h-[44px] max-w-[80px]
                         active:scale-90 transition-all duration-150 ease-out
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            >
              {active && (
                <motion.div
                  layoutId="main-tab-indicator"
                  className="absolute top-0 left-3 right-3 h-[2px] rounded-full"
                  style={{ background: "hsl(var(--accent))" }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <Icon
                className="w-[22px] h-[22px] transition-colors duration-150"
                style={{
                  color: active ? "hsl(var(--accent))" : "hsl(var(--muted-foreground) / 0.55)",
                }}
                strokeWidth={active ? 2.4 : 1.8}
              />
              <span
                className="text-[10px] leading-tight transition-colors duration-150"
                style={{
                  color: active ? "hsl(var(--accent))" : "hsl(var(--muted-foreground) / 0.55)",
                  fontWeight: active ? 700 : 500,
                }}
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
