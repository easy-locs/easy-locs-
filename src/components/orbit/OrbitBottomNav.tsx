/**
 * OrbitBottomNav — WeChat-style bottom navigation.
 * 4-tab layout: Chats, Discover, Services, Me
 * Chat is the center of the super app.
 */
import { useNavigate, useLocation } from "react-router-dom";
import { MessageCircle, Compass, LayoutGrid, User } from "lucide-react";
import { useOrbitEngine } from "@/stores/orbit-engine";
import { useI18n } from "@/lib/i18n";

const NAV_ITEMS = [
  { icon: MessageCircle, labelKey: "nav.chats", path: "/dashboard/communication", matchPrefixes: ["/dashboard/communication"] },
  { icon: Compass, labelKey: "nav.discover", path: "/discover", matchPrefixes: ["/discover", "/search", "/explore", "/shops"] },
  { icon: LayoutGrid, labelKey: "nav.services", path: "/app/orbit", matchPrefixes: ["/app", "/dashboard/wallet", "/dashboard/my-shop", "/dashboard/seller", "/pos", "/my-orders", "/property-hub"] },
  { icon: User, labelKey: "nav.me", path: "/dashboard/settings", matchPrefixes: ["/dashboard/settings"] },
] as const;

export default function OrbitBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadMessages, pendingOrders } = useOrbitEngine();
  const { t } = useI18n();

  const getBadge = (labelKey: string) => {
    if (labelKey === "nav.chats") return unreadMessages;
    if (labelKey === "nav.services") return pendingOrders;
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
      {NAV_ITEMS.map(({ icon: Icon, labelKey, path, matchPrefixes }) => {
        const label = t(labelKey) || labelKey.split(".").pop() || "";
        const isActive = matchPrefixes.some(p => location.pathname.startsWith(p)) || location.pathname === path;
        const badge = getBadge(labelKey);

        return (
          <button
            key={labelKey}
            role="tab"
            aria-selected={isActive}
            aria-label={`${label}${badge > 0 ? ` (${badge})` : ""}`}
            onClick={() => navigate(path)}
            className="relative flex flex-col items-center justify-center gap-0.5 pt-2 pb-1 px-3 min-w-[56px] min-h-[44px] active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            {badge > 0 && (
              <span
                className="absolute top-0.5 right-1 min-w-[16px] h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1"
                style={{ background: "hsl(var(--hud-danger))", color: "#fff" }}
              >
                {badge > 99 ? "99+" : badge}
              </span>
            )}
            <Icon
              className="w-5 h-5 transition-colors duration-150"
              strokeWidth={isActive ? 2.5 : 1.8}
              style={{ color: isActive ? "hsl(var(--hud-cyan))" : "hsl(var(--hud-text-dim) / 0.45)" }}
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
