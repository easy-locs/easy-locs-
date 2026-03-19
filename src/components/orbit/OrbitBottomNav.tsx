/**
 * OrbitBottomNav — 5-tab: Home · Orbit · Explore · Wallet · Profile
 */
import { useNavigate, useLocation } from "react-router-dom";
import { Compass, Wallet, User, CircleDot, Home } from "lucide-react";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { memo } from "react";
import { useI18n } from "@/lib/i18n";

const NAV_ITEMS = [
  {
    icon: Home,
    labelKey: "nav.home",
    fallback: "Home",
    path: "/",
    match: (p: string) => p === "/",
  },
  {
    icon: CircleDot,
    labelKey: "nav.orbit",
    fallback: "Orbit",
    path: "/dashboard/communication",
    match: (p: string) =>
      ["/dashboard/communication", "/orbit"].some(
        (prefix) => p === prefix || p.startsWith(prefix + "/")
      ),
    isOrbit: true,
  },
  {
    icon: Compass,
    labelKey: "nav.explore",
    fallback: "Explore",
    path: "/explore",
    match: (p: string) =>
      ["/explore", "/search", "/discover", "/food", "/grocery", "/services-hub", "/ride", "/send", "/travel", "/shops", "/super-map", "/real-estate"].some(
        (prefix) => p === prefix || p.startsWith(prefix + "/")
      ),
  },
  {
    icon: Wallet,
    labelKey: "nav.wallet",
    fallback: "Wallet",
    path: "/wallet/hub",
    match: (p: string) => p.startsWith("/wallet") || p.startsWith("/pos"),
  },
  {
    icon: User,
    labelKey: "nav.profile",
    fallback: "Profile",
    path: "/dashboard/settings",
    match: (p: string) =>
      ["/dashboard/settings", "/dashboard/my-shop", "/dashboard/seller", "/dashboard/driver", "/business", "/property-hub"].some(
        (prefix) => p === prefix || p.startsWith(prefix + "/")
      ),
  },
] as const;

function OrbitBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { unreadMessages, pendingOrders } = useOrbitEngine();
  const { t } = useI18n();

  const getBadge = (labelKey: string) => {
    if (labelKey === "nav.orbit") return unreadMessages + pendingOrders;
    return 0;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around border-t"
      role="tablist"
      aria-label="Main navigation"
      style={{
        background: "hsl(var(--hud-bg))",
        borderColor: "hsl(var(--hud-border) / 0.08)",
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
        height: "calc(56px + env(safe-area-inset-bottom, 8px))",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.match(pathname);
        const badge = getBadge(item.labelKey);
        const isOrbit = "isOrbit" in item && item.isOrbit;
        const label = t(item.labelKey) || item.fallback;

        return (
          <button
            key={item.labelKey}
            role="tab"
            aria-selected={isActive}
            aria-label={`${label}${badge > 0 ? ` (${badge})` : ""}`}
            onClick={() => navigate(item.path)}
            className={`relative flex flex-col items-center justify-center gap-0.5 pt-2 pb-1 px-3 min-w-[56px] min-h-[44px] active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg ${isOrbit ? "-mt-2" : ""}`}
          >
            {badge > 0 && (
              <span
                className="absolute top-0.5 right-1 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1"
                style={{ background: "hsl(var(--hud-danger))", color: "#fff" }}
              >
                {badge > 99 ? "99+" : badge}
              </span>
            )}
            <div
              className={isOrbit ? "w-10 h-10 rounded-full flex items-center justify-center" : ""}
              style={
                isOrbit
                  ? {
                      background: isActive
                        ? "hsl(var(--hud-cyan))"
                        : "hsl(var(--hud-cyan) / 0.15)",
                    }
                  : {}
              }
            >
              <item.icon
                className="w-5 h-5 transition-colors duration-150"
                strokeWidth={isActive ? 2.5 : 1.8}
                style={{
                  color:
                    isOrbit && isActive
                      ? "#fff"
                      : isOrbit
                      ? "hsl(var(--hud-cyan))"
                      : isActive
                      ? "hsl(var(--hud-cyan))"
                      : "hsl(var(--hud-text-dim) / 0.45)",
                }}
              />
            </div>
            <span
              className="text-[10px] transition-colors duration-150"
              style={{
                color: isActive
                  ? "hsl(var(--hud-cyan))"
                  : "hsl(var(--hud-text-dim) / 0.45)",
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {label}
            </span>
            {isActive && !isOrbit && (
              <span
                className="absolute -bottom-0.5 w-4 h-[2px] rounded-full"
                style={{
                  background: "hsl(var(--hud-cyan))",
                  boxShadow: "0 0 6px hsl(var(--hud-cyan) / 0.4)",
                }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

export default memo(OrbitBottomNav);
