import { memo, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NAV_TABS_CONFIG, HIDE_NAV_PREFIXES } from "@/config/navigation";
import { tc } from "@/lib/i18n-canonical";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { onModuleEnter, onModuleLeave } from "@/engines/core/module-intelligence";
import { prefetchForRoute, prefetchOnInteraction } from "@/lib/smart-prefetch";

type ModuleKey = "dashboard" | "radar" | "orbit" | "wallet" | "me";
const TAB_MODULE_MAP: Record<string, ModuleKey> = {
  dashboard: "dashboard",
  radar: "radar",
  orbit: "orbit",
  wallet: "wallet",
  me: "me",
};

function MainBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { unreadCount: orbitUnread } = useUnreadMessages();
  const prevModule = useRef<ModuleKey | null>(null);

  useEffect(() => {
    const currentTab = NAV_TABS_CONFIG.find(t => t.match(pathname));
    const mod = currentTab ? TAB_MODULE_MAP[currentTab.key] : null;

    if (mod && mod !== prevModule.current) {
      if (prevModule.current) onModuleLeave(prevModule.current);
      onModuleEnter(mod);
      prevModule.current = mod;
      prefetchForRoute(pathname);
    }
  }, [pathname]);

  if (!user) return null;
  if (HIDE_NAV_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card/95 backdrop-blur-2xl backdrop-saturate-150 border-t border-border/5 pb-[env(safe-area-inset-bottom,0px)] [contain:layout_style]"
      style={{ boxShadow: "0 -8px 32px hsl(0 0% 0% / 0.2), 0 -2px 8px hsl(0 0% 0% / 0.15)" }}
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch justify-around h-[56px] max-w-md mx-auto">
        {NAV_TABS_CONFIG.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          const isOrbit = tab.key === "orbit";
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active}
              aria-label={tab.label}
              onClick={() => { if (!active) navigate(tab.path); }}
              onPointerEnter={() => { if (!active) prefetchOnInteraction(tab.path); }}
              onTouchStart={() => { if (!active) prefetchOnInteraction(tab.path); }}
              className="flex flex-col items-center justify-center flex-1 gap-0.5 relative
                         min-w-0 min-h-[44px] max-w-[72px]
                         transition-colors duration-150
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg
                         active:scale-95"
            >
              {active && (
                <div
                  className="absolute top-0 left-3 right-3 h-[2px] rounded-full bg-accent"
                />
              )}

              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-colors duration-150 ${active ? "text-accent" : "text-muted-foreground/50"}`}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {isOrbit && orbitUnread > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold leading-none px-1 bg-destructive text-white border-2 border-card">
                    {orbitUnread > 99 ? "99+" : orbitUnread}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] leading-tight w-full text-center transition-colors duration-150 ${active ? "text-accent font-semibold" : "text-muted-foreground/50 font-medium"}`}
              >
                {tc(`nav.${tab.key}`)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default memo(MainBottomNav);
