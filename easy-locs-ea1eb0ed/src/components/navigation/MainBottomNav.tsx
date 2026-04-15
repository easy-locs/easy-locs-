import { memo, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { NAV_TABS_CONFIG, HIDE_NAV_PREFIXES } from "@/config/navigation";
import { tc } from "@/lib/i18n-canonical";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { onModuleEnter, onModuleLeave } from "@/engines/core/module-intelligence";
import { prefetchForRoute, prefetchOnInteraction } from "@/lib/smart-prefetch";
import { useDynamicLogo } from "@/hooks/useDynamicLogo";
import { RadarSvg } from "@/components/brand/EasyLocsLogo";

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
  const logoCtx = useDynamicLogo();
  const brandAccent = logoCtx.gradientColors[0];

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
      className="fixed bottom-0 left-0 right-0 z-[var(--z-bottom-nav)] lg:hidden border-t border-border/30 pb-[env(safe-area-inset-bottom,0px)]"
      style={{ backgroundColor: "hsl(var(--card))" }}
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
              className="flex flex-col items-center justify-center flex-1 gap-[2px] relative
                         min-w-0 min-h-[44px] max-w-[72px]
                         transition-colors duration-150
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg
                         active:opacity-70"
            >
              <div className="relative">
                {tab.key === "radar" ? (
                  <RadarSvg
                    size={22}
                    animate={active}
                    gradientColors={active
                      ? logoCtx.gradientColors
                      : ["hsl(var(--muted-foreground) / 0.6)", "hsl(var(--muted-foreground) / 0.4)"]
                    }
                  />
                ) : (
                  <Icon
                    className="w-[22px] h-[22px] transition-colors duration-150"
                    style={active ? { color: brandAccent } : { color: "hsl(var(--muted-foreground) / 0.6)" }}
                    strokeWidth={active ? 2.2 : 1.6}
                  />
                )}
                {isOrbit && orbitUnread > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold leading-none px-1 bg-destructive text-white">
                    {orbitUnread > 99 ? "99+" : orbitUnread}
                  </span>
                )}
              </div>

              <span
                className="text-[10px] leading-none transition-colors duration-150"
                style={active
                  ? { color: brandAccent, fontWeight: 600 }
                  : { color: "hsl(var(--muted-foreground) / 0.6)", fontWeight: 500 }
                }
              >
                {tc(`nav.${tab.key}`)}
              </span>

              {active && (
                <div
                  className="absolute bottom-[6px] w-[5px] h-[5px] rounded-full"
                  style={{
                    background: brandAccent,
                    boxShadow: `0 0 6px ${brandAccent}`,
                    animation: "brand-dot-pulse 2s ease-in-out infinite",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default memo(MainBottomNav);
