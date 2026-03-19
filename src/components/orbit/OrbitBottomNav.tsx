/**
 * OrbitBottomNav — Premium 5-tab navigation.
 * Home · Explore · Orbit (center) · Wallet · Me
 * Ghost entry via Orbit page.
 */
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Compass, MessageCircle, Wallet, User } from "lucide-react";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useI18n } from "@/lib/i18n";

const NAV_ITEMS = [
  { icon: Home, labelKey: "nav.home", path: "/", matchPrefixes: ["/"] as string[], exactMatch: true },
  { icon: Compass, labelKey: "nav.explore", path: "/explore", matchPrefixes: ["/explore", "/search", "/discover", "/listing/", "/shops", "/s/", "/food", "/grocery", "/services-hub", "/ride", "/send", "/travel", "/super-map"], exactMatch: false },
  { icon: MessageCircle, labelKey: "nav.orbit", path: "/dashboard/communication", matchPrefixes: ["/dashboard/communication", "/ghost", "/orbit"], exactMatch: false },
  { icon: Wallet, labelKey: "nav.wallet", path: "/wallet/hub", matchPrefixes: ["/wallet", "/pos", "/my-orders"], exactMatch: false },
  { icon: User, labelKey: "nav.me", path: "/dashboard/settings", matchPrefixes: ["/dashboard/settings", "/dashboard/my-shop", "/dashboard/seller", "/dashboard/driver", "/business", "/property-hub"], exactMatch: false },
] as const;

export default function OrbitBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadMessages, pendingOrders } = useOrbitEngine();
  const { t } = useI18n();

  const getBadge = (labelKey: string) => {
    if (labelKey === "nav.orbit") return unreadMessages;
    if (labelKey === "nav.wallet") return pendingOrders;
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
      {NAV_ITEMS.map(({ icon: Icon, labelKey, path, matchPrefixes, exactMatch }) => {
        const label = t(labelKey) || labelKey.split(".").pop() || "";
        const isActive = exactMatch
          ? location.pathname === path
          : matchPrefixes.some(p => location.pathname.startsWith(p));
        const badge = getBadge(labelKey);
        const isCenter = labelKey === "nav.orbit";

        return (
          <button
            key={labelKey}
            role="tab"
            aria-selected={isActive}
            aria-label={`${label}${badge > 0 ? ` (${badge})` : ""}`}
            onClick={() => navigate(path)}
            className={`relative flex flex-col items-center justify-center gap-0.5 pt-2 pb-1 px-3 min-w-[56px] min-h-[44px] active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg ${isCenter ? "-mt-2" : ""}`}
          >
            {badge > 0 && (
              <span
                className="absolute top-0.5 right-1 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1"
                style={{ background: "hsl(var(--hud-danger))", color: "#fff" }}
              >
                {badge > 99 ? "99+" : badge}
              </span>
            )}
            <div className={isCenter ? "w-10 h-10 rounded-full flex items-center justify-center" : ""} style={isCenter ? { background: isActive ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-cyan) / 0.15)" } : {}}>
              <Icon
                className={`${isCenter ? "w-5 h-5" : "w-5 h-5"} transition-colors duration-150`}
                strokeWidth={isActive ? 2.5 : 1.8}
                style={{ color: isCenter && isActive ? "#fff" : isCenter ? "hsl(var(--hud-cyan))" : isActive ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.45)" }}
              />
            </div>
            <span
              className="text-[10px] transition-colors duration-150"
              style={{
                color: isActive ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.45)",
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {label}
            </span>
            {isActive && !isCenter && (
              <span
                className="absolute -bottom-0.5 w-4 h-[2px] rounded-full"
                style={{ background: "hsl(var(--hud-cyan))", boxShadow: "0 0 6px hsl(var(--hud-cyan) / 0.4)" }}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
