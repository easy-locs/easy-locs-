/**
 * OrbitBottomNav — Bottom navigation for Orbit shell.
 * PASS 164: Extracted from OrbitAppShell. i18n-enabled, accessible.
 */
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Search, Store, MessageCircle, User } from "lucide-react";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useI18n } from "@/lib/i18n";

const NAV_ITEMS = [
  { icon: Home, labelKey: "nav.home", path: "/app/orbit", badge: null as string | null },
  { icon: Search, labelKey: "nav.search", path: "/discover", badge: null },
  { icon: Store, labelKey: "nav.shops", path: "/shops", badge: null },
  { icon: MessageCircle, labelKey: "nav.orders", path: "/my-orders", badge: null },
  { icon: User, labelKey: "nav.me", path: "/dashboard/settings", badge: null },
] as const;

export default function OrbitBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadMessages, missedCalls } = useOrbitEngine();
  const { t } = useI18n();

  const getCounter = (badge: string | null) => {
    if (badge === "messages") return unreadMessages;
    if (badge === "calls") return missedCalls;
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
      {NAV_ITEMS.map(({ icon: Icon, labelKey, path, badge }) => {
        const label = t(labelKey) || labelKey.split(".").pop() || "";
        const isActive =
          location.pathname === path ||
          (labelKey === "nav.home" && location.pathname.startsWith("/app")) ||
          (labelKey === "nav.orders" && location.pathname.startsWith("/my-orders")) ||
          (labelKey === "nav.shops" && (location.pathname.startsWith("/shops") || location.pathname === "/dashboard/my-shop")) ||
          (labelKey === "nav.search" && (location.pathname.startsWith("/discover") || location.pathname.startsWith("/search"))) ||
          (labelKey === "nav.me" && location.pathname.startsWith("/dashboard/settings"));
        const counter = getCounter(badge);
        return (
          <button
            key={labelKey}
            role="tab"
            aria-selected={isActive}
            aria-label={`${label}${counter > 0 ? ` (${counter})` : ""}`}
            onClick={() => navigate(path)}
            className="relative flex flex-col items-center justify-center gap-0.5 pt-2 pb-1 px-3 min-w-[56px] min-h-[44px] active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            {counter > 0 && (
              <span
                className="absolute top-0.5 right-1 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1"
                style={{ background: "hsl(var(--hud-danger))", color: "#fff" }}
              >
                {counter > 99 ? "99+" : counter}
              </span>
            )}
            <Icon
              className="w-5 h-5 transition-colors duration-150"
              strokeWidth={isActive ? 2.5 : 1.8}
              style={{
                color: isActive ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.45)",
              }}
            />
            <span
              className="text-[10px] transition-colors duration-150"
              style={{
                color: isActive ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.45)",
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {label}
            </span>
            {isActive && (
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
