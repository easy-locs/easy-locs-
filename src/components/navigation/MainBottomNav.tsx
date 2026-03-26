/**
 * MainBottomNav — THE single bottom navigation for the entire app.
 * 5 tabs: Dashboard | Radar | Orbit | Wallet | Me
 * Sources config from src/config/navigation.ts.
 */
import { memo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { NAV_TABS_CONFIG, HIDE_NAV_PREFIXES } from "@/config/navigation";
import { tc } from "@/lib/i18n-canonical";

function MainBottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();

  if (!user) return null;
  if (HIDE_NAV_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      role="tablist"
      aria-label="Main navigation"
      style={{
        background: "hsl(var(--card))",
        borderTop: "1px solid hsl(var(--border) / 0.3)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -2px 16px hsl(var(--background) / 0.4)",
      }}
    >
      <div className="flex items-stretch justify-around h-14 max-w-md mx-auto">
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
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center justify-center flex-1 gap-0.5 relative
                         min-w-[44px] min-h-[44px] max-w-[80px]
                         active:scale-[0.92] transition-all duration-150 ease-out
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
            >
              {active && !isOrbit && (
                <motion.div
                  layoutId="main-tab-pill"
                  className="absolute top-0 left-3 right-3 h-[2px] rounded-full"
                  style={{ background: "hsl(var(--primary))" }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              {isOrbit ? (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center -mt-3"
                  style={{
                    background: active ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.12)",
                  }}
                >
                  <Icon
                    className="w-5 h-5"
                    strokeWidth={active ? 2.4 : 1.8}
                    style={{ color: active ? "hsl(var(--primary-foreground))" : "hsl(var(--primary))" }}
                  />
                </div>
              ) : (
                <Icon
                  className="w-[21px] h-[21px] transition-colors duration-150"
                  strokeWidth={active ? 2.4 : 1.8}
                  style={{
                    color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.5)",
                  }}
                />
              )}
              <span
                className="text-[10px] leading-tight transition-colors duration-150"
                style={{
                  color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.5)",
                  fontWeight: active ? 700 : 500,
                }}
              >
                {tc(`nav.${tab.key === "profile" ? "me" : tab.key}`)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default memo(MainBottomNav);
