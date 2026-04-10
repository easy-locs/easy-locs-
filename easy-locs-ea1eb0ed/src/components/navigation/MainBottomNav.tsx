/**
 * MainBottomNav — THE single bottom navigation for the entire app.
 * 5 tabs: Dashboard | Radar | Orbit | Wallet | Me
 * V2: Enhanced haptic-feel animations, glow effects, smarter prefetch.
 */
import { memo, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
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
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      role="tablist"
      aria-label="Main navigation"
      style={{
        background: "hsl(var(--card) / 0.97)",
        borderTop: "1px solid hsl(var(--border) / 0.15)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -4px 24px hsl(var(--background) / 0.5)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      <div className="flex items-stretch justify-around h-[58px] max-w-md mx-auto">
        {NAV_TABS_CONFIG.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          const isOrbit = tab.key === "orbit";
          return (
            <motion.button
              key={tab.key}
              role="tab"
              aria-selected={active}
              aria-label={tab.label}
              onClick={() => {
                if (!active) navigate(tab.path);
              }}
              onPointerEnter={() => {
                if (!active) prefetchOnInteraction(tab.path);
              }}
              onTouchStart={() => {
                if (!active) prefetchOnInteraction(tab.path);
              }}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex flex-col items-center justify-center flex-1 gap-0.5 relative
                         min-w-[44px] min-h-[44px] max-w-[80px]
                         transition-colors duration-200 ease-out
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            >
              {active && !isOrbit && (
                <motion.div
                  layoutId="main-tab-pill"
                  className="absolute top-0 left-2.5 right-2.5 h-[2.5px] rounded-full"
                  style={{ background: "hsl(38 65% 56%)" }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              {active && !isOrbit && (
                <motion.div
                  layoutId="main-tab-glow"
                  className="absolute top-0 left-1 right-1 h-8 rounded-b-2xl pointer-events-none"
                  style={{
                    background: "radial-gradient(ellipse at top, hsl(38 65% 56% / 0.1) 0%, transparent 70%)",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              {isOrbit ? (
                <motion.div
                  className="w-11 h-11 rounded-full flex items-center justify-center -mt-4 relative shadow-lg"
                  animate={{
                    background: active ? "hsl(38 65% 56%)" : "hsl(38 65% 56% / 0.12)",
                    scale: active ? 1.05 : 0.95,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  style={{ boxShadow: active ? "0 4px 16px hsl(38 65% 56% / 0.3)" : "none" }}
                >
                  <Icon
                    className="w-5 h-5"
                    strokeWidth={active ? 2.4 : 1.8}
                    style={{ color: active ? "hsl(220 40% 18%)" : "hsl(38 65% 56%)" }}
                  />
                  {orbitUnread > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold leading-none px-1"
                      style={{
                        background: "hsl(0 72% 51%)",
                        color: "#fff",
                        border: "2px solid hsl(var(--card))",
                      }}
                    >
                      {orbitUnread > 99 ? "99+" : orbitUnread}
                    </motion.span>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  animate={{ y: active ? -2 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Icon
                    className="w-[22px] h-[22px] transition-colors duration-200"
                    strokeWidth={active ? 2.4 : 1.8}
                    style={{
                      color: active ? "hsl(38 65% 56%)" : "hsl(var(--muted-foreground) / 0.45)",
                    }}
                  />
                </motion.div>
              )}
              <span
                className="text-[10px] leading-tight transition-all duration-200"
                style={{
                  color: active ? "hsl(38 65% 56%)" : "hsl(var(--muted-foreground) / 0.45)",
                  fontWeight: active ? 700 : 500,
                  letterSpacing: active ? "0.01em" : "0",
                }}
              >
                {tc(`nav.${tab.key}`)}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}

export default memo(MainBottomNav);
